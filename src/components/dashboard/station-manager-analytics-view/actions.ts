'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function getStationAnalytics(stationId: number) {
    // 1. Fetch Station Information (including Capacity)
    const { data: stationInfo } = await supabase
        .from('stations')
        .select('max_daily_capacity')
        .eq('id', stationId)
        .single();

    // 2. Define Date Range
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();

    // 3. Batch Fetch All Analytics Components
    const [
        { data: analytics },
        { data: reports },
        { data: reviews },
        { data: priceLogs },
        { data: promos },
        { count: favCount },
        { data: favourites }
    ] = await Promise.all([
        supabase.from('station_analytics').select('*').eq('station_id', stationId).order('date', { ascending: false }).limit(30),
        supabase.from('price_reports').select('created_at, price, user_id').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
        supabase.from('reviews').select('created_at, user_id').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
        supabase.from('price_logs').select('created_at, new_price').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
        supabase.from('station_promotions').select('views, clicks').eq('station_id', stationId),
        supabase.from('favourite_stations').select('*', { count: 'exact', head: true }).eq('station_id', stationId),
        supabase.from('favourite_stations').select('created_at, user_id').eq('station_id', stationId)
    ]);

    return {
        stationInfo,
        analytics,
        reports,
        reviews,
        priceLogs,
        promos,
        favCount,
        favourites
    };
}

export async function updateStationCapacity(stationId: string | number, capacity: number) {
    const { error } = await supabase
        .from('stations')
        .update({ max_daily_capacity: capacity })
        .eq('id', stationId);

    if (error) throw error;
    return { success: true };
}
