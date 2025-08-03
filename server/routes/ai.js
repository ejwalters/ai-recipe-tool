const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

// Setup Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Setup OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /ai/chat
router.post('/chat', async (req, res) => {
    const { user_id, chat_id, message } = req.body;

    if (!user_id || !message) {
        return res.status(400).json({ error: 'Missing user_id or message' });
    }

    let chatId = chat_id;

    // 1. If no chat_id, create a new chat
    if (!chatId) {
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert([{ user_id }])
            .select()
            .single();
        if (chatError) return res.status(500).json({ error: chatError.message });
        chatId = chat.id;
    }

    // 1.5. Fetch user's dietary preferences
    let dietaryPreferences = '';
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('dietary_preferences')
            .eq('id', user_id)
            .single();
        if (!profileError && profile && profile.dietary_preferences) {
            dietaryPreferences = profile.dietary_preferences;
        }
    } catch (e) {
        // Ignore, fallback to empty
    }

    // 2. Insert user message
    const { error: userMsgError } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, user_id, role: 'user', content: message }]);
    if (userMsgError) return res.status(500).json({ error: userMsgError.message });

    // 3. Fetch previous messages for this chat
    const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('role,content')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    // 4. Call OpenAI API
    try {
        // Add a system prompt to instruct the AI to return recipe details in a structured JSON format if the user is asking about a recipe
        const systemPrompt = {
            role: 'system',
            content: `
You are an AI chef assistant. The user has the following dietary preferences and restrictions: ${dietaryPreferences || 'None provided'}.
When the user asks for a recipe, ALWAYS try to provide the best possible recipe that respects their dietary preferences and allergies. If the requested dish is not possible as-is, suggest creative substitutions or alternatives that fit their restrictions. Only decline if there is absolutely no safe or reasonable way to adapt the request, and in that case, suggest a similar recipe that does fit their needs.

Respond with a JSON object containing the following fields:
- name (string)
- time (string, e.g. "30 min")
- tags (array of strings, e.g. ["Kid Friendly", "Vegan"])
- ingredients (array of strings, e.g. ["1 cup flour", "2 eggs"])
- steps (array of strings, e.g. ["Mix the flour and eggs.", "Bake for 20 minutes."])
- is_recipe (boolean, true if this is a recipe, false otherwise)

IMPORTANT:
- For the "ingredients" and "steps" fields, ALWAYS return a JSON array of strings. Each string should be a single ingredient or a single step. DO NOT join multiple items in a single string using commas, pipes, or any other delimiter. DO NOT return a single string with embedded newlines or delimiters.
- Example: "ingredients": ["1 cup flour", "2 eggs"], NOT "ingredients": "1 cup flour, 2 eggs" or "1 cup flour||2 eggs" or "1 cup flour\\n2 eggs".
- Example: "steps": ["Mix the flour and eggs.", "Bake for 20 minutes."], NOT "steps": "Mix the flour and eggs. Bake for 20 minutes." or "Mix the flour and eggs.||Bake for 20 minutes."
- Do not include any text outside the JSON object if returning a recipe.

For non-recipe responses, always return a JSON object with "is_recipe": false and a helpful "text" field (e.g. "Sorry, I don't have a recipe for that, but I can help with something else!"). Never return just {"is_recipe": false}—always include a "text" field with a helpful message.
`
        };
        const openaiMessages = [systemPrompt, ...messages.map(m => ({ role: m.role, content: m.content }))];
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: openaiMessages,
        });
        const aiResponse = completion.choices[0].message.content;

        // Debug: Log the raw AI response
        console.log('Raw AI Response:', aiResponse);

        // Try to parse and log the recipe object if possible
        try {
            const parsed = JSON.parse(aiResponse);
            if (parsed && parsed.is_recipe) {
                console.log('Parsed Recipe Object:', parsed);
            }
        } catch (e) {
            console.log('AI response is not valid JSON:', e.message);
        }

        // 5. Store AI response
        let normalizedContent = aiResponse;
        try {
            const parsed = JSON.parse(aiResponse);
            if (parsed && parsed.is_recipe) {
                function toArray(val) {
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string') {
                        if (val.includes('||')) return val.split('||').map(s => s.trim());
                        if (val.includes('\\n')) return val.split('\\n').map(s => s.trim());
                        if (val.includes('\n')) return val.split('\n').map(s => s.trim());
                        if (val.split(',').length > 1) return val.split(',').map(s => s.trim());
                        return [val];
                    }
                    return [];
                }
                parsed.tags = toArray(parsed.tags);
                parsed.ingredients = toArray(parsed.ingredients);
                parsed.steps = toArray(parsed.steps);
                normalizedContent = JSON.stringify(parsed, null, 2);
            }
        } catch (e) {
            // Not valid JSON, leave as is
        }

        const { data: insertedMessage, error: insertError } = await supabase
            .from('messages')
            .insert([{ chat_id: chatId, user_id, role: 'assistant', content: normalizedContent }])
            .select()
            .single();

        if (insertError) return res.status(500).json({ error: insertError.message });

        // 6. Fetch all messages for this chat
        const { data: allMessages, error: fetchAllError } = await supabase
            .from('messages')
            .select('role,content')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (!fetchAllError && allMessages) {
            // 7. Generate summary
            const summary = await generateChatSummary(allMessages);

            // 8. Update the chats table with the new summary
            await supabase
                .from('chats')
                .update({ summary })
                .eq('id', chatId);
        }
        res.json({ chat_id: chatId, ai_response: aiResponse, message_id: insertedMessage.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /ai/chats?user_id=...&q=...
router.get('/chats', async (req, res) => {
    const { user_id, q } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    let query = supabase
        .from('chats')
        .select('*')
        .eq('user_id', user_id);

    // Add search filter if query parameter is provided
    if (q && q.trim()) {
        query = query.ilike('summary', `%${q.trim()}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /ai/messages?chat_id=...
router.get('/messages', async (req, res) => {
    const { chat_id } = req.query;
    if (!chat_id) return res.status(400).json({ error: 'Missing chat_id' });

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    
    console.log('Messages endpoint returning:', data);
    res.json(data);
});

// POST /ai/transform-recipe
router.post('/transform-recipe', async (req, res) => {
    const { recipe, tags, prompt } = req.body;
    if (!recipe || (!tags && !prompt)) {
        return res.status(400).json({ error: 'Missing recipe or edit instructions' });
    }

    // Compose the system prompt for OpenAI
    const systemPrompt = {
        role: 'system',
        content: `
You are an expert AI chef. Given a recipe and a user request (tags and/or prompt), suggest ingredient swaps and step changes to meet the user's needs.

Respond ONLY with a JSON object with these fields:
- swaps: array of { original: string, new: string, amount_change: string (optional) }
- summary: string (a short summary of the changes)
- newRecipe: object with the following fields:
  - title: string
  - time: string
  - tags: array of strings
  - ingredients: array of strings (the full new ingredient list)
  - steps: array of strings (the full new step list)

Do not include any text outside the JSON object. If no changes are needed, return an empty swaps array and the original recipe as newRecipe.

Example:
{
  "swaps": [
    { "original": "1 cup milk", "new": "1 cup oat milk", "amount_change": null }
  ],
  "summary": "Made the recipe vegan by swapping milk.",
  "newRecipe": {
    "title": "Vegan Pancakes",
    "time": "30 min",
    "tags": ["Vegan", "Breakfast"],
    "ingredients": ["1 cup oat milk", "2 cups flour"],
    "steps": ["Mix oat milk and flour.", "Cook on skillet."]
  }
}
`
    };

    // Compose the user message
    const userMessage = {
        role: 'user',
        content: `Here is the recipe:\n${JSON.stringify(recipe, null, 2)}\n\nTags: ${tags ? tags.join(', ') : ''}\nPrompt: ${prompt || ''}`
    };

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [systemPrompt, userMessage],
            temperature: 0.7,
        });
        const aiResponse = completion.choices[0].message.content;
        // Try to parse the response as JSON
        let result;
        try {
            result = JSON.parse(aiResponse);
        } catch (e) {
            return res.status(500).json({ error: 'AI response was not valid JSON', raw: aiResponse });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function generateChatSummary(messages) {
    const prompt = `
Summarize the following conversation in a few keywords for a chat history list. Focus on the main topic, recipe, or user request. If the chat is mostly casual or contains no recipe, summarize the general theme.

${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
    `;
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: prompt }
        ],
        max_tokens: 60,
        temperature: 0.7,
    });
    return completion.choices[0].message.content.trim();
}

module.exports = router;
