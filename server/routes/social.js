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

// Helper function to get favorite counts and user interactions
async function getRecipeEngagement(recipeIds, userId) {
  const { data: favoriteCounts } = await supabase
    .from('favorites')
    .select('recipe_id, created_at')
    .in('recipe_id', recipeIds);

  const favoriteCountMap = new Map();
  const recentFavoritesMap = new Map(); // Track favorites in last 24 hours
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  if (favoriteCounts) {
    favoriteCounts.forEach(fav => {
      const count = favoriteCountMap.get(fav.recipe_id) || 0;
      favoriteCountMap.set(fav.recipe_id, count + 1);
      
      // Track recent favorites for trending calculation
      const favTime = new Date(fav.created_at).getTime();
      if (favTime > oneDayAgo) {
        const recentCount = recentFavoritesMap.get(fav.recipe_id) || 0;
        recentFavoritesMap.set(fav.recipe_id, recentCount + 1);
      }
    });
  }

  // Check which recipes are favorited by current user
  const { data: currentUserFavorites } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', userId)
    .in('recipe_id', recipeIds);

  const currentUserFavoriteIds = new Set((currentUserFavorites || []).map(f => f.recipe_id));

  return {
    favoriteCountMap,
    recentFavoritesMap,
    currentUserFavoriteIds,
  };
}

// Helper function to format and return recipes
async function formatRecipes(recipes, userId, limit, offset) {
  if (!recipes || recipes.length === 0) {
    return {
      recipes: [],
      has_more: false,
      next_offset: null,
    };
  }

  const recipeIds = recipes.map(recipe => recipe.id);
  const engagement = await getRecipeEngagement(recipeIds, userId);

  // Get author profiles
  const authorIds = [...new Set(recipes.map(recipe => recipe.user_id))];
  const { data: authors, error: authorError } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', authorIds);

  if (authorError) {
    throw new Error(authorError.message);
  }

  const authorMap = new Map(authors.map(author => [author.id, author]));

  // Check which recipes are bookmarked (copied to user's recipes)
  const { data: userRecipes } = await supabase
    .from('recipes')
    .select('title')
    .eq('user_id', userId);

  const userRecipeTitles = new Set((userRecipes || []).map(r => r.title));
  const bookmarkedRecipeIds = new Set();
  
  recipes.forEach(recipe => {
    if (userRecipeTitles.has(recipe.title)) {
      bookmarkedRecipeIds.add(recipe.id);
    }
  });

  // Apply pagination
  const paginatedRecipes = recipes.slice(offset, offset + limit);

  // Format final results
  const results = paginatedRecipes.map(recipe => ({
    ...recipe,
    author: authorMap.get(recipe.user_id) || null,
    is_favorited: engagement.currentUserFavoriteIds.has(recipe.id),
    is_saved: bookmarkedRecipeIds.has(recipe.id),
    favorite_count: engagement.favoriteCountMap.get(recipe.id) || 0,
  }));

  return {
    recipes: results,
    has_more: recipes.length > offset + limit,
    next_offset: results.length === limit ? offset + limit : null,
  };
}

