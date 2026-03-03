'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function getComplaints() {
    // 1. Fetch complaints and their stations
    const { data: complaints, error } = await supabase
        .from('station_complaints')
        .select(`
            id,
            complaint,
            created_at,
            user_id,
            station_snapshot,
            stations!inner (
                name,
                brand
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching complaints:', error);
        throw new Error('Failed to fetch complaints');
    }

    if (!complaints || complaints.length === 0) return [];

    // 2. Fetch profiles for those user_ids to avoid join errors if FK is missing
    const userIds = complaints.map(c => c.user_id).filter(id => !!id);

    if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

        if (!profileError && profiles) {
            // Map profiles to complaints
            return complaints.map(complaint => ({
                ...complaint,
                profiles: profiles.find(p => p.id === complaint.user_id) || { full_name: 'Unknown User' }
            }));
        }
    }

    return complaints;
}

export async function dismissComplaint(id: string) {
    const { error } = await supabase
        .from('station_complaints')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error dismissing complaint:', error);
        throw new Error('Failed to dismiss complaint');
    }

    revalidatePath('/dashboard/complaints');
    return { success: true };
}

export async function getComplaintDetails(id: string) {
    const { data: complaint, error } = await supabase
        .from('station_complaints')
        .select(`
            *,
            stations (
                name,
                brand
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching complaint details:', error);
        throw new Error('Failed to fetch complaint details');
    }

    if (complaint && complaint.user_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', complaint.user_id)
            .single();

        return {
            ...complaint,
            profiles: profile || { full_name: 'Unknown User' }
        };
    }

    return complaint;
}
