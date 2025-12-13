import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecvrdcijhdhobjtbtrcl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdnJkY2lqaGRob2JqdGJ0cmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNTU0NjksImV4cCI6MjA2NDkzMTQ2OX0.RhVhDm6MRreFsmbex_QVwiE08unLLb6wYjsH1FVAGVg'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')

        if (!q) {
            return NextResponse.json([])
        }

        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, city, state, avatar_url')
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
            .limit(20)

        if (error) {
            console.error('Error searching users:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(users)

    } catch (error) {
        console.error('Internal Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
