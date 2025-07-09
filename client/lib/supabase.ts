import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from Expo Constants
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// Validate environment variables
if (!supabaseUrl) {
    throw new Error(
        'Missing SUPABASE_URL environment variable. Please check your .env file and app.config.js'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'Missing SUPABASE_ANON_KEY environment variable. Please check your .env file and app.config.js'
    );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
    throw new Error('SUPABASE_URL must be a valid HTTPS URL');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);