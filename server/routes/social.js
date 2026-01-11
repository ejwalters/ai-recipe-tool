const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

router.use(authenticateUser);

// GET /social/suggested
router.get('/suggested', async (req, res) => {
  try {
    // Get users with recipes, ordered by recipe_count desc, then follower_count desc
    // Exclude current user and users already followed
    const { data: currentUserFollows } = await supabase
      .from('social_follows')
      .select('followee_id')
      .eq('follower_id', req.user.id);
    
    const followedIds = (currentUserFollows || []).map(row => row.followee_id);
    const excludeIds = [req.user.id, ...followedIds];
    
    // Get users with recipes (recipe_count > 0)
    // We'll get recipe counts for all users and filter
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .neq('id', req.user.id)
      .limit(100);
    
    if (profilesError) {
      return res.status(500).json({ error: profilesError.message });
    }
    
    if (!allProfiles || allProfiles.length === 0) {
      return res.json([]);
    }
    
    const profileIds = allProfiles.map(p => p.id);
    
    // Get recipe counts
    const recipeCountPromises = profileIds.map(userId =>
      supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    );
    
    const recipeCountResults = await Promise.all(recipeCountPromises);
    const recipeCountMap = new Map();
    recipeCountResults.forEach((result, index) => {
      recipeCountMap.set(profileIds[index], result.count || 0);
    });
    
    // Get follower counts
    const followerCountPromises = profileIds.map(userId =>
      supabase
        .from('social_follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', userId)
    );
    
    const followerCountResults = await Promise.all(followerCountPromises);
    const followerCountMap = new Map();
    followerCountResults.forEach((result, index) => {
      followerCountMap.set(profileIds[index], result.count || 0);
    });
    
    // Filter to users with recipes and not already followed, then sort
    const suggested = allProfiles
      .filter(profile => {
        const recipeCount = recipeCountMap.get(profile.id) || 0;
        const isFollowed = followedIds.includes(profile.id);
        return recipeCount > 0 && !isFollowed;
      })
      .map(profile => ({
        ...profile,
        recipes_count: recipeCountMap.get(profile.id) || 0,
        follower_count: followerCountMap.get(profile.id) || 0,
        is_following: false,
      }))
      .sort((a, b) => {
        // Sort by recipe_count desc, then follower_count desc
        if (a.recipes_count !== b.recipes_count) {
          return b.recipes_count - a.recipes_count;
        }
        return (b.follower_count || 0) - (a.follower_count || 0);
      })
      .slice(0, 20);
    
    res.json(suggested);
  } catch (error) {
    console.error('[social/suggested] Error:', error);
    res.status(500).json({ error: 'Failed to get suggested creators' });
  }
});

