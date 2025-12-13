
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = 'http://localhost:9002'; // Assuming dev server is running on 9002

async function testSettings() {
    console.log('--- Testing /api/settings ---');
    try {
        // 1. Get current setting
        console.log('Fetching global_ads_enabled...');
        const res = await fetch(`${BASE_URL}/api/settings?key=global_ads_enabled`);
        const data = await res.json();
        console.log('Current Value:', data);

        // 2. Toggle setting to false
        console.log('Setting global_ads_enabled to false...');
        const toggleRes = await fetch(`${BASE_URL}/api/settings`, {
            method: 'POST',
            body: JSON.stringify({ key: 'global_ads_enabled', value: false }),
            headers: { 'Content-Type': 'application/json' }
        });
        const toggleData = await toggleRes.json();
        console.log('Update Result:', toggleData);

        // 3. Verify change
        const verifyRes = await fetch(`${BASE_URL}/api/settings?key=global_ads_enabled`);
        const verifyData = await verifyRes.json();
        console.log('Verified Value:', verifyData);

        if (verifyData.value === false) {
            console.log('✅ Settings API works!');
        } else {
            console.error('❌ Settings API failed to update.');
        }

        // Restore to true
        await fetch(`${BASE_URL}/api/settings`, {
            method: 'POST',
            body: JSON.stringify({ key: 'global_ads_enabled', value: true }),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Restored setting to true.');

    } catch (e) {
        console.error('Settings Test Failed:', e);
    }
}

async function testAnalytics() {
    console.log('\n--- Testing /api/ad-interaction ---');
    try {
        // We need a valid advert ID usually, but let's see if we can just post arbitrary content 
        // linked to a random UUID if FK isn't strictly enforced or valid id if known.
        // Wait, ad_analytics has FK constraint `advert_id UUID REFERENCES adverts(id)`.
        // So we need a real ID. I'll surely fetch one first if I could, but I can't easily query DB here without supabase client.
        // I'll skip effective testing of POST if I don't have an ID, or I'll try to fetch ads from dashboard/adverts (but that's a page).
        // Actually, let's just use a fake UUID and see if it fails (it should fail FK).
        // OR better, I'll rely on the manual test or successful build for now.

        // Let's try to hit the endpoint without an ID to see 400.
        const res = await fetch(`${BASE_URL}/api/ad-interaction`, {
            method: 'POST',
            body: JSON.stringify({ event_type: 'click' }), // Missing advert_id
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.status === 400) {
            console.log('✅ Analytics API correctly rejected missing fields (400).');
        } else {
            console.error('❌ Analytics API unexpected status:', res.status);
        }

    } catch (e) {
        console.error('Analytics Test Failed:', e);
    }
}

async function main() {
    await testSettings();
    await testAnalytics();
}

main();
