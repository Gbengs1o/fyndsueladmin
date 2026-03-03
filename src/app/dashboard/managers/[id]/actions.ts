'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function getManagerFullProfile(id: string) {
    // 1. Fetch Manager Profile with Station and related data
    const { data: managerData, error: managerError } = await supabase
        .from('manager_profiles')
        .select(`
            *,
            stations (
                *,
                reviews (*, profiles:user_id (full_name, avatar_url)),
                flagged_stations (*, profiles:user_id (full_name, avatar_url))
            ),
            profiles:id (
                email,
                avatar_url,
                is_banned,
                created_at,
                point_transactions (*),
                price_reports!user_id (*)
            )
        `)
        .eq('id', id)
        .single();

    if (managerError) throw managerError;

    // 2. Fetch Intelligence Data
    const { data: priceLogs } = await supabase
        .from('price_logs')
        .select('*')
        .eq('updated_by', id)
        .order('created_at', { ascending: false });

    const { data: auditLogs } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('target_id', id)
        .order('created_at', { ascending: false });

    return {
        managerData,
        priceLogs: priceLogs || [],
        auditLogs: auditLogs || []
    };
}

export async function toggleManagerBan(id: string, currentBannedStatus: boolean) {
    const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBannedStatus })
        .eq('id', id);

    if (error) throw error;

    revalidatePath(`/dashboard/managers/${id}`);
    return { success: true, newStatus: !currentBannedStatus };
}
