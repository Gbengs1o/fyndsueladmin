'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function updateStationPricesAdmin(formData: FormData, stationId: number, managerId: string) {
    const supabaseServer = await createSupabaseServer();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const pms = parseFloat(formData.get('pms') as string);
    const ago = parseFloat(formData.get('ago') as string);
    const dpk = parseFloat(formData.get('dpk') as string);

    // Fetch old prices for logging
    const { data: oldStation } = await supabase
        .from('stations')
        .select('price_pms, price_ago, price_dpk')
        .eq('id', stationId)
        .single();

    // Update station
    const { error: updateError } = await supabase
        .from('stations')
        .update({
            price_pms: pms,
            price_ago: ago,
            price_dpk: dpk
        })
        .eq('id', stationId);

    if (updateError) throw updateError;

    // Log changes. We'll mark 'updated_by' as the manager so it shows on their timeline,
    // or log it as admin. The schema expects 'manager_id' in updated_by, so we use managerId.
    // For a strict audit trail, an 'admin_audit_logs' should also be recorded.
    const logs = [];
    if (oldStation?.price_pms !== pms) {
        logs.push({ station_id: stationId, fuel_type: 'pms', old_price: oldStation?.price_pms, new_price: pms, updated_by: managerId });
    }
    if (oldStation?.price_ago !== ago) {
        logs.push({ station_id: stationId, fuel_type: 'ago', old_price: oldStation?.price_ago, new_price: ago, updated_by: managerId });
    }
    if (oldStation?.price_dpk !== dpk) {
        logs.push({ station_id: stationId, fuel_type: 'dpk', old_price: oldStation?.price_dpk, new_price: dpk, updated_by: managerId });
    }

    if (logs.length > 0) {
        await supabase.from('price_logs').insert(logs);

        // Audit log for Admin action
        await supabase.from('admin_audit_logs').insert({
            admin_id: user.id,
            action_type: 'PRICE_UPDATE',
            target_table: 'stations',
            target_id: managerId,
            details: { pms, ago, dpk, oldPrices: oldStation, stationId }
        });
    }

    revalidatePath(`/dashboard/managers/${managerId}`);
    return { success: true };
}

export async function getPricingData(stationId: number, state: string, latitude: number, longitude: number) {
    // 1. Fetch Official State Price
    const { data: officialPriceData } = await supabase
        .from('official_prices')
        .select('pms_price')
        .eq('state', state)
        .eq('brand', 'all')
        .maybeSingle();

    const statePrice = parseFloat(officialPriceData?.pms_price as any) || 650;

    // 2. Fetch Nearby Stations
    const { data: nearby } = await supabase
        .from('stations')
        .select('id, name, brand, price_pms, latitude, longitude')
        .eq('state', state)
        .neq('id', stationId)
        .limit(100);

    // 3. Fetch Price History Logs
    const { data: allHistoryLogs } = await supabase
        .from('price_logs')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false })
        .limit(50);

    return {
        statePrice,
        nearby,
        allHistoryLogs: allHistoryLogs || []
    };
}

export async function getStationDetailsAdmin(stationId: number) {
    const { data, error } = await supabase
        .from('stations')
        .select(`
            *,
            manager:manager_profiles (
                full_name,
                phone_number
            )
        `)
        .eq('id', stationId)
        .single();

    if (error) throw error;
    return data;
}
