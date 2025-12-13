import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client with Service Role Key if available for backend operations, 
// otherwise use the anon key but real-world bulk ops usually need higher privs or RLS configured.
// For now, consistent with src/lib/supabase.ts, we'll import the configured client or create a new one.
// Actually, to query ALL profiles, we might need service role if RLS is on.
// But list_tables showed RLS disabled. So standard client is fine.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ecvrdcijhdhobjtbtrcl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdnJkY2lqaGRob2JqdGJ0cmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNTU0NjksImV4cCI6MjA2NDkzMTQ2OX0.RhVhDm6MRreFsmbex_QVwiE08unLLb6wYjsH1FVAGVg'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
    try {
        const { title, message, segment, targetUserIds, targetStates } = await request.json()

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
        }

        let query = supabase.from('profiles').select('id')

        // Apply filters based on segment or direct targeting
        if (targetUserIds && targetUserIds.length > 0) {
            // Specific users
            query = query.in('id', targetUserIds)
        } else if (targetStates && targetStates.length > 0) {
            // Multiple states
            // Heuristic: city matches ANY of the target states
            // content.ilike.%state1%, content.ilike.%state2% ...
            // Supabase 'or' syntax: city.ilike.%State1%,city.ilike.%State2%
            const orQuery = targetStates.map((s: string) => `city.ilike.%${s}%`).join(',')
            query = query.or(orQuery)
        } else if (segment === 'specific-state') {
            // Fallback for generic 'single state' if mixed usage
            const { targetState } = await request.clone().json().catch(() => ({}))
            if (targetState) {
                query = query.ilike('city', `%${targetState}%`)
            }
        }
        // else 'all' -> no filter

        const { data: users, error: userError } = await query

        if (userError) {
            console.error('Error fetching users:', userError)
            return NextResponse.json({ error: userError.message }, { status: 500 })
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No users found for this selection' }, { status: 200 })
        }

        // Prepare notifications
        const notifications = users.map(user => ({
            user_id: user.id,
            title: title,
            message: message,
            is_read: false,
            created_at: new Date().toISOString()
        }))

        // Bulk insert
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications)

        if (insertError) {
            console.error('Error inserting notifications:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, count: notifications.length })

    } catch (error) {
        console.error('Internal Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
