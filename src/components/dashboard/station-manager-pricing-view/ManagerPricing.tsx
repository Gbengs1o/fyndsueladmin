'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import styles from '../station-manager-view/ManagerOverview.module.css';
import PriceUpdater from './PriceUpdater';
import CompetitorHeatmap from './CompetitorHeatmap';
import PriceHistoryChart from './PriceHistoryChart';
import PriceHistoryTable from './PriceHistoryTable';
import { LoadingLogo } from '@/components/loading-logo';

interface ManagerPricingProps {
    stationId: number;
    managerId: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    currentPrices: {
        pms: number;
        ago: number;
        dpk: number;
    };
}

export default function ManagerPricing({
    stationId,
    managerId,
    state = 'Oyo',
    latitude = 7.404818,
    longitude = 3.810341,
    currentPrices
}: ManagerPricingProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        statePrice: number;
        formattedCompetitors: any[];
        allHistoryLogs: any[];
        pmsHistory: any[];
    } | null>(null);

    useEffect(() => {
        async function fetchPricingData() {
            setLoading(true);

            // 1. Fetch Official State Price (Fallback)
            const { data: officialPriceData } = await supabase
                .from('official_prices')
                .select('pms_price')
                .eq('state', state)
                .eq('brand', 'all')
                .single();

            const statePrice = parseFloat(officialPriceData?.pms_price as any) || 650;

            // 2. Fetch Nearest Competitors
            const { data: nearby } = await supabase
                .from('stations')
                .select('id, name, brand, price_pms, latitude, longitude')
                .eq('state', state)
                .neq('id', stationId)
                .limit(100);

            const formattedCompetitors = (nearby || [])
                .map(c => {
                    const lat1 = latitude;
                    const lon1 = longitude;
                    const lat2 = c.latitude || 0;
                    const lon2 = c.longitude || 0;

                    const R = 6371;
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

                    return { ...c, distanceValue: dist, distance: `${dist.toFixed(1)}km` };
                })
                .sort((a, b: any) => a.distanceValue - b.distanceValue)
                .slice(0, 5)
                .map(c => ({
                    ...c,
                    price_pms: parseFloat(c.price_pms as any) || statePrice
                }));

            // 3. Fetch Price History Logs
            const { data: allHistoryLogs } = await supabase
                .from('price_logs')
                .select('*')
                .eq('station_id', stationId)
                .order('created_at', { ascending: false })
                .limit(50);

            const pmsHistory = allHistoryLogs?.filter(l => l.fuel_type === 'pms').reverse() || [];

            setData({
                statePrice,
                formattedCompetitors,
                allHistoryLogs: allHistoryLogs || [],
                pmsHistory
            });
            setLoading(false);
        }

        fetchPricingData();
    }, [stationId, latitude, longitude, state]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoadingLogo size={80} />
                <p className="mt-4 text-muted-foreground animate-pulse font-medium tracking-wide">Gathering Station Intelligence...</p>
            </div>
        );
    }

    const { statePrice, formattedCompetitors, allHistoryLogs, pmsHistory } = data;

    const mockChartData = [
        { date: '2026-01-15', price: 620 },
        { date: '2026-01-20', price: 645 },
        { date: '2026-01-25', price: 630 },
        { date: '2026-02-01', price: 655 },
        { date: '2026-02-08', price: 640 },
        { date: '2026-02-15', price: 660 },
        { date: '2026-02-20', price: currentPrices.pms || 650 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <PriceUpdater
                        currentPrices={currentPrices}
                        stationId={stationId}
                        managerId={managerId}
                    />

                    <PriceHistoryChart
                        logs={pmsHistory.length ? pmsHistory.map(l => ({ date: l.created_at, price: l.new_price })) : mockChartData}
                        stateAverage={statePrice}
                    />

                    <PriceHistoryTable logs={allHistoryLogs} />
                </div>

                <div className="lg:col-span-1">
                    <CompetitorHeatmap
                        competitors={formattedCompetitors as any}
                        yourPrice={currentPrices.pms || 1}
                    />
                </div>
            </div>
        </div>
    );
}