// GET /social/search?q=...
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json([]);
  }

  try {
    // Query both username and display_name separately, then combine unique results
    // This is more reliable than using .or() with ILIKE in PostgREST
    const searchPattern = `%${query}%`;
    
    const [usernameResults, displayNameResults] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .ilike('username', searchPattern)
        .neq('id', req.user.id)
        .limit(25),
      supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .ilike('display_name', searchPattern)
        .neq('id', req.user.id)
        .limit(25),
    ]);

    if (usernameResults.error) {
      console.error('[social/search] Username search error:', usernameResults.error);
      return res.status(500).json({ error: usernameResults.error.message });
    }

    if (displayNameResults.error) {
      console.error('[social/search] Display name search error:', displayNameResults.error);
      return res.status(500).json({ error: displayNameResults.error.message });
    }

    // Combine results and remove duplicates
    const allResults = [...(usernameResults.data || []), ...(displayNameResults.data || [])];
    const uniqueMap = new Map();
    allResults.forEach(profile => {
      if (!uniqueMap.has(profile.id)) {
        uniqueMap.set(profile.id, profile);
      }
    });
    const data = Array.from(uniqueMap.values()).slice(0, 25);

    // Mark which of these users are already followed
    const targetIds = data.map(profile => profile.id);
    let followingIds = [];

    if (targetIds.length > 0) {
      const { data: existing, error: followError } = await supabase
        .from('social_follows')
        .select('followee_id')
        .eq('follower_id', req.user.id)
        .in('followee_id', targetIds);

      if (!followError && existing) {
        followingIds = existing.map(row => row.followee_id);
      }
    }

    // Get follower counts for each user
    const followerCountPromises = targetIds.map(userId =>
      supabase
        .from('social_follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', userId)
    );

    const followerCountResults = await Promise.all(followerCountPromises);
    const followerCountMap = new Map();
    followerCountResults.forEach((result, index) => {
      followerCountMap.set(targetIds[index], result.count || 0);
    });

    // Get recipe counts for each user
    const recipeCountPromises = targetIds.map(userId =>
      supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    );

    const recipeCountResults = await Promise.all(recipeCountPromises);
    const recipeCountMap = new Map();
    recipeCountResults.forEach((result, index) => {
      recipeCountMap.set(targetIds[index], result.count || 0);
    });

    const results = data.map(profile => ({
      ...profile,
      is_following: followingIds.includes(profile.id),
      follower_count: followerCountMap.get(profile.id) || 0,
      recipes_count: recipeCountMap.get(profile.id) || 0,
    }));

    // Sort by relevance: startsWith matches first, then by recipe_count desc, then follower_count desc
    const queryLower = query.toLowerCase();
    results.sort((a, b) => {
      const aName = (a.display_name || a.username || '').toLowerCase();
      const bName = (b.display_name || b.username || '').toLowerCase();
      const aHandle = (a.username || '').toLowerCase();
      const bHandle = (b.username || '').toLowerCase();
      
      // Prioritize startsWith matches
      const aStartsWith = aName.startsWith(queryLower) || aHandle.startsWith(queryLower);
      const bStartsWith = bName.startsWith(queryLower) || bHandle.startsWith(queryLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Then by recipe_count desc
      const aRecipes = a.recipes_count || 0;
      const bRecipes = b.recipes_count || 0;
      if (aRecipes !== bRecipes) return bRecipes - aRecipes;
      
      // Then by follower_count desc
      const aFollowers = a.follower_count || 0;
      const bFollowers = b.follower_count || 0;
      if (aFollowers !== bFollowers) return bFollowers - aFollowers;
      
      // Finally by name
      return aName.localeCompare(bName);
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// POST /social/follow { target_user_id }
router.post('/follow', async (req, res) => {
  const { target_user_id: targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Missing target_user_id' });
  }

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  try {
    const { error } = await supabase
      .from('social_follows')
      .upsert(
        [{ follower_id: req.user.id, followee_id: targetUserId }],
        { onConflict: 'follower_id,followee_id' }
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// DELETE /social/follow { target_user_id }
router.delete('/follow', async (req, res) => {
  const { target_user_id: targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Missing target_user_id' });
  }

  try {
    const { error } = await supabase
      .from('social_follows')
      .delete()
      .eq('follower_id', req.user.id)
      .eq('followee_id', targetUserId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// GET /social/following
router.get('/following', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('social_follows')
      .select('followee_id, created_at')
      .eq('follower_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const followeeIds = data.map(row => row.followee_id);
    if (followeeIds.length === 0) {
      return res.json([]);
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', followeeIds);

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
    const results = data
      .map(row => ({
        ...profileMap.get(row.followee_id),
        followed_at: row.created_at,
      }))
      .filter(Boolean);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load follow list' });
  }
});

// GET /social/followers
router.get('/followers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('social_follows')
      .select('follower_id, created_at')
      .eq('followee_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const followerIds = data.map(row => row.follower_id);
    if (followerIds.length === 0) {
      return res.json([]);
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', followerIds);

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
    const results = data
      .map(row => ({
        ...profileMap.get(row.follower_id),
        followed_at: row.created_at,
      }))
      .filter(Boolean);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

// GET /social/feed?limit=20&offset=0
// Uses Reddit's "hot" algorithm for better ranking that scales well
router.get('/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100); // Increased max limit
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const { data: followRows, error: followError } = await supabase
      .from('social_follows')
      .select('followee_id')
      .eq('follower_id', req.user.id);

    if (followError) {
      return res.status(500).json({ error: followError.message });
    }

    if (!followRows || followRows.length === 0) {
      return res.json([]);
    }

    const followeeIds = followRows.map(row => row.followee_id);

    // Get recipes from followed users - fetch more for ranking, then paginate
    // Increased fetch limit for better ranking pool
    const fetchLimit = Math.min(limit * 5, 500); // Fetch 5x for better ranking pool
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .in('user_id', followeeIds)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (recipeError) {
      return res.status(500).json({ error: recipeError.message });
    }

    if (!recipes || recipes.length === 0) {
      return res.json([]);
    }

    const recipeIds = recipes.map(recipe => recipe.id);

    // Get favorite counts for each recipe
    const { data: favoriteCounts } = await supabase
      .from('favorites')
      .select('recipe_id')
      .in('recipe_id', recipeIds);

    const favoriteCountMap = new Map();
    if (favoriteCounts) {
      favoriteCounts.forEach(fav => {
        favoriteCountMap.set(fav.recipe_id, (favoriteCountMap.get(fav.recipe_id) || 0) + 1);
      });
    }

    // Check which recipes are favorited by current user
    const { data: currentUserFavorites } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', req.user.id)
      .in('recipe_id', recipeIds);

    const currentUserFavoriteIds = new Set((currentUserFavorites || []).map(f => f.recipe_id));

    // Score and rank recipes using Reddit's "hot" algorithm (better for scaling)
    // This algorithm balances recency and engagement in a way that works well at scale
    const now = Date.now();
    const recipesWithScores = recipes.map(recipe => {
      const favoriteCount = favoriteCountMap.get(recipe.id) || 0;
      const createdTime = new Date(recipe.created_at).getTime();
      const ageInSeconds = (now - createdTime) / 1000;
      const ageInHours = ageInSeconds / 3600;
      
      // Reddit's "hot" algorithm formula:
      // score = log10(max(abs(s), 1)) * sign(s) + (epoch_seconds - 1134028003) / 45000
      // Simplified for our use case:
      // - s = upvotes - downvotes (we use favorites as "upvotes")
      // - We want newer content to rank higher, so we subtract age
      
      // Calculate score using Reddit's hot algorithm
      // This naturally balances new content with popular content
      const s = favoriteCount; // Favorites act as "upvotes"
      const order = Math.log10(Math.max(Math.abs(s), 1));
      const sign = s > 0 ? 1 : s < 0 ? -1 : 0;
      
      // Reddit uses epoch seconds, we'll use a similar approach
      // The division by 45000 creates a time decay (roughly 12.5 hours per point)
      // We adjust this to work better for recipes (longer shelf life than Reddit posts)
      const seconds = Math.floor(createdTime / 1000);
      const hotScore = order * sign + seconds / 45000;
      
      // Alternative: Simplified hot algorithm optimized for recipes
      // This gives better results for content that should have longer relevance
      const recipeHotScore = Math.log10(Math.max(favoriteCount, 1) + 1) + 
                            (createdTime / 1000) / 45000 - 
                            (ageInHours / 24) * 0.1; // Gentle decay over days
      
      return {
        ...recipe,
        favorite_count: favoriteCount,
        score: recipeHotScore, // Use the recipe-optimized hot score
        created_time: createdTime,
      };
    });

    // Sort by score (descending - highest score first)
    recipesWithScores.sort((a, b) => b.score - a.score);

    // Diversify: Limit recipes per author to ensure variety
    // This prevents one popular creator from dominating the feed
    const authorCountMap = new Map();
    const diversifiedRecipes = [];
    const maxPerAuthor = 3; // Increased from 2 to allow more variety while still diversifying
    
    for (const recipe of recipesWithScores) {
      const authorId = recipe.user_id;
      const authorCount = authorCountMap.get(authorId) || 0;
      
      // Allow max recipes per author, or if score is exceptionally high (top 10%)
      const scoreThreshold = recipesWithScores.length > 10 
        ? recipesWithScores[Math.floor(recipesWithScores.length * 0.1)].score 
        : recipe.score;
      
      if (authorCount < maxPerAuthor || recipe.score >= scoreThreshold) {
        diversifiedRecipes.push(recipe);
        authorCountMap.set(authorId, authorCount + 1);
        
        // Get enough for pagination (limit + offset)
        if (diversifiedRecipes.length >= limit + offset) {
          break;
        }
      }
    }
    
    // Apply pagination
    const paginatedRecipes = diversifiedRecipes.slice(offset, offset + limit);

    // Get author profiles
    const authorIds = [...new Set(paginatedRecipes.map(recipe => recipe.user_id))];
    const { data: authors, error: authorError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', authorIds);

    if (authorError) {
      return res.status(500).json({ error: authorError.message });
    }

    const authorMap = new Map(authors.map(author => [author.id, author]));

    // Check which recipes are bookmarked (copied to user's recipes)
    // We check if user has a recipe with the same title as any of the diversified recipes
    const { data: userRecipes } = await supabase
      .from('recipes')
      .select('title')
      .eq('user_id', req.user.id);

    const userRecipeTitles = new Set((userRecipes || []).map(r => r.title));
    const bookmarkedRecipeIds = new Set();
    
    // Match paginated recipes by title to see if user has bookmarked (copied) them
    paginatedRecipes.forEach(recipe => {
      if (userRecipeTitles.has(recipe.title)) {
        bookmarkedRecipeIds.add(recipe.id);
      }
    });

    // Format final results
    const results = paginatedRecipes.map(recipe => ({
      ...recipe,
      author: authorMap.get(recipe.user_id) || null,
      is_favorited: currentUserFavoriteIds.has(recipe.id),
      is_saved: bookmarkedRecipeIds.has(recipe.id), // Bookmarked = copied to user's recipes
      // Remove internal scoring fields
      score: undefined,
      created_time: undefined,
    }));

    // Return results with pagination metadata
    res.json({
      recipes: results,
      has_more: diversifiedRecipes.length > offset + limit,
      next_offset: results.length === limit ? offset + limit : null,
    });
  } catch (error) {
    console.error('[social/feed] Error:', error);
    res.status(500).json({ error: 'Failed to load social feed' });
  }
});

// GET /social/profile/:user_id
router.get('/profile/:user_id', async (req, res) => {
  const targetUserId = req.params.user_id;

  try {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, bio')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get follower count
    const { count: followersCount, error: followersError } = await supabase
      .from('social_follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', targetUserId);

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
      .from('social_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', targetUserId);

    // Get recipes count
    const { count: recipesCount, error: recipesError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId);

    // Check if current user is following
    let isFollowing = false;
    if (req.user.id !== targetUserId) {
      const { data: followCheck } = await supabase
        .from('social_follows')
        .select('followee_id')
        .eq('follower_id', req.user.id)
        .eq('followee_id', targetUserId)
        .single();
      isFollowing = !!followCheck;
    }

    res.json({
      ...profile,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      recipes_count: recipesCount || 0,
      is_following: isFollowing,
    });
  } catch (error) {
    console.error('[social/profile] Error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// GET /social/profile/:user_id/recipes
router.get('/profile/:user_id/recipes', async (req, res) => {
  const targetUserId = req.params.user_id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  try {
    // Get all recipes for now (later can filter by is_public)
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, title, time, tags, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recipesError) {
      return res.status(500).json({ error: recipesError.message });
    }

    // Mark which recipes are favorited by current user
    if (recipes && recipes.length > 0) {
      const recipeIds = recipes.map(r => r.id);
      const { data: favorites } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', req.user.id)
        .in('recipe_id', recipeIds);

      const favoritedIds = new Set((favorites || []).map(f => f.recipe_id));
      recipes.forEach(recipe => {
        recipe.is_favorited = favoritedIds.has(recipe.id);
      });
    }

    res.json(recipes || []);
  } catch (error) {
    console.error('[social/profile/recipes] Error:', error);
    res.status(500).json({ error: 'Failed to load recipes' });
  }
});

// GET /social/profile/:user_id/favorites
router.get('/profile/:user_id/favorites', async (req, res) => {
  const targetUserId = req.params.user_id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  try {
    // Get favorited recipe IDs for this user
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', targetUserId)
      .limit(limit);

    if (favoritesError) {
      return res.status(500).json({ error: favoritesError.message });
    }

    if (!favorites || favorites.length === 0) {
      return res.json([]);
    }

    const recipeIds = favorites.map(f => f.recipe_id);

    // Get the actual recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, title, time, tags, created_at')
      .in('id', recipeIds)
      .order('created_at', { ascending: false });

    if (recipesError) {
      return res.status(500).json({ error: recipesError.message });
    }

    // Mark which recipes are favorited by current user
    if (recipes && recipes.length > 0) {
      const { data: currentUserFavorites } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', req.user.id)
        .in('recipe_id', recipeIds);

      const favoritedIds = new Set((currentUserFavorites || []).map(f => f.recipe_id));
      recipes.forEach(recipe => {
        recipe.is_favorited = favoritedIds.has(recipe.id);
      });
    }

    res.json(recipes || []);
  } catch (error) {
    console.error('[social/profile/favorites] Error:', error);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

module.exports = router;


