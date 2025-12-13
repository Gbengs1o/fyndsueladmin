import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { advert_id, event_type, user_id, metadata } = body

        if (!advert_id || !event_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const { error } = await supabase
            .from('ad_analytics')
            .insert({
                advert_id,
                event_type,
                user_id: user_id || null,
                metadata: metadata || {}
            })

        if (error) {
            console.error('Error logging ad interaction:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (error: any) {
        console.error('Ad interaction error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
