/**
 * Supabase Client Configuration
 *
 * This file initializes and exports the Supabase client for use throughout the app.
 * Supabase will handle all structured data (users, posts, events, etc.)
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing REACT_APP_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

/**
 * Supabase Client
 *
 * Configuration:
 * - auth: Uses Firebase Auth for now (can switch to Supabase Auth later)
 * - global: Fetch options for all requests
 * - db: PostgreSQL settings
 * - realtime: WebSocket settings for live updates
 */
// SECURITY HARDENING: Always use the Anonymous Key on the client.
// Never expose or use the Service Role Key in the frontend.
const supabaseKey = supabaseAnonKey;

// DEBUG: Confirm connection type (Safe)
console.log('🔹 Supabase Client initialized with: ANON KEY (RLS Enforced)');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // We're using Firebase Auth, so disable Supabase Auth
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'AmaPlayer',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    // Enable real-time subscriptions for live updates
    // (Optional: Can use Firebase Realtime instead)
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper function to set auth token from Firebase
 * Call this after user logs in with Firebase Auth
 */
export const setSupabaseAuth = (firebaseToken: string) => {
  // IGNORE: When using Service Role Key, we don't need user tokens for RLS
  // console.log('🔹 setSupabaseAuth called (Ignored due to Service Role usage)');
};

/**
 * Helper function to check if Supabase is connected
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase connection test failed:', err);
    return false;
  }
};

export default supabase;
