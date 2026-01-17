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

IMPORTANT - CONVERSATION CONTEXT:
- You have access to the full conversation history above. USE IT to understand what the user is referring to in follow-up questions.
- When a user asks a follow-up question (e.g., "What temperature?", "Can I substitute X?", "How long?"), refer back to the recipes or topics discussed earlier in the conversation.
- If the user asks about a recipe you previously provided, reference that specific recipe in your response.
- Maintain awareness of the conversation flow - don't treat each message as isolated. Build upon previous exchanges.
- For follow-up questions about previously discussed recipes, you can answer conversationally (is_recipe: false) unless they're asking for a new recipe.

RECIPE VARIATIONS AND MODIFICATIONS:
- When a user asks for "something more elaborate", "something with X", "a variation", "something different", or similar phrases AFTER you've just provided a recipe, they likely want a MODIFIED VERSION of that recipe, not a completely different recipe.
- If the user says things like "something more elaborate with peanut butter" after you provided a rice pudding recipe, create a VARIATION of the rice pudding that incorporates peanut butter and is more elaborate, NOT a completely different recipe like banana bread.
- Only provide completely new recipes if the user explicitly asks for a different dish or if their request cannot be reasonably adapted from the previous recipe.
- When modifying a previous recipe, maintain the core concept but adapt it according to the user's request (e.g., add ingredients, make it more elaborate, change flavors).
- In your intro_text, acknowledge that you're providing a variation: "Here's a more elaborate version of the rice pudding with peanut butter:" rather than treating it as a brand new recipe.

WHEN PROVIDING RECIPES:
- If the user asks for multiple options (e.g., "quick dinner ideas", "dessert recipes", "healthy options"), return 2-3 recipe suggestions.
- If the user asks for a specific recipe or ingredient-based recipe, return 1-2 similar variations.
- For general recipe requests, provide 2-3 diverse options when appropriate.

Respond with a JSON object using ONE of these formats:

1. MULTIPLE RECIPES (when user asks for options/ideas):
{
  "is_recipe": true,
  "recipes": [
    {
      "name": "Recipe 1 name",
      "time": "30 min",
      "tags": ["Tag1", "Tag2"],
      "ingredients": ["ingredient 1", "ingredient 2"],
      "steps": ["step 1", "step 2"]
    },
    {
      "name": "Recipe 2 name",
      "time": "25 min",
      "tags": ["Tag1"],
      "ingredients": ["ingredient 1", "ingredient 2"],
      "steps": ["step 1", "step 2"]
    }
  ],
  "intro_text": "Here are some great options:"
}

2. SINGLE RECIPE (when user asks for a specific recipe):
{
  "is_recipe": true,
  "recipes": [
    {
      "name": "Recipe name",
      "time": "30 min",
      "tags": ["Tag1", "Tag2"],
      "ingredients": ["ingredient 1", "ingredient 2"],
      "steps": ["step 1", "step 2"]
    }
  ],
  "intro_text": "Here's a great recipe for you:"
}

3. CONVERSATIONAL RESPONSE (not a recipe request):
{
  "is_recipe": false,
  "text": "Your helpful response here. You can answer questions, provide cooking advice, or help with ingredient substitutions."
}

