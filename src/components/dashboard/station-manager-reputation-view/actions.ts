'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function respondToReview(reviewId: string, response: string) {
    const { error } = await supabase
        .from('reviews')
        .update({
            response: response,
            responded_at: new Date().toISOString()
        })
        .eq('id', reviewId);

    if (error) throw error;

    revalidatePath('/dashboard/managers/[id]', 'page');

    return { success: true };
}

export async function respondToReport(reportId: string, response: string) {
    const { error } = await supabase
        .from('price_reports')
        .update({
            response: response,
            responded_at: new Date().toISOString()
        })
        .eq('id', reportId);

    if (error) throw error;

    revalidatePath('/dashboard/managers/[id]', 'page');

    return { success: true };
}

export async function getScoutProfile(userId: string) {
    // 1. Fetch Basic Identity
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Fetch Total Points (Reputation)
    const { data: totalPoints } = await supabase
        .from('point_transactions')
        .select('amount.sum()')
        .eq('user_id', userId)
        .single();

    // 3. Fetch Total Reports Count
    const { count: totalReports } = await supabase
        .from('price_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    // 4. Fetch Recent Activity (Last 10 reports)
    const { data: recentReports } = await supabase
        .from('price_reports')
        .select('*, stations(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    return {
        profile,
        reputation: (totalPoints as any)?.sum || 0,
        totalReports: totalReports || 0,
        recentReports: (recentReports || []).map(r => ({
            ...r,
            station_name: (r as any).stations?.name || 'Unknown Station'
        }))
    };
}

export async function getReputationData(stationId: number) {
    // 1. Fetch Station Info
    const { data: station } = await supabase
        .from('stations')
        .select('*')
        .eq('id', stationId)
        .single();

    // 2. Fetch Aggregated Metrics
    const { data: reviews } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

    const { data: pReports, count: reportsCount } = await supabase
        .from('price_reports')
        .select('*, profiles:user_id(full_name, avatar_url)', { count: 'exact' })
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

    const { count: verificationsCount } = await supabase
        .from('price_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId);

    return {
        station,
        reviews,
        pReports,
        reportsCount,
        verificationsCount
    };
}