// GET /social/feed?type=following|for_you|trending&limit=20&offset=0
router.get('/feed', async (req, res) => {
  const feedType = req.query.type || 'following'; // Default to following
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    // Get user's follows
    const { data: followRows, error: followError } = await supabase
      .from('social_follows')
      .select('followee_id')
      .eq('follower_id', req.user.id);

    if (followError) {
      return res.status(500).json({ error: followError.message });
    }

    const followeeIds = followRows ? followRows.map(row => row.followee_id) : [];

    let recipes = [];

    if (feedType === 'following') {
      // FOLLOWING: Only recipes from users you follow
      if (followeeIds.length === 0) {
        return res.json({
          recipes: [],
          has_more: false,
          next_offset: null,
        });
      }

      const fetchLimit = Math.min(limit * 5, 500);
      const { data: fetchedRecipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .in('user_id', followeeIds)
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (recipeError) {
        return res.status(500).json({ error: recipeError.message });
      }

      if (!fetchedRecipes || fetchedRecipes.length === 0) {
        return res.json({
          recipes: [],
          has_more: false,
          next_offset: null,
        });
      }

      const recipeIds = fetchedRecipes.map(recipe => recipe.id);
      const engagement = await getRecipeEngagement(recipeIds, req.user.id);

      // Score and rank recipes using Reddit's "hot" algorithm
      const now = Date.now();
      const recipesWithScores = fetchedRecipes.map(recipe => {
        const favoriteCount = engagement.favoriteCountMap.get(recipe.id) || 0;
        const createdTime = new Date(recipe.created_at).getTime();
        const ageInHours = (now - createdTime) / (1000 * 60 * 60);
        
        const recipeHotScore = Math.log10(Math.max(favoriteCount, 1) + 1) + 
                              (createdTime / 1000) / 45000 - 
                              (ageInHours / 24) * 0.1;
        
        return {
          ...recipe,
          score: recipeHotScore,
        };
      });

      recipesWithScores.sort((a, b) => b.score - a.score);

      // Diversify: Limit recipes per author
      const authorCountMap = new Map();
      const diversifiedRecipes = [];
      const maxPerAuthor = 3;
      
      for (const recipe of recipesWithScores) {
        const authorId = recipe.user_id;
        const authorCount = authorCountMap.get(authorId) || 0;
        
        const scoreThreshold = recipesWithScores.length > 10 
          ? recipesWithScores[Math.floor(recipesWithScores.length * 0.1)].score 
          : recipe.score;
        
        if (authorCount < maxPerAuthor || recipe.score >= scoreThreshold) {
          diversifiedRecipes.push(recipe);
          authorCountMap.set(authorId, authorCount + 1);
          
          if (diversifiedRecipes.length >= limit + offset) {
            break;
          }
        }
      }
      
      recipes = diversifiedRecipes;

    } else if (feedType === 'for_you') {
      // FOR YOU: Discovery feed - mix of popular recipes and recipes from similar users
      // Exclude recipes from users you already follow and your own recipes
      const excludeUserIds = [req.user.id, ...followeeIds];
      
      // Get popular recipes from non-followed users
      // Fetch more to have a good pool for ranking
      const fetchLimit = Math.min(limit * 10, 1000);
      const { data: allRecipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(fetchLimit);
      
      if (recipeError) {
        return res.status(500).json({ error: recipeError.message });
      }
      
      if (!allRecipes || allRecipes.length === 0) {
        return res.json({
          recipes: [],
          has_more: false,
          next_offset: null,
        });
      }
      
      // Filter out recipes from excluded users (users you follow + yourself)
      const filteredRecipes = allRecipes.filter(recipe => !excludeUserIds.includes(recipe.user_id));
      
      if (filteredRecipes.length === 0) {
        return res.json({
          recipes: [],
          has_more: false,
          next_offset: null,
        });
      }
      
      const recipeIds = filteredRecipes.map(recipe => recipe.id);
      const engagement = await getRecipeEngagement(recipeIds, req.user.id);

      // Score recipes for discovery: balance popularity, recency, and diversity
      const now = Date.now();
      const recipesWithScores = filteredRecipes.map(recipe => {
        const favoriteCount = engagement.favoriteCountMap.get(recipe.id) || 0;
        const createdTime = new Date(recipe.created_at).getTime();
        const ageInHours = (now - createdTime) / (1000 * 60 * 60);
        
        // Discovery score: favor recipes with some engagement but not too old
        // Boost newer recipes and recipes with moderate engagement
        const discoveryScore = Math.log10(Math.max(favoriteCount, 1) + 1) * 0.7 + 
                              (createdTime / 1000) / 45000 - 
                              (ageInHours / 24) * 0.15;
        
        return {
          ...recipe,
          score: discoveryScore,
        };
      });

      recipesWithScores.sort((a, b) => b.score - a.score);

      // Strong diversification for discovery feed
      const authorCountMap = new Map();
      const diversifiedRecipes = [];
      const maxPerAuthor = 2; // Stricter limit for discovery
      
      for (const recipe of recipesWithScores) {
        const authorId = recipe.user_id;
        const authorCount = authorCountMap.get(authorId) || 0;
        
        if (authorCount < maxPerAuthor) {
          diversifiedRecipes.push(recipe);
          authorCountMap.set(authorId, authorCount + 1);
          
          if (diversifiedRecipes.length >= limit + offset) {
            break;
          }
        }
      }
      
      recipes = diversifiedRecipes;

    } else if (feedType === 'trending') {
      // TRENDING: Algorithmically trending recipes based on engagement velocity
      // Recipes that are gaining favorites quickly in recent time
      const fetchLimit = Math.min(limit * 10, 1000);
      const { data: allRecipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (recipeError) {
        return res.status(500).json({ error: recipeError.message });
      }

      if (!allRecipes || allRecipes.length === 0) {
        return res.json({
          recipes: [],
          has_more: false,
          next_offset: null,
        });
      }

      const recipeIds = allRecipes.map(recipe => recipe.id);
      const engagement = await getRecipeEngagement(recipeIds, req.user.id);

      // Calculate trending score based on engagement velocity
      const now = Date.now();
      const recipesWithScores = allRecipes.map(recipe => {
        const favoriteCount = engagement.favoriteCountMap.get(recipe.id) || 0;
        const recentFavorites = engagement.recentFavoritesMap.get(recipe.id) || 0;
        const createdTime = new Date(recipe.created_at).getTime();
        const ageInHours = (now - createdTime) / (1000 * 60 * 60);
        
        // Trending algorithm: prioritize recipes with high recent engagement
        // Velocity = recent favorites / total favorites (if total > 0)
        // Boost recipes that are gaining traction quickly
        const velocity = favoriteCount > 0 ? recentFavorites / favoriteCount : 0;
        const trendingScore = (recentFavorites * 2) + // Recent favorites weighted heavily
                              (favoriteCount * 0.5) + // Total favorites
                              (velocity * 10) + // Velocity boost
                              (createdTime / 1000) / 45000 - // Recency boost
                              (ageInHours / 24) * 0.2; // Age penalty
        
        return {
          ...recipe,
          score: trendingScore,
        };
      });

      recipesWithScores.sort((a, b) => b.score - a.score);

      // Moderate diversification for trending
      const authorCountMap = new Map();
      const diversifiedRecipes = [];
      const maxPerAuthor = 3;
      
      for (const recipe of recipesWithScores) {
        const authorId = recipe.user_id;
        const authorCount = authorCountMap.get(authorId) || 0;
        
        const scoreThreshold = recipesWithScores.length > 10 
          ? recipesWithScores[Math.floor(recipesWithScores.length * 0.15)].score 
          : recipe.score;
        
        if (authorCount < maxPerAuthor || recipe.score >= scoreThreshold) {
          diversifiedRecipes.push(recipe);
          authorCountMap.set(authorId, authorCount + 1);
          
          if (diversifiedRecipes.length >= limit + offset) {
            break;
          }
        }
      }
      
      recipes = diversifiedRecipes;

    } else {
      return res.status(400).json({ error: 'Invalid feed type. Use: following, for_you, or trending' });
    }

    // Format and return results
    const result = await formatRecipes(recipes, req.user.id, limit, offset);
    res.json(result);

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


