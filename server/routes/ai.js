const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const multer = require('multer');

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

// POST /ai/extract-recipe
router.post('/extract-recipe', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Convert the image buffer to base64
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Call OpenAI Vision API to extract recipe details
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract recipe details from this image. Return ONLY a JSON object with the following structure:
{
  "title": "Recipe name",
  "cookTime": "Estimated cooking time (e.g., '30 min')",
  "servings": "Number of servings (e.g., '4')",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "steps": ["step 1", "step 2", ...],
  "tags": ["tag1", "tag2", ...]
}

If you cannot extract a recipe from the image, return:
{
  "error": "No recipe found in image"
}

IMPORTANT: If any field cannot be determined from the image, use an empty string ("") instead of "Not specified" or similar text. This allows the form to show placeholder text.

Be as accurate as possible with the extraction. For ingredients and steps, split them into individual array items.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
        });

        const aiResponse = completion.choices[0].message.content;
        
        console.log('Raw AI Response:', aiResponse);
        
        // Try to parse the JSON response
        let recipeData;
        try {
            // First, try to extract JSON from the response if it contains extra text
            let jsonString = aiResponse.trim();
            
            // If the response starts with ```json and ends with ```, extract the content
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            recipeData = JSON.parse(jsonString);
            console.log('Parsed Recipe Data:', recipeData);
            
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Raw response that failed to parse:', aiResponse);
            
            // Try to extract JSON using regex as fallback
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    recipeData = JSON.parse(jsonMatch[0]);
                    console.log('Extracted JSON using regex:', recipeData);
                } catch (regexParseError) {
                    console.error('Regex extraction also failed:', regexParseError);
                    return res.status(500).json({ 
                        error: 'Failed to parse recipe data from image',
                        rawResponse: aiResponse.substring(0, 500) // Include first 500 chars for debugging
                    });
                }
            } else {
                return res.status(500).json({ 
                    error: 'No valid JSON found in AI response',
                    rawResponse: aiResponse.substring(0, 500)
                });
            }
        }
        
        if (recipeData.error) {
            return res.status(400).json({ error: recipeData.error });
        }

        // Validate and clean the data
        const cleanedData = {
            title: recipeData.title || '',
            cookTime: recipeData.cookTime || '',
            servings: recipeData.servings || '',
            ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients.filter(i => i.trim()) : [],
            steps: Array.isArray(recipeData.steps) ? recipeData.steps.filter(s => s.trim()) : [],
            tags: Array.isArray(recipeData.tags) ? recipeData.tags.filter(t => t.trim()) : []
        };

        console.log('Final cleaned data:', cleanedData);
        res.json(cleanedData);

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

// POST /ai/modify-recipe
router.post('/modify-recipe', async (req, res) => {
    const { recipe, userPrompt, user_id } = req.body;

    if (!recipe || !userPrompt || !user_id) {
        return res.status(400).json({ error: 'Missing recipe, userPrompt, or user_id' });
    }

    try {
        // Fetch user's dietary preferences
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

        const systemPrompt = {
            role: 'system',
            content: `
You are an AI chef assistant that modifies recipes based on user requests. The user has the following dietary preferences and restrictions: ${dietaryPreferences || 'None provided'}.

You will receive a recipe and a user prompt requesting modifications. Your job is to:
1. Understand the user's request
2. Modify the recipe accordingly while maintaining its core essence
3. Ensure the modifications respect any dietary restrictions
4. Return the modified recipe in the same JSON format
5. Provide SPECIFIC, DETAILED descriptions of what was changed with exact before/after values

IMPORTANT RULES:
- Always maintain the recipe's core identity and flavor profile
- If the user wants to make it healthier, suggest ingredient substitutions or cooking method changes
- If the user wants to change serving size, adjust all ingredient quantities proportionally
- If the user wants to change cooking time, adjust steps accordingly
- If the user wants to add/remove ingredients, ensure the recipe still works
- For dietary restrictions, suggest appropriate substitutions
- Always return a complete, functional recipe

CRITICAL: For the modifications field, provide SPECIFIC details like:
- "Reduced olive oil from 3 tbsp to 1 tbsp for lower fat content"
- "Increased servings from 4 to 6, adjusted all ingredients proportionally"
- "Substituted 1 lb ground beef with 1 lb plant-based meat alternative"
- "Added 1 cup diced mushrooms and 2 tbsp soy sauce for umami flavor"
- "Reduced salt from 1 tsp to 1/2 tsp for lower sodium"
- "Changed cooking time from 30 min to 45 min due to additional vegetables"

Return ONLY a JSON object with these fields:
- title (string)
- time (string, e.g. "30 min")
- servings (string, e.g. "4 servings")
- ingredients (array of strings)
- steps (array of strings)
- tags (array of strings)
- modifications (string - SPECIFIC details with exact before/after values, e.g. "Reduced olive oil from 3 tbsp to 1 tbsp, increased servings from 4 to 6, added 1 cup mushrooms")

IMPORTANT: For ingredients and steps, return arrays of strings. Each string should be a single ingredient or step.
`
        };

        const userMessage = {
            role: 'user',
            content: `
Original Recipe:
Title: ${recipe.title}
Time: ${recipe.time}
Servings: ${recipe.servings}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Steps: ${JSON.stringify(recipe.steps)}
Tags: ${JSON.stringify(recipe.tags)}

User Request: ${userPrompt}

Please modify this recipe according to the user's request and return the modified version.
`
        };

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [systemPrompt, userMessage],
            max_tokens: 1500,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;
        console.log('Raw AI Modification Response:', aiResponse);

        // Parse the AI response
        let modifiedRecipe;
        try {
            let jsonString = aiResponse.trim();
            
            // Remove markdown code blocks if present
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            modifiedRecipe = JSON.parse(jsonString);
            console.log('Parsed Modified Recipe:', modifiedRecipe);
            
        } catch (parseError) {
            console.error('Error parsing AI modification response:', parseError);
            console.error('Raw response that failed to parse:', aiResponse);
            
            // Try to extract JSON using regex as fallback
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    modifiedRecipe = JSON.parse(jsonMatch[0]);
                    console.log('Extracted JSON using regex:', modifiedRecipe);
                } catch (regexParseError) {
                    console.error('Regex extraction also failed:', regexParseError);
                    return res.status(500).json({ 
                        error: 'Failed to parse modified recipe from AI response',
                        rawResponse: aiResponse.substring(0, 500)
                    });
                }
            } else {
                return res.status(500).json({ 
                    error: 'No valid JSON found in AI response',
                    rawResponse: aiResponse.substring(0, 500)
                });
            }
        }

        // Validate and clean the modified recipe
        const cleanedRecipe = {
            title: modifiedRecipe.title || recipe.title,
            time: modifiedRecipe.time || recipe.time,
            servings: modifiedRecipe.servings || recipe.servings,
            ingredients: Array.isArray(modifiedRecipe.ingredients) ? modifiedRecipe.ingredients.filter(i => i.trim()) : recipe.ingredients,
            steps: Array.isArray(modifiedRecipe.steps) ? modifiedRecipe.steps.filter(s => s.trim()) : recipe.steps,
            tags: Array.isArray(modifiedRecipe.tags) ? modifiedRecipe.tags.filter(t => t.trim()) : recipe.tags,
            modifications: modifiedRecipe.modifications || 'Recipe modified based on user request'
        };

        console.log('Final cleaned modified recipe:', cleanedRecipe);
        res.json(cleanedRecipe);

    } catch (error) {
        console.error('Error modifying recipe:', error);
        res.status(500).json({ error: 'Failed to modify recipe' });
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
