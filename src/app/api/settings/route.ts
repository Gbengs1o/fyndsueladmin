import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    try {
        let query = supabase.from('app_settings').select('*')

        if (key) {
            query = query.eq('key', key)
        }

        const { data, error } = await query

        if (error) throw error

        // If specific key requested, return just that value or null
        if (key) {
            if (data && data.length > 0) {
                return NextResponse.json(data[0])
            }
            return NextResponse.json({ key, value: null }, { status: 404 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { key, value } = body

        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('app_settings')
            .upsert({ key, value })
            .select()

        if (error) throw error

        return NextResponse.json(data[0])
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
