import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: Supabase Admin environment variables are missing in production!');
    } else {
        console.warn('Supabase Admin environment variables are missing');
    }
}

export const supabaseAdmin = createClient(
    supabaseUrl || '',
    supabaseServiceRoleKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);
