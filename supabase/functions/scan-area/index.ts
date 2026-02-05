import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { lat, lon } = await req.json();

        if (!lat || !lon) {
            throw new Error('Missing latitude or longitude');
        }

        // 1. Calculate Zone ID (approx 1.1km grid)
        const zone_id = `${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Check Cache
        const { data: logData, error: logError } = await supabaseClient
            .from('api_scan_logs')
            .select('last_scanned_at')
            .eq('zone_id', zone_id)
            .single();

        if (logData) {
            const lastScanned = new Date(logData.last_scanned_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (lastScanned > thirtyDaysAgo) {
                console.log(`Zone ${zone_id} is cached.`);
                return new Response(
                    JSON.stringify({ status: 'cached', message: 'No missing stations found.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // 3. Call Google Places API
        console.log(`Scanning zone ${zone_id} via Google Places...`);
        const apiKey = Deno.env.get('GOOGLE_PLACES_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_PLACES_KEY is not set');
        }

        const radius = 2000; // 2km
        const type = 'gas_station';
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&key=${apiKey}`;

        const googleResponse = await fetch(url);
        const googleData = await googleResponse.json();

        if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
            throw new Error(`Google API Error: ${googleData.status} - ${googleData.error_message}`);
        }

        const results = googleData.results || [];
        console.log(`Found ${results.length} stations.`);

        // 4. Map Results
        const stations = results.map((place: any) => ({
            name: place.name,
            address: place.vicinity,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            google_place_id: place.place_id,
            is_verified: true, // Google data is trusted
            created_by_user: false,
            origin_type: 'offline_cache', // Justify storage
            // Add other fields if your schema requires them, e.g. fuel_type defaults
        }));

        // 5. Bulk Upsert Stations
        if (stations.length > 0) {
            const { error: upsertError } = await supabaseClient
                .from('stations')
                .upsert(stations, { onConflict: 'google_place_id', ignoreDuplicates: true });

            if (upsertError) {
                console.error('Error upserting stations:', upsertError);
                // We continue even if upsert fails, to update the log
            }
        }

        // 6. Update Log
        const { error: logUpdateError } = await supabaseClient
            .from('api_scan_logs')
            .upsert({
                zone_id: zone_id,
                last_scanned_at: new Date().toISOString(),
            });

        if (logUpdateError) {
            console.error('Error updating log:', logUpdateError);
        }

        return new Response(
            JSON.stringify({
                status: 'scanned',
                count: stations.length,
                message: `Found ${stations.length} stations. Saved for offline use.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
