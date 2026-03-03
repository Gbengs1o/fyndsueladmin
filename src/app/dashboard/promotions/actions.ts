'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export interface PromotionTier {
    id: string;
    name: string;
    price: number;
    description: string;
    duration_hours: number;
    features: string[];
    created_at?: string;
}

export async function getPromotionTiers() {
    const { data, error } = await supabase
        .from('promotion_tiers')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching promotion tiers:', error);
        throw new Error('Failed to fetch promotion tiers');
    }
    return data as PromotionTier[];
}

export async function updatePromotionTier(id: string, data: Partial<PromotionTier>) {
    const { error } = await supabase
        .from('promotion_tiers')
        .update(data)
        .eq('id', id);

    if (error) {
        console.error('Error updating promotion tier:', error);
        throw new Error('Failed to update promotion tier');
    }

    revalidatePath('/dashboard/promotions');
    // Also revalidate managers promotions view as they see these prices
    revalidatePath('/dashboard/managers');
    return { success: true };
}

export async function createPromotionTier(data: Omit<PromotionTier, 'id' | 'created_at'>) {
    const { error } = await supabase
        .from('promotion_tiers')
        .insert(data);

    if (error) {
        console.error('Error creating promotion tier:', error);
        throw new Error('Failed to create promotion tier');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true };
}

export async function deletePromotionTier(id: string) {
    const { error } = await supabase
        .from('promotion_tiers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting promotion tier:', error);
        throw new Error('Failed to delete promotion tier');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true };
}
