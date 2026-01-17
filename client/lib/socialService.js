import { supabase } from './supabase';

const API_BASE_URL = 'https://familycooksclean.onrender.com';

const authenticatedFetch = async (path, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No session found');
  }

  const mergedOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, mergedOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const socialService = {
  async searchUsers(query) {
    if (!query?.trim()) {
      return [];
    }

    const params = new URLSearchParams({ q: query.trim() });
    return authenticatedFetch(`/social/search?${params.toString()}`);
  },

  async followUser(targetUserId) {
    return authenticatedFetch('/social/follow', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  },

  async unfollowUser(targetUserId) {
    return authenticatedFetch('/social/follow', {
      method: 'DELETE',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  },

  async getFollowing() {
    return authenticatedFetch('/social/following');
  },

  async getFollowers() {
    return authenticatedFetch('/social/followers');
  },

  async getFeed(limit = 40, offset = 0, type = 'following') {
    const params = new URLSearchParams({ 
      type: type,
      limit: `${limit}`,
      offset: `${offset}`
    });
    return authenticatedFetch(`/social/feed?${params.toString()}`);
  },

  async getSuggestedCreators() {
    return authenticatedFetch('/social/suggested');
  },
};


