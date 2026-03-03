'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function updateStationPricesAdmin(formData: FormData, stationId: number, managerId: string) {
    const { data: { user } } = await supabase.auth.getUser();
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
            price_dpk: dpk,
            updated_at: new Date().toISOString()
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

export async function getStationDetailsAdmin(stationId: number) {
    const { data: station, error: stationError } = await supabase
        .from('stations')
        .select('*')
        .eq('id', stationId)
        .single();

    if (stationError) throw stationError;

    // Fetch manager if exists
    const { data: manager } = await supabase
        .from('manager_profiles')
        .select('full_name, phone_number')
        .eq('station_id', stationId)
        .single();

    return {
        ...station,
        manager: manager || null
    };
}
