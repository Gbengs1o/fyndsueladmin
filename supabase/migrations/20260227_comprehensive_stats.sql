-- Migration: Unified Dashboard Stats RPC
-- Description: Consolidates multiple count queries into a single RPC call for performance.

CREATE OR REPLACE FUNCTION get_comprehensive_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalStations', (SELECT count(*) FROM stations),
        'activeUsers', (SELECT count(*) FROM profiles),
        'totalSubmissions', (SELECT count(*) FROM price_reports),
        'pendingSuggestions', (SELECT count(*) FROM suggested_fuel_stations WHERE status = 'pending'),
        'totalFlags', (SELECT count(*) FROM flagged_stations),
        'verifiedManagers', (SELECT count(*) FROM manager_profiles WHERE verification_status = 'verified'),
        'gamification', (SELECT get_gamification_dashboard_stats())
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
