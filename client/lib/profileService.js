import { supabase } from './supabase';

const API_BASE_URL = 'https://familycooksclean.onrender.com'; // Update if needed

export const profileService = {
  async getProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('ProfileService session:', session);
    if (!session) throw new Error('No session found');
    console.log('ProfileService access token:', session.access_token);
    const response = await fetch(`${API_BASE_URL}/profiles`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Get profile error:', response.status, errorText);
      throw new Error('Failed to fetch profile');
    }
    return await response.json();
  },

  async updateProfile(profileData) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    const response = await fetch(`${API_BASE_URL}/profiles`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return await response.json();
  },

  async uploadAvatar(imageUri) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session found');
    const response = await fetch(imageUri);
    const blob = await response.blob();
    console.log('uploadAvatar blob:', blob);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          console.log('uploadAvatar base64Data length:', base64Data.length);
          const fileName = `avatar_${Date.now()}.jpg`;
          const contentType = blob.type || 'image/jpeg';
          const uploadResponse = await fetch(`${API_BASE_URL}/profiles/upload-avatar`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: base64Data,
              fileName,
              contentType,
            }),
          });
          if (!uploadResponse.ok) {
            const errorBody = await uploadResponse.text();
            console.log('uploadAvatar uploadResponse status:', uploadResponse.status);
            console.log('uploadAvatar uploadResponse body:', errorBody);
            throw new Error('Failed to upload avatar');
          }
          const result = await uploadResponse.json();
          resolve(result.avatar_url);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error('Failed to get current user');
    return user;
  },
};
