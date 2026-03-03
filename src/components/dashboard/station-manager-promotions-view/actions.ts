'use server';

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

// Admin gets manager's wallet details by managerId
export async function getWalletInfo(managerId: string) {
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', managerId)
        .single();

    if (walletError && walletError.code !== 'PGRST116') throw walletError;

    if (!wallet) return { wallet: null, transactions: [] };

    const { data: transactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', managerId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (transError) throw transError;

    return { wallet, transactions };
}

export async function adminCreditWallet(managerId: string, amount: number) {
    // Check if wallet exists
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', managerId)
        .single();

    let currentBalance = 0;
    if (walletError && walletError.code === 'PGRST116') {
        // Create wallet if it doesn't exist
        const { error: insertError } = await supabase
            .from('wallets')
            .insert({ id: managerId, balance: amount });
        if (insertError) throw insertError;
        currentBalance = amount;
    } else if (walletError) {
        throw walletError;
    } else {
        currentBalance = wallet.balance + amount;
        const { error: updateError } = await supabase
            .from('wallets')
            .update({ balance: currentBalance })
            .eq('id', managerId);
        if (updateError) throw updateError;
    }

    const { error: transError } = await supabase.from('wallet_transactions').insert({
        wallet_id: managerId,
        amount: amount,
        type: amount > 0 ? 'deposit' : 'spending',
        metadata: { method: 'admin_credit' }
    });

    if (transError) throw transError;

    revalidatePath(`/dashboard/managers/${managerId}`);
    return { success: true };
}

export async function getActivePromotion(stationId: number) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('station_id', stationId)
        .eq('status', 'active')
        .gt('end_time', now)
        .maybeSingle();

    if (error) {
        console.error('Error fetching active promotion:', error);
        return null;
    }
    return data;
}

export async function getCampaignHistory(stationId: number) {
    const { data, error } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching campaign history:', error);
        return [];
    }
    return data;
}

export async function getPromotionTiers() {
    const { data, error } = await supabase
        .from('promotion_tiers')
        .select('*')
        .order('price', { ascending: true });

    if (error) throw error;
    return data;
}

export async function adminActivatePromotion(managerId: string, stationId: number, tierId: string) {
    // 1. Fetch Tier details
    const { data: tier, error: tierError } = await supabase
        .from('promotion_tiers')
        .select('*')
        .eq('id', tierId)
        .single();

    if (tierError) throw tierError;

    // 2. Check Wallet Balance
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', managerId)
        .single();

    if (walletError) throw walletError;
    if (wallet.balance < tier.price) {
        throw new Error('Manager has insufficient funds in wallet');
    }

    // 3. Execution (Transaction)
    const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - tier.price })
        .eq('id', managerId);

    if (deductError) throw deductError;

    // Record the spending
    await supabase.from('wallet_transactions').insert({
        wallet_id: managerId,
        amount: -tier.price,
        type: 'spending',
        metadata: { promotion_tier: tier.name, station_id: stationId, activated_by: 'admin' }
    });

    // Activate the promotion
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + tier.duration_hours);

    const { error: promoError } = await supabase.rpc('create_active_promotion', {
        p_station_id: stationId,
        p_tier_id: tierId,
        p_user_id: managerId, // Treat as manager making the request
        p_end_time: endTime.toISOString()
    });

    if (promoError) throw promoError;

    revalidatePath(`/dashboard/managers/${managerId}`);
    return { success: true };
}

export async function getCampaignDetailsAdmin(campaignId: string) {
    const { data, error } = await supabase
        .from('station_promotions')
        .select('*, tier:tier_id(*)')
        .eq('id', campaignId)
        .single();

    if (error) {
        console.error('Error fetching campaign details:', error);
        return null;
    }
    return data;
}

export async function getPromotionClickEventsAdmin(campaignId: string) {
    const { data, error } = await supabase
        .from('promotion_clicks')
        .select('*')
        .eq('promotion_id', campaignId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching promotion click events:', error);
        return [];
    }
    return data;
}
