import 'react-native-url-polyfill/auto';
// 1. Import AsyncStorage instead of SecureStore
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 2. The ExpoSecureStoreAdapter is no longer needed, so we remove it.

// Your Supabase URL and Key
const supabaseUrl = 'https://ecvrdcijhdhobjtbtrcl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdnJkY2lqaGRob2JqdGJ0cmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNTU0NjksImV4cCI6MjA2NDkzMTQ2OX0.RhVhDm6MRreFsmbex_QVwiE08unLLb6wYjsH1FVAGVg';

// This is the updated line that creates the client with the necessary options for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 3. Use AsyncStorage directly. Supabase is designed to work with it out of the box.
    storage: AsyncStorage,
    // The rest of your settings are perfectly fine.
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Keep this as true if you use OAuth for login
  },
});