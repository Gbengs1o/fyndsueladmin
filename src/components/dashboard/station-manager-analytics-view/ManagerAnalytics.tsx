'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Clock, Zap, Activity, MapPin } from 'lucide-react';
import RevenueTrendChart from './RevenueTrendChart';
import ActivityHistory from './ActivityHistory';
import CapacityManager from './CapacityManager';
import AnalyticsHelp from './AnalyticsHelp';
import ReachStatCard from './ReachStatCard';
import VisitorsStatCard from './VisitorsStatCard';
import BusiestDayStatCard from './BusiestDayStatCard';

interface ManagerAnalyticsProps {
    stationId?: number;
}

export default function ManagerAnalytics({ stationId }: ManagerAnalyticsProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!stationId) {
            setIsLoading(false);
            return;
        }

        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Station Capacity
                const { data: stationInfo } = await supabase
                    .from('stations')
                    .select('max_daily_capacity')
                    .eq('id', stationId)
                    .single();

                const maxCapacity = stationInfo?.max_daily_capacity || 500;

                // 2. Fetch Activity Data (Last 14 Days)
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();

                const [
                    { data: analytics },
                    { data: reports },
                    { data: reviews },
                    { data: priceLogs },
                    { data: promos },
                    { count: favCount },
                    { data: favourites }
                ] = await Promise.all([
                    supabase.from('station_analytics').select('*').eq('station_id', stationId).order('date', { ascending: false }).limit(30),
                    supabase.from('price_reports').select('created_at, price, user_id').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
                    supabase.from('reviews').select('created_at, user_id').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
                    supabase.from('price_logs').select('created_at, new_price').eq('station_id', stationId).gte('created_at', fourteenDaysAgoStr),
                    supabase.from('station_promotions').select('views, clicks').eq('station_id', stationId),
                    supabase.from('favourite_stations').select('*', { count: 'exact', head: true }).eq('station_id', stationId),
                    supabase.from('favourite_stations').select('created_at, user_id').eq('station_id', stationId)
                ]);

                const totalFavourites = favCount || 0;

                // 3. Synthesize Analytics from Activity
                const dailyData: Record<string, { visits: number, interactions: number, views: number }> = {};
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    dailyData[d.toISOString().split('T')[0]] = { visits: 0, interactions: 0, views: 0 };
                }

                (analytics || []).forEach((a: any) => {
                    if (dailyData[a.date]) {
                        dailyData[a.date].visits = a.daily_visits || 0;
                        dailyData[a.date].interactions = Number(a.revenue) || 0; // Using revenue column as interactions equivalent in initial design
                        dailyData[a.date].views = a.profile_views || 0;
                    }
                });

                ([...(reports || []), ...(reviews || [])] as any[]).forEach((item: any) => {
                    const date = item.created_at.split('T')[0];
                    if (dailyData[date]) {
                        dailyData[date].visits += 1;
                        dailyData[date].views += 5;

                        if ('price' in item) {
                            dailyData[date].interactions += 1;
                        }
                    }
                });

                (priceLogs || []).forEach((log: any) => {
                    const date = log.created_at.split('T')[0];
                    if (dailyData[date]) {
                        dailyData[date].interactions += 1;
                        dailyData[date].visits += 1;
                    }
                });

                const sortedDates = Object.keys(dailyData).sort();
                const chartData = Object.entries(dailyData).map(([date, vals]) => ({
                    date,
                    visits: vals.visits,
                    interactions: vals.interactions,
                    views: vals.views
                })).sort((a, b) => a.date.localeCompare(b.date));

                const totalVisits = chartData.reduce((acc, curr) => acc + curr.visits, 0);
                const promoViews = (promos || []).reduce((acc: number, p: any) => acc + (p.views || 0), 0);
                const totalViews = Object.values(dailyData).reduce((acc, curr) => acc + curr.views, 0) + promoViews;

                const communityReach = totalViews + (reports?.length || 0) + totalFavourites;

                const busiestDayEntry = chartData.reduce((prev, current) =>
                    (current.visits > prev.visits) ? current : prev
                    , { visits: 0, date: sortedDates[0] || new Date().toISOString() });

                const busiestDayLabel = busiestDayEntry.visits > 0
                    ? new Date(busiestDayEntry.date).toLocaleDateString('en-US', { weekday: 'long' })
                    : 'N/A';

                const peakVisits = Math.max(...chartData.map(a => a.visits), 0);

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysAgoStr = sevenDaysAgo.toISOString();

                const recentInteractions = [
                    ...(reports || []),
                    ...(reviews || []),
                    ...(favourites || [])
                ].filter(item => item.created_at >= sevenDaysAgoStr);

                const historicalInteractions = [
                    ...(reports || []),
                    ...(reviews || []),
                    ...(favourites || [])
                ].filter(item => item.created_at < sevenDaysAgoStr);

                const currentUniqueDrivers = new Set((recentInteractions as any[]).map((i: any) => i.user_id));
                const historicalUniqueDrivers = new Set((historicalInteractions as any[]).map((i: any) => i.user_id));

                const newcomers = Array.from(currentUniqueDrivers).filter(id => !historicalUniqueDrivers.has(id)).length;

                const reachDetails = {
                    uniqueDrivers: currentUniqueDrivers.size,
                    newcomers: newcomers,
                    breakdown: {
                        views: totalViews,
                        reports: (reports || []).filter(r => r.created_at >= sevenDaysAgoStr).length,
                        favorites: totalFavourites,
                        reviews: (reviews || []).filter(r => r.created_at >= sevenDaysAgoStr).length
                    }
                };

                const currentWeekVisits = chartData.filter(d => d.date >= sevenDaysAgoStr).reduce((acc, d) => acc + d.visits, 0);
                const prevWeekVisits = chartData.filter(d => d.date < sevenDaysAgoStr).reduce((acc, d) => acc + d.visits, 0);
                const avgPerDay = Math.round(totalVisits / 14);
                const growth = prevWeekVisits > 0 ? Math.round(((currentWeekVisits - prevWeekVisits) / prevWeekVisits) * 100) : 0;

                const peakHour = busiestDayEntry.visits > 50 ? "08:00 AM - 10:00 AM" : "04:00 PM - 06:00 PM";
                const distribution = [
                    { period: 'Morning', volume: Math.round(peakVisits * 0.45) },
                    { period: 'Afternoon', volume: Math.round(peakVisits * 0.35) },
                    { period: 'Evening', volume: Math.round(peakVisits * 0.20) }
                ];

                const capacityUsage = maxCapacity > 0 ? Math.min(Math.round((peakVisits / maxCapacity) * 100), 100) : 0;
                const conversionEfficiency = totalViews > 0 ? Math.min(Math.round((totalVisits / totalViews) * 100), 100) : 0;

                const allActivities: any[] = [
                    ...(reports || []).map((r: any) => ({ type: 'report', created_at: r.created_at, description: 'New Driver Price Report' })),
                    ...(reviews || []).map((r: any) => ({ type: 'review', created_at: r.created_at, description: 'New Station Review' })),
                    ...(priceLogs || []).map((p: any) => ({ type: 'price_log', created_at: p.created_at, description: 'Base Price Update' }))
                ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setData({
                    maxCapacity,
                    chartData,
                    totalVisits,
                    avgPerDay,
                    growth,
                    capacityUsage,
                    conversionEfficiency,
                    busiestDayLabel,
                    peakVisits,
                    peakHour,
                    distribution,
                    communityReach,
                    totalFavourites,
                    reachDetails,
                    allActivities
                });
            } catch (error) {
                console.error("Error fetching station analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [stationId, supabase]);

    if (!stationId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl m-8">
                <MapPin size={48} className="opacity-20 mb-4" />
                <h3 className="text-xl font-bold">No Station Assigned</h3>
                <p className="text-muted-foreground mt-2">This manager is not currently linked to any station.</p>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">Gathering intelligence...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 bg-card rounded-3xl border shadow-sm">
                <div>
                    <h1 className="text-2xl font-black tracking-tight mt-0 mb-2">Traffic & Demand Analytics</h1>
                    <p className="text-muted-foreground m-0">In-depth behavioral analysis of this station's drivers.</p>
                </div>
                <div className="mt-4 md:mt-0 px-4 py-2 bg-primary/10 text-primary font-semibold text-sm rounded-full">
                    Last 7 Days
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                        <MapPin size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-muted-foreground m-0">Station Capacity Usage</h3>
                    <p className="text-3xl font-bold m-0 my-2 text-foreground">{data.capacityUsage}%</p>
                    <span
                        className="text-sm font-medium"
                        style={{ color: data.capacityUsage > 80 ? '#ef4444' : 'hsl(var(--primary))' }}
                    >
                        {data.capacityUsage > 80 ? 'Near peak limit' : 'Optimal operations'}
                    </span>
                </div>

                <VisitorsStatCard
                    totalVisits={data.totalVisits}
                    avgPerDay={data.avgPerDay}
                    growth={data.growth}
                    dailyBreakdown={data.chartData.slice(-7)}
                />

                <BusiestDayStatCard
                    busiestDayLabel={data.busiestDayLabel}
                    peakVisits={data.peakVisits}
                    peakHour={data.peakHour}
                    distribution={data.distribution}
                />

                <ReachStatCard
                    communityReach={data.communityReach}
                    totalFavourites={data.totalFavourites}
                    details={data.reachDetails}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm p-8 flex flex-col">
                    <div className="mb-6 flex space-x-3 items-center">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="m-0 text-lg font-bold">Community Interaction Trend</h2>
                            <p className="m-0 text-sm text-muted-foreground mt-1">Verified driver reports and app engagement.</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <RevenueTrendChart data={data.chartData} />
                    </div>
                </div>

                <div className="bg-card rounded-3xl border border-border shadow-sm p-8 flex flex-col">
                    <div className="mb-6 flex space-x-3 items-center">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="m-0 text-lg font-bold">Live Activity Feed</h2>
                            <p className="m-0 text-sm text-muted-foreground mt-1">Real-time engagement.</p>
                        </div>
                    </div>

                    <ActivityHistory activities={data.allActivities} />

                    <div className="mt-8 pt-8 border-t flex flex-col gap-6">
                        <CapacityManager
                            stationId={stationId}
                            initialCapacity={data.maxCapacity}
                            peakVisits={data.peakVisits}
                        />

                        <div className="bg-muted/30 p-5 rounded-2xl border border-border shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold">Conversion Efficiency</span>
                                <span className="font-bold">{data.conversionEfficiency}%</span>
                            </div>
                            <div className="h-2 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${data.conversionEfficiency}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                % of viewers who became verified interaction partners.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AnalyticsHelp />
        </div>
    );
}
