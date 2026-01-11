const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to authenticate user via JWT
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
};

// Check username availability (public endpoint, no auth required)
router.get('/check-username', async (req, res) => {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Validate format
  const usernamePattern = /^[a-z0-9_]+$/i;
  const trimmedUsername = username.trim();
  if (!usernamePattern.test(trimmedUsername) || trimmedUsername.length < 3) {
    return res.json({ available: false, reason: 'Invalid format' });
  }

  try {
    const normalizedUsername = trimmedUsername.toLowerCase();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', normalizedUsername);

    if (error) {
      console.error('[profiles/check-username] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      available: (count ?? 0) === 0,
      username: normalizedUsername
    });
  } catch (error) {
    console.error('[profiles/check-username] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// Get profile
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});



// Update profile
router.put('/', authenticateUser, async (req, res) => {
  try {
    const updateFields = { updated_at: new Date().toISOString() };
    ['name', 'email', 'phone', 'avatar_url', 'dietary_preferences'].forEach(field => {
      if (req.body[field] !== undefined) updateFields[field] = req.body[field];
    });
    const { data, error } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/upload-avatar', authenticateUser, async (req, res) => {
  const { imageData, fileName, contentType } = req.body;
  if (!imageData || !fileName) {
    return res.status(400).json({ error: 'Image data and filename required' });
  }
  const buffer = Buffer.from(imageData, 'base64');
  const uniqueFileName = `${req.user.id}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(uniqueFileName, buffer, {
      contentType: contentType || 'image/jpeg',
      upsert: true
    });
  if (error) return res.status(500).json({ error: error.message });
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(uniqueFileName);
  // Optionally update profile with new avatar_url
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', req.user.id);
  res.json({ avatar_url: publicUrl });
});

module.exports = router;
