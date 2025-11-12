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

// GET /social/search?q=...
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json([]);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', req.user.id)
      .order('display_name', { ascending: true })
      .limit(25);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

    const results = data.map(profile => ({
      ...profile,
      is_following: followingIds.includes(profile.id),
    }));

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

// GET /social/feed?limit=20
router.get('/feed', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

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

    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .in('user_id', followeeIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recipeError) {
      return res.status(500).json({ error: recipeError.message });
    }

    if (!recipes || recipes.length === 0) {
      return res.json([]);
    }

    const authorIds = [...new Set(recipes.map(recipe => recipe.user_id))];
    const { data: authors, error: authorError } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', authorIds);

    if (authorError) {
      return res.status(500).json({ error: authorError.message });
    }

    const authorMap = new Map(authors.map(author => [author.id, author]));

    const recipeIds = recipes.map(recipe => recipe.id);
    let favoriteIds = new Set();

    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', req.user.id)
      .in('recipe_id', recipeIds);

    if (!favoritesError && favorites) {
      favoriteIds = new Set(favorites.map(fav => fav.recipe_id));
    }

    const results = recipes.map(recipe => ({
      ...recipe,
      author: authorMap.get(recipe.user_id) || null,
      is_favorited: favoriteIds.has(recipe.id),
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load social feed' });
  }
});

module.exports = router;