IMPORTANT:
- The "recipes" array should contain 1-3 recipe objects.
- For "ingredients" and "steps" fields in each recipe, ALWAYS return a JSON array of strings. Each string should be a single ingredient or step.
- Example: "ingredients": ["1 cup flour", "2 eggs"], NOT "ingredients": "1 cup flour, 2 eggs"
- Example: "steps": ["Mix the flour and eggs.", "Bake for 20 minutes."], NOT "steps": "Mix the flour and eggs. Bake for 20 minutes."
- Always include an "intro_text" field when providing recipes to give context.
- For non-recipe responses, always include a helpful "text" field with your response.
- Users can ask follow-up questions about the recipes - maintain conversation context and be helpful.
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
                if (parsed.recipes) {
                    console.log(`Found ${parsed.recipes.length} recipe(s)`);
                }
            }
        } catch (e) {
            console.log('AI response is not valid JSON:', e.message);
        }

        // 5. Store AI response - normalize recipe data
        let normalizedContent = aiResponse;
        try {
            const parsed = JSON.parse(aiResponse);
            if (parsed && parsed.is_recipe && parsed.recipes) {
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
                
                // Normalize each recipe in the recipes array
                parsed.recipes = parsed.recipes.map(recipe => ({
                    ...recipe,
                    tags: toArray(recipe.tags),
                    ingredients: toArray(recipe.ingredients),
                    steps: toArray(recipe.steps)
                }));
                
                normalizedContent = JSON.stringify(parsed, null, 2);
            } else if (parsed && parsed.is_recipe && parsed.name) {
                // Legacy single recipe format - convert to recipes array
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
                
                const normalizedRecipe = {
                    is_recipe: true,
                    recipes: [{
                        name: parsed.name,
                        time: parsed.time,
                        tags: toArray(parsed.tags),
                        ingredients: toArray(parsed.ingredients),
                        steps: toArray(parsed.steps)
                    }],
                    intro_text: parsed.intro_text || "Here's a great recipe for you:"
                };
                
                normalizedContent = JSON.stringify(normalizedRecipe, null, 2);
            }
        } catch (e) {
            // Not valid JSON, leave as is
            console.log('Error normalizing content:', e.message);
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
            // 7. Extract recipes from messages
            const recipes = [];
            allMessages.forEach(m => {
                try {
                    const content = m.content;
                    if (typeof content === 'string') {
                        const parsed = JSON.parse(content);
                        if (parsed && parsed.is_recipe && parsed.recipes && Array.isArray(parsed.recipes)) {
                            parsed.recipes.forEach((recipe) => {
                                if (recipe.name) {
                                    recipes.push({
                                        name: recipe.name,
                                        time: recipe.time || '',
                                        tags: Array.isArray(recipe.tags) ? recipe.tags : []
                                    });
                                }
                            });
                        }
                    }
                } catch (e) {
                    // Not JSON, skip
                }
            });

            // 8. Generate summary (only if no recipes, or as fallback)
            let summary = '';
            if (recipes.length === 0) {
                summary = await generateChatSummary(allMessages);
            } else {
                // Create a simple title from first user message or recipe count
                const firstUserMessage = allMessages.find(m => m.role === 'user');
                const firstMessageText = firstUserMessage ? firstUserMessage.content.substring(0, 30) : '';
                const title = firstMessageText || `${recipes.length} Recipe${recipes.length > 1 ? 's' : ''}`;
                summary = `${title}|${recipes.length} recipe${recipes.length > 1 ? 's' : ''} generated`;
            }

            // 9. Update the chats table with summary and recipes
            await supabase
                .from('chats')
                .update({ 
                    summary,
                    recipes: recipes.length > 0 ? JSON.stringify(recipes) : null
                })
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
    // Extract user's first message to understand the initial request
    const firstUserMessage = messages.find(m => m.role === 'user');
    const firstMessageText = firstUserMessage ? firstUserMessage.content.substring(0, 100) : '';
    
    // Count recipe mentions
    const recipeCount = messages.filter(m => {
        try {
            const content = m.content;
            if (typeof content === 'string') {
                const parsed = JSON.parse(content);
                return parsed && parsed.is_recipe && parsed.recipes;
            }
        } catch (e) {
            // Not JSON, skip
        }
        return false;
    }).length;

    // Extract recipe names from messages for context
    const recipeNames = [];
    messages.forEach(m => {
        try {
            const content = m.content;
            if (typeof content === 'string') {
                const parsed = JSON.parse(content);
                if (parsed && parsed.is_recipe && parsed.recipes && Array.isArray(parsed.recipes)) {
                    parsed.recipes.forEach((recipe) => {
                        if (recipe.name && !recipeNames.includes(recipe.name)) {
                            recipeNames.push(recipe.name);
                        }
                    });
                }
            }
        } catch (e) {
            // Not JSON, skip
        }
    });
    
    const recipeContext = recipeNames.length > 0 
        ? `Recipes discussed: ${recipeNames.slice(0, 3).join(', ')}${recipeNames.length > 3 ? '...' : ''}`
        : 'No specific recipes provided';

    const prompt = `
You are creating a clear, scannable summary for a chat history card. The user had a conversation with an AI chef assistant.

FIRST USER MESSAGE: "${firstMessageText}"
${recipeContext}
CONVERSATION LENGTH: ${messages.length} messages
RECIPE COUNT: ${recipeCount > 0 ? `${recipeCount} recipe${recipeCount > 1 ? 's' : ''}` : '0 recipes'}

Create a summary with TWO parts separated by a pipe character (|):

1. TITLE (max 25 characters, must be complete - no truncation allowed):
   - Create a short, descriptive title that captures the ESSENCE and FULL CONTEXT of the conversation
   - Must fit in 25 characters without ellipses
   - Use abbreviations if needed (e.g., "Healthy Grilled Recipes" not "Healthy recipes, Grilled")
   - Be specific about the cuisine/cooking method (e.g., "Grilled Fish & Chicken", "Vegan Breakfast Ideas")
   - If it's about variations, include that (e.g., "Rice Pudding Variants")
   - Examples: "Quick Dinner Ideas", "Grilled Fish & Chicken", "Vegan Breakfast", "Pasta Cooking Tips"

2. DESCRIPTION (max 55 characters, must be complete):
   - Provide high-level context about what was discussed
   - DO NOT list individual recipe names (avoid: "Salmon with Quinoa, Veggie Stir-fry...")
   - Instead, summarize the theme/category (e.g., "3 healthy grilled protein recipes", "Vegan breakfast options with oatmeal")
   - If multiple recipes, mention count and category
   - Be concise and scannable

CRITICAL RULES:
- TITLE must be 25 characters or less - NO exceptions, NO ellipses
- DESCRIPTION must be 55 characters or less - NO exceptions, NO ellipses
- DO NOT list recipe names in description (e.g., avoid "Salmon with Quinoa, Veggie Stir-fry, Chicken...")
- Instead, summarize the category/theme (e.g., "3 healthy grilled protein recipes")
- Make it easy to understand what the chat was about at a glance
- Use abbreviations in title if needed to fit (e.g., "&" instead of "and")

Format: TITLE|DESCRIPTION

Examples:
- "Quick Dinner Ideas|3 fast pasta recipes under 30 min"
- "Grilled Fish & Chicken|Healthy protein recipes with quinoa"
- "Vegan Breakfast|Oatmeal and smoothie bowl options"
- "Rice Pudding Variants|Elaborate peanut butter versions"
- "Pasta Cooking Tips|Techniques and ingredient swaps"
`;
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.5, // Lower temperature for more consistent summaries
        });
        
        const result = completion.choices[0].message.content.trim();
        
        // Validate format: should contain a pipe separator
        if (result.includes('|')) {
            return result;
        } else {
            // Fallback: if format is wrong, try to create a reasonable summary
            // Use first user message or create a generic title
            const fallbackTitle = firstMessageText.length > 0 
                ? firstMessageText.substring(0, 30).replace(/[^\w\s]/g, '').trim()
                : 'Chat Conversation';
            const fallbackDesc = recipeCount > 0 
                ? `${recipeCount} recipe${recipeCount > 1 ? 's' : ''} discussed`
                : 'Conversation with AI Chef';
            return `${fallbackTitle}|${fallbackDesc}`;
        }
    } catch (err) {
        console.error('Error generating chat summary:', err);
        // Return a basic fallback summary
        const fallbackTitle = firstMessageText.length > 0 
            ? firstMessageText.substring(0, 30).replace(/[^\w\s]/g, '').trim() || 'Chat Conversation'
            : 'Chat Conversation';
        const fallbackDesc = recipeCount > 0 
            ? `${recipeCount} recipe${recipeCount > 1 ? 's' : ''} discussed`
            : 'Conversation with AI Chef';
        return `${fallbackTitle}|${fallbackDesc}`;
    }
}

module.exports = router;
