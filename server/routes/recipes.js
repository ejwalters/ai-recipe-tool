const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { getRecipeIconConfig } = require('../utils/recipeIcons');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// POST /recipes/add
router.post('/add', async (req, res) => {
    const { user_id, title, time, tags, ingredients, steps } = req.body;
    if (!user_id || !title || !ingredients || !steps) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Compute icon configuration based on title and tags
    const iconConfig = getRecipeIconConfig(title, tags || []);
    
    const { data, error } = await supabase
        .from('recipes')
        .insert([{ 
            user_id, 
            title, 
            time, 
            tags, 
            ingredients, 
            steps,
            ...iconConfig
        }])
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PUT /recipes/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id, title, time, tags, ingredients, steps } = req.body;
    
    if (!user_id || !title || !ingredients || !steps) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // First check if the recipe exists and belongs to the user
    const { data: existingRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select('user_id')
        .eq('id', id)
        .single();

    if (fetchError) {
        return res.status(404).json({ error: 'Recipe not found' });
    }

    if (existingRecipe.user_id !== user_id) {
        return res.status(403).json({ error: 'You can only edit your own recipes' });
    }

    // Compute icon configuration based on updated title and tags
    const iconConfig = getRecipeIconConfig(title, tags || []);
    
    // Update the recipe (including icon config)
    const { data, error } = await supabase
        .from('recipes')
        .update({ 
            title, 
            time, 
            tags, 
            ingredients, 
            steps,
            ...iconConfig
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /recipes/list
router.get('/list', async (req, res) => {
    let { limit, q, user_id, filter_by_user } = req.query;
    limit = Math.min(parseInt(limit) || 20, 100);
    let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    // If filter_by_user is true, only return recipes created by this user
    if (filter_by_user === 'true' && user_id) {
        query = query.eq('user_id', user_id);
    }
    
    if (q) {
        // Search both title and ingredients
        // Since ingredients is stored as a JSON array, we need to do separate searches
        // and combine results (more reliable than .or() with JSON casting)
        const searchPattern = `%${q}%`;
        const searchLower = q.toLowerCase();
        
        // Build base query for searching
        let titleQuery = supabase
            .from('recipes')
            .select('id')
            .ilike('title', searchPattern)
            .limit(200);
        if (filter_by_user === 'true' && user_id) {
            titleQuery = titleQuery.eq('user_id', user_id);
        }
        
        // Get all recipes to search ingredients (need to fetch ingredients field)
        let ingredientsQuery = supabase
            .from('recipes')
            .select('id, ingredients')
            .limit(200);
        if (filter_by_user === 'true' && user_id) {
            ingredientsQuery = ingredientsQuery.eq('user_id', user_id);
        }
        
        const [titleResults, allRecipes] = await Promise.all([
            titleQuery,
            ingredientsQuery,
        ]);
        
        // Collect matching IDs
        let matchingIds = new Set();
        
        // Add title matches
        if (!titleResults.error && titleResults.data) {
            titleResults.data.forEach(r => matchingIds.add(r.id));
        }
        
        // Check ingredients in JavaScript
        if (!allRecipes.error && allRecipes.data) {
            allRecipes.data.forEach(recipe => {
                const ingredients = recipe.ingredients || [];
                // Check if any ingredient contains the search term
                if (Array.isArray(ingredients)) {
                    const hasMatch = ingredients.some(ing => 
                        String(ing).toLowerCase().includes(searchLower)
                    );
                    if (hasMatch) {
                        matchingIds.add(recipe.id);
                    }
                } else if (String(ingredients).toLowerCase().includes(searchLower)) {
                    matchingIds.add(recipe.id);
                }
            });
        }
        
        // Filter query to only include matching IDs
        if (matchingIds.size > 0) {
            query = query.in('id', Array.from(matchingIds));
        } else {
            // No matches, return empty result by using impossible condition
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
    }
    if (req.query.tags) {
        const tagsArray = req.query.tags.split(',');
        query = query.contains('tags', tagsArray);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    
    // If user_id is provided, check which recipes are favorited
    if (user_id && data.length > 0) {
        const recipeIds = data.map(r => r.id);
        const { data: favs, error: favsError } = await supabase
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', user_id)
            .in('recipe_id', recipeIds);
        
        if (!favsError) {
            const favoritedIds = new Set(favs.map(f => f.recipe_id));
            data.forEach(recipe => {
                recipe.is_favorited = favoritedIds.has(recipe.id);
            });
        }
    }
    
    res.json(data);
});

// GET /recipes/favorites?user_id=...
router.get('/favorites', async (req, res) => {
    const { user_id, tags } = req.query;
    console.log('Favorites endpoint called with user_id:', user_id, 'tags:', tags);
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    // Get all favorite recipe_ids for this user
    const { data: favs, error: favsError } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', user_id);

    console.log('Favorites query result:', { favs, favsError });
    if (favsError) return res.status(500).json({ error: favsError.message });

    const recipeIds = favs.map(f => f.recipe_id);
    console.log('Recipe IDs found:', recipeIds);
    if (recipeIds.length === 0) {
        console.log('No favorites found, returning empty array');
        return res.json([]); // No favorites
    }

    // Get the full recipe details for these IDs, optionally filter by tags
    let recipesQuery = supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);
    if (tags) {
        const tagsArray = tags.split(',');
        recipesQuery = recipesQuery.contains('tags', tagsArray);
    }
    const { data: recipes, error: recipesError } = await recipesQuery;

    console.log('Recipes query result:', { recipes, recipesError });
    if (recipesError) return res.status(500).json({ error: recipesError.message });

    // Get user's following list (friends)
    const { data: following, error: followingError } = await supabase
        .from('social_follows')
        .select('followee_id')
        .eq('follower_id', user_id);

    // If no following or error, return recipes without friends data
    if (followingError || !following || following.length === 0) {
        console.log('No following data, returning recipes without friends');
        return res.json(recipes.map(r => ({ 
            ...r, 
            friends_cooked_count: 0, 
            friends_cooked: [] 
        })));
    }

    const followingIds = following.map(f => f.followee_id);
    
    // Get friends who cooked each recipe (from recently_cooked table)
    const { data: cookedData, error: cookedError } = await supabase
        .from('recently_cooked')
        .select('recipe_id, user_id')
        .in('recipe_id', recipeIds)
        .in('user_id', followingIds);

    // Group by recipe_id and count unique users
    const friendsCookedMap = new Map();
    if (cookedData && !cookedError) {
        cookedData.forEach(record => {
            if (!friendsCookedMap.has(record.recipe_id)) {
                friendsCookedMap.set(record.recipe_id, new Set());
            }
            friendsCookedMap.get(record.recipe_id).add(record.user_id);
        });
    }

    // Get avatars for friends who cooked
    const friendIds = [...new Set((cookedData || []).map(c => c.user_id))];
    let profileMap = new Map();
    
    if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('id, avatar_url, display_name')
            .in('id', friendIds);
        
        if (friendProfiles) {
            profileMap = new Map(friendProfiles.map(p => [p.id, p]));
        }
    }

    // Enhance recipes with friends data
    const recipesWithFriends = recipes.map(recipe => {
        const cookedUserIds = friendsCookedMap.get(recipe.id) || new Set();
        const friendsWhoCooked = Array.from(cookedUserIds)
            .map(userId => {
                const profile = profileMap.get(userId);
                return profile ? { id: profile.id, avatar_url: profile.avatar_url, display_name: profile.display_name } : null;
            })
            .filter(Boolean)
            .slice(0, 3); // Only first 3 for avatars

        return {
            ...recipe,
            friends_cooked_count: cookedUserIds.size,
            friends_cooked: friendsWhoCooked,
        };
    });

    console.log('Returning recipes with friends data:', recipesWithFriends.length);
    res.json(recipesWithFriends);
});

// GET /recipes/recently-cooked?user_id=...
router.get('/recently-cooked', async (req, res) => {
    const { user_id, limit = 10 } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    // Get recently cooked recipes for this user
    const { data: recent, error: recentError } = await supabase
        .from('recently_cooked')
        .select('recipe_id, cooked_at')
        .eq('user_id', user_id)
        .order('cooked_at', { ascending: false })
        .limit(parseInt(limit));

    if (recentError) return res.status(500).json({ error: recentError.message });

    if (recent.length === 0) return res.json([]);

    // Get the full recipe details for these IDs
    const recipeIds = recent.map(r => r.recipe_id);
    const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

    if (recipesError) return res.status(500).json({ error: recipesError.message });

    // Merge recipe data with cooked_at timestamps
    const recipesWithTimestamps = recipes.map(recipe => {
        const recentRecord = recent.find(r => r.recipe_id === recipe.id);
        return {
            ...recipe,
            cooked_at: recentRecord?.cooked_at
        };
    });

    // Sort by cooked_at (most recent first)
    recipesWithTimestamps.sort((a, b) => 
        new Date(b.cooked_at).getTime() - new Date(a.cooked_at).getTime()
    );

    res.json(recipesWithTimestamps);
});

// GET /recipes/tags/popular
router.get('/tags/popular', async (req, res) => {
    const { data, error } = await supabase.rpc('popular_tags');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /recipes/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(data);
});

// POST /recipes/favorite
router.post('/favorite', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) return res.status(400).json({ error: 'Missing user_id or recipe_id' });

    // Insert or ignore if already exists
    const { error } = await supabase
        .from('favorites')
        .insert([{ user_id, recipe_id }], { upsert: true, onConflict: ['user_id', 'recipe_id'] });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// DELETE /recipes/favorite
router.delete('/favorite', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) return res.status(400).json({ error: 'Missing user_id or recipe_id' });

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user_id)
        .eq('recipe_id', recipe_id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /recipes/start-cooking
router.post('/start-cooking', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) return res.status(400).json({ error: 'Missing user_id or recipe_id' });

    // Insert or update the recently_cooked record
    const { error } = await supabase
        .from('recently_cooked')
        .upsert([{ 
            user_id, 
            recipe_id, 
            cooked_at: new Date().toISOString() 
        }], { 
            onConflict: 'user_id,recipe_id',
            ignoreDuplicates: false 
        });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST /recipes/update-recently-cooked
router.post('/update-recently-cooked', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    console.log('update-recently-cooked called with:', { user_id, recipe_id });
    
    if (!user_id || !recipe_id) {
        console.log('Missing user_id or recipe_id');
        return res.status(400).json({ error: 'Missing user_id or recipe_id' });
    }

    try {
        // Upsert the recently_cooked record timestamp (insert if doesn't exist, update if it does)
        const { data, error } = await supabase
            .from('recently_cooked')
            .upsert([{ 
                user_id, 
                recipe_id, 
                cooked_at: new Date().toISOString()
            }], { 
                onConflict: 'user_id,recipe_id',
                ignoreDuplicates: false 
            })
            .select();

        console.log('Supabase update result:', { data, error });
        
        if (error) {
            console.log('Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }
        
        console.log('Successfully updated recently_cooked for user:', user_id, 'recipe:', recipe_id);
        res.json({ success: true, data });
    } catch (err) {
        console.log('Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /recipes/save-message-recipe
router.post('/save-message-recipe', async (req, res) => {
    const { message_id, saved_recipe_id } = req.body;
    console.log('Received save-message-recipe:', { message_id, saved_recipe_id });
    if (!message_id || !saved_recipe_id) {
        console.log('Missing message_id or saved_recipe_id');
        return res.status(400).json({ error: 'Missing message_id or saved_recipe_id' });
    }
    const { error } = await supabase
        .from('messages')
        .update({ saved_recipe_id })
        .eq('id', message_id);
    if (error) {
        console.log('Supabase update error:', error);
        return res.status(500).json({ error: error.message });
    }
    console.log('Successfully updated message', message_id, 'with saved_recipe_id', saved_recipe_id);
    res.json({ success: true });
});

// POST /recipes/bookmark - Copy a recipe to the user's recipes
router.post('/bookmark', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) return res.status(400).json({ error: 'Missing user_id or recipe_id' });

    try {
        // First, get the original recipe
        const { data: originalRecipe, error: fetchError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', recipe_id)
            .single();

        if (fetchError || !originalRecipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Check if user already has a copy of this recipe
        const { data: existingCopy, error: checkError } = await supabase
            .from('recipes')
            .select('id')
            .eq('user_id', user_id)
            .eq('title', originalRecipe.title)
            .limit(1);

        if (checkError) {
            return res.status(500).json({ error: checkError.message });
        }

        if (existingCopy && existingCopy.length > 0) {
            // User already has a copy, return the existing copy
            return res.json({ success: true, recipe_id: existingCopy[0].id, already_exists: true });
        }

        // Compute icon config (use original's if it exists, otherwise compute)
        const iconConfig = originalRecipe.icon_name && originalRecipe.icon_library
            ? {
                icon_library: originalRecipe.icon_library,
                icon_name: originalRecipe.icon_name,
                icon_bg_color: originalRecipe.icon_bg_color,
                icon_color: originalRecipe.icon_color,
            }
            : getRecipeIconConfig(originalRecipe.title, originalRecipe.tags || []);
        
        // Copy the recipe to the user's recipes
        const { data: copiedRecipe, error: insertError } = await supabase
            .from('recipes')
            .insert([{
                user_id: user_id,
                title: originalRecipe.title,
                time: originalRecipe.time,
                tags: originalRecipe.tags,
                ingredients: originalRecipe.ingredients,
                steps: originalRecipe.steps,
                ...iconConfig
            }])
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        res.json({ success: true, recipe_id: copiedRecipe.id });
    } catch (error) {
        console.error('[recipes/bookmark] Error:', error);
        res.status(500).json({ error: 'Failed to bookmark recipe' });
    }
});

// DELETE /recipes/bookmark - Remove a bookmarked recipe from user's recipes
router.delete('/bookmark', async (req, res) => {
    const { user_id, recipe_id } = req.body;
    if (!user_id || !recipe_id) return res.status(400).json({ error: 'Missing user_id or recipe_id' });

    try {
        // First, get the original recipe to find its title
        const { data: originalRecipe, error: fetchOriginalError } = await supabase
            .from('recipes')
            .select('title')
            .eq('id', recipe_id)
            .single();

        if (fetchOriginalError || !originalRecipe) {
            return res.status(404).json({ error: 'Original recipe not found' });
        }

        // Find the user's copy of this recipe by title
        // Note: This assumes one copy per user per recipe title
        const { data: userCopy, error: fetchCopyError } = await supabase
            .from('recipes')
            .select('id')
            .eq('user_id', user_id)
            .eq('title', originalRecipe.title)
            .limit(1)
            .single();

        if (fetchCopyError || !userCopy) {
            return res.status(404).json({ error: 'Bookmarked recipe not found' });
        }

        // Delete the user's copy
        const { error: deleteError } = await supabase
            .from('recipes')
            .delete()
            .eq('id', userCopy.id)
            .eq('user_id', user_id);

        if (deleteError) {
            return res.status(500).json({ error: deleteError.message });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[recipes/bookmark] Delete error:', error);
        res.status(500).json({ error: 'Failed to unbookmark recipe' });
    }
});

module.exports = router;
