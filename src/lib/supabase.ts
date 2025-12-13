// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Your Supabase URL and anon Key from the file you provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
