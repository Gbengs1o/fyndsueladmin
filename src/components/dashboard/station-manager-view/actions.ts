'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function getOverviewData(managerId: string, stationId?: number) {
    let targetStationId = stationId;

    // 1. Resolve Station ID if not provided
    if (!targetStationId) {
        const { data: profile } = await supabase
            .from('manager_profiles')
            .select('station_id')
            .eq('id', managerId)
            .single();

        if (profile?.station_id) {
            targetStationId = profile.station_id;
        }
    }

    if (!targetStationId) {
        return null;
    }

    // 2. Fetch Station Information
    const { data: station } = await supabase
        .from('stations')
        .select('*')
        .eq('id', targetStationId)
        .single();

    // 3. Fetch Official Benchmarks
    const { data: officialPriceData } = await supabase
        .from('official_prices')
        .select('pms_price')
        .eq('state', station?.state || 'Oyo')
        .eq('brand', 'all')
        .maybeSingle();

    // 4. Fetch Nearby Stations (Market Context)
    const { data: nearby } = await supabase
        .from('stations')
        .select('id, name, brand, price_pms, latitude, longitude')
        .eq('state', station?.state || 'Oyo')
        .neq('id', targetStationId)
        .limit(10);

    // 5. Fetch Customer Feedback
    const { data: feedbacks } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('station_id', targetStationId)
        .order('created_at', { ascending: false })
        .limit(5);

    // 6. Fetch Crowd-Sourced Price Reports
    const { data: reports } = await supabase
        .from('price_reports')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('station_id', targetStationId)
        .order('created_at', { ascending: false })
        .limit(10);

    // 7. Fetch Active Campaign
    const now = new Date().toISOString();
    const { data: activePromotion } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('station_id', targetStationId)
        .eq('status', 'active')
        .gt('end_time', now)
        .maybeSingle();

    // 8. Fetch Core Analytics
    const { data: analytics } = await supabase
        .from('station_analytics')
        .select('daily_visits, date, profile_views')
        .eq('station_id', targetStationId)
        .order('date', { ascending: false })
        .limit(2);

    // 9. Fetch Driver Engagement Metrics
    const { count: favCount } = await supabase
        .from('favourite_stations')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', targetStationId);

    // 10. Fetch Pricing Trends
    const { data: priceHistory } = await supabase
        .from('price_logs')
        .select('new_price, created_at')
        .eq('station_id', targetStationId)
        .eq('fuel_type', 'PMS')
        .order('created_at', { ascending: true })
        .limit(7);

    // 11. Fetch Peak Demand Indicators
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: reportTimestamps } = await supabase
        .from('price_reports')
        .select('created_at')
        .eq('station_id', targetStationId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(1000);

    return {
        station,
        officialPriceData,
        nearby,
        feedbacks,
        reports,
        activePromotion,
        analytics,
        favCount,
        priceHistory,
        reportTimestamps,
        targetStationId
    };
}

export async function toggleStockStatusAdmin(stationId: number, isOutOfStock: boolean, managerId: string) {
    const supabaseServer = await createSupabaseServer();
    const { data: { user } } = await supabaseServer.auth.getUser();

    const { error } = await supabase
        .from('stations')
        .update({ is_out_of_stock: isOutOfStock })
        .eq('id', stationId);

    if (error) throw error;

    // Audit log for Admin action
    if (user) {
        await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            action_type: isOutOfStock ? 'UPDATE_STATION' : 'UPDATE_STATION',
            target_table: 'stations',
            target_id: managerId,
            details: { is_out_of_stock: isOutOfStock, stationId, note: isOutOfStock ? 'Marked Offline' : 'Marked Online' }
        });
    }

    revalidatePath(`/dashboard/managers/${managerId}`);
    return { success: true };
}

export async function updateSinglePriceAdmin(fuelType: string, newPrice: number, stationId: number, managerId: string) {
    const supabaseServer = await createSupabaseServer();
    const { data: { user } } = await supabaseServer.auth.getUser();

    const column = `price_${fuelType.toLowerCase()}`;
    const { error } = await supabase
        .from('stations')
        .update({ [column]: newPrice })
        .eq('id', stationId);

    if (error) throw error;

    // Log the change for the manager's timeline
    await supabase.from('price_logs').insert([{
        station_id: stationId,
        fuel_type: fuelType.toLowerCase(),
        new_price: newPrice,
        updated_by: managerId
    }]);

    // Audit log for Admin action
    if (user) {
        await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            action_type: 'PRICE_UPDATE',
            target_table: 'stations',
            target_id: managerId,
            details: { [fuelType.toLowerCase()]: newPrice, stationId }
        });
    }

    revalidatePath(`/dashboard/managers/${managerId}`);
    return { success: true };
}
