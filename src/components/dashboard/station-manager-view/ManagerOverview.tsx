'use client';

import { supabase } from '@/lib/supabase';
import styles from './ManagerOverview.module.css';
import {
    TrendingUp,
    Users,
    Droplet,
    Activity,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';
import CompetitorWatch from './CompetitorWatch';
import FeedbackSnapshot from './FeedbackSnapshot';
import StockOutToggle from './StockOutToggle';
import MarketTrendChart from './MarketTrendChart';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import QuickPriceAction from './QuickPriceAction';
import SmartRecommendations from './SmartRecommendations';
import DashboardEducation from './DashboardEducation';
import ActivePromotionCard from './ActivePromotionCard';
import { LoadingLogo } from '@/components/loading-logo';

interface ManagerOverviewProps {
    managerId: string;
    stationId?: number;
}

export default function ManagerOverview({ managerId, stationId }: ManagerOverviewProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEduMinimized, setIsEduMinimized] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!managerId) return;

            let targetStationId = stationId;

            // If stationId not provided, fetch it from manager_profiles
            if (!targetStationId) {
                const { data: profile } = await supabase
                    .from('manager_profiles')
                    .select('station_id')
                    .eq('id', managerId)
                    .single();

                if (profile?.station_id) {
                    targetStationId = profile.station_id;
                }
            }

            if (!targetStationId) {
                setLoading(false);
                return;
            }

            // 1. Fetch Station Info
            const { data: station } = await supabase
                .from('stations')
                .select('*')
                .eq('id', targetStationId)
                .single();

            // 1b. Fetch Official State Price (Fallback)
            const { data: officialPriceData } = await supabase
                .from('official_prices')
                .select('pms_price')
                .eq('state', station?.state || 'Oyo')
                .eq('brand', 'all')
                .maybeSingle();

            const statePrice = parseFloat(officialPriceData?.pms_price as any) || 950;

            // 2. Fetch Nearest 3 Competitors
            const userLat = station?.latitude || 7.404818;
            const userLon = station?.longitude || 3.810341;

            const { data: nearby } = await supabase
                .from('stations')
                .select('id, name, brand, price_pms, latitude, longitude')
                .eq('state', station?.state || 'Oyo')
                .neq('id', station?.id)
                .limit(10);

            const formattedCompetitors = (nearby || [])
                .map(c => {
                    const lat1 = userLat;
                    const lon1 = userLon;
                    const lat2 = c.latitude || 0;
                    const lon2 = c.longitude || 0;
                    const R = 6371; // km
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
                    return { ...c, distanceValue: dist, distance: `${dist.toFixed(1)}km` };
                })
                .sort((a, b) => a.distanceValue - b.distanceValue)
                .slice(0, 3)
                .map(c => ({
                    ...c,
                    price_pms: parseFloat(c.price_pms as any) || statePrice
                }));

            // 3. Fetch Recent Feedback with User Profile
            const { data: feedbacks } = await supabase
                .from('reviews')
                .select('*, profiles:user_id(full_name, avatar_url)')
                .eq('station_id', station?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            // 4. Fetch User Reports (Ground Truth) with Profiles
            const { data: reports } = await supabase
                .from('price_reports')
                .select('*, profiles:user_id(full_name, avatar_url)')
                .eq('station_id', station?.id)
                .order('created_at', { ascending: false })
                .limit(10);

            // Fetch Active Promotion
            const now = new Date().toISOString();
            const { data: activePromotion } = await supabase
                .from('station_promotions')
                .select('*, tier:tier_id(*)')
                .eq('station_id', targetStationId)
                .eq('status', 'active')
                .gt('end_time', now)
                .maybeSingle();

            // 5. Fetch Analytics (Daily Visits)
            const { data: analytics } = await supabase
                .from('station_analytics')
                .select('daily_visits, date, profile_views')
                .eq('station_id', station?.id)
                .order('date', { ascending: false })
                .limit(2);

            let todayVisits = analytics?.[0]?.daily_visits || 0;
            let yesterdayVisits = analytics?.[1]?.daily_visits || 0;

            const nowTime = new Date();
            const startOfToday = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate()).toISOString();

            if (todayVisits === 0) {
                const { count: reportsToday } = await supabase
                    .from('price_reports')
                    .select('*', { count: 'exact', head: true })
                    .eq('station_id', station?.id)
                    .gte('created_at', startOfToday);

                todayVisits = reportsToday || 0;

                if (activePromotion?.clicks) {
                    todayVisits += Math.ceil(activePromotion.clicks / 5);
                }
            }

            // 5b. Fetch Favourites
            const { count: favCount } = await supabase
                .from('favourite_stations')
                .select('*', { count: 'exact', head: true })
                .eq('station_id', station?.id);

            const totalFavourites = favCount || 0;

            const visitGrowth = yesterdayVisits > 0
                ? ((todayVisits - yesterdayVisits) / yesterdayVisits) * 100
                : (todayVisits > 0 ? 100 : 0);

            // 6. Fetch Price History for Chart
            const { data: priceHistory } = await supabase
                .from('price_logs')
                .select('new_price, created_at')
                .eq('station_id', station?.id)
                .eq('fuel_type', 'PMS')
                .order('created_at', { ascending: true })
                .limit(7);

            const validCompetitors = nearby?.filter(c => c.price_pms > 0) || [];
            const realMarketAvg = validCompetitors.length > 0
                ? validCompetitors.reduce((acc, c) => acc + (c.price_pms || 0), 0) / validCompetitors.length
                : statePrice;

            const priceDiff = (station?.price_pms || 0) - realMarketAvg;

            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const trendData = Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dayName = days[date.getDay()];
                const historicPrice = priceHistory?.find(p => new Date(p.created_at).getDate() === date.getDate())?.new_price
                    || station?.price_pms
                    || 640;

                return {
                    day: dayName,
                    yourPrice: Number(historicPrice),
                    marketAvg: Math.round(realMarketAvg)
                };
            });

            const analyticsData = analytics as any[] | null;
            const todayAnalytics = analyticsData?.[0];
            const historicalViews = todayAnalytics?.profile_views || analyticsData?.[1]?.profile_views || 0;
            const displayViews = historicalViews + (activePromotion?.views || 0);

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data: reportTimestamps } = await supabase
                .from('price_reports')
                .select('created_at')
                .eq('station_id', station?.id)
                .gte('created_at', sevenDaysAgo.toISOString())
                .limit(1000);

            const hourCounts: Record<number, number> = {};
            (reportTimestamps || []).forEach(r => {
                const hour = new Date(r.created_at).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });

            const peakHour24 = Object.keys(hourCounts).length > 0
                ? Object.entries(hourCounts).reduce((a: any, b: any) => a[1] > b[1] ? a : b)[0]
                : null;

            const peakHourLabel = peakHour24
                ? `${Number(peakHour24) % 12 || 12}${Number(peakHour24) >= 12 ? 'PM' : 'AM'}`
                : '4PM';

            setData({
                station,
                formattedCompetitors,
                feedbacks,
                reports,
                todayVisits,
                visitGrowth,
                priceDiff,
                trendData,
                displayViews,
                peakHourLabel,
                activePromotion,
                statePrice,
                totalFavourites,
                communityReach: displayViews + (reports?.length || 0) + totalFavourites
            });
            setLoading(false);
        }
        fetchData();
    }, [managerId, stationId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <LoadingLogo size={80} />
            <p className="mt-4 text-muted-foreground animate-pulse font-medium tracking-wide">Gathering Station Intelligence...</p>
        </div>
    );

    if (!data || !data.station) return (
        <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
            <Info size={48} className="mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Station Assigned</h3>
            <p>This manager does not have an assigned fuel station to monitor.</p>
        </div>
    );

    const {
        station,
        formattedCompetitors,
        feedbacks,
        reports,
        todayVisits,
        visitGrowth,
        priceDiff,
        trendData,
        displayViews,
        peakHourLabel,
        activePromotion,
        statePrice,
        communityReach,
        totalFavourites
    } = data;

    const containerVars = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div initial="hidden" animate="show" variants={containerVars} className={`${styles.dashboard} p-0`}>
            <div className={styles.mainContent} style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>

                {/* Left Column: Core Analytics & Charts */}
                <div className="flex flex-col gap-6">

                    {/* Minimizable Education Banner */}
                    <motion.div variants={itemVars} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                        <div
                            onClick={() => setIsEduMinimized(!isEduMinimized)}
                            className="flex justify-between items-center p-4 cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors"
                        >
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <Info size={18} className="text-primary" />
                                Station Growth Tips & Education
                            </div>
                            <button className="bg-transparent border-none cursor-pointer flex items-center text-muted-foreground">
                                {isEduMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                            </button>
                        </div>
                        <AnimatePresence>
                            {!isEduMinimized && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                >
                                    <div className="p-4 border-t border-border">
                                        <DashboardEducation />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Top KPI Stats Grid */}
                    <div className={styles.statsGrid}>
                        <motion.div variants={itemVars} className={styles.statCard} whileHover={{ y: -5 }}>
                            <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)' }}>
                                <TrendingUp size={24} />
                            </div>
                            <div className={styles.statLabel}>Market Position</div>
                            <div className={styles.statValue}>{priceDiff <= 0 ? 'Competitive' : 'Above Avg'}</div>
                            <div className={styles.statChange} style={{ color: priceDiff <= 0 ? '#22c55e' : '#ef4444' }}>
                                {priceDiff <= 0 ? `₦${Math.abs(Math.round(priceDiff))} below` : `₦${Math.round(priceDiff)} above`} market avg
                            </div>
                        </motion.div>

                        <motion.div variants={itemVars} whileHover={{ y: -5 }}>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                                    <Users size={24} />
                                </div>
                                <div className={styles.statLabel}>Daily Customers</div>
                                <div className={styles.statValue}>{todayVisits.toLocaleString()}</div>
                                <div className={styles.statChange} style={{ color: visitGrowth >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {visitGrowth >= 0 ? '+' : ''}{visitGrowth.toFixed(1)}% since yesterday
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVars} whileHover={{ y: -5 }}>
                            <div className={styles.statCard} style={{
                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                border: '1px solid rgba(168, 85, 247, 0.2)'
                            }}>
                                <div className={styles.statIcon} style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                                    <TrendingUp size={24} />
                                </div>
                                <div className={styles.statLabel}>Community Reach</div>
                                <div className={styles.statValue} style={{ color: '#a855f7' }}>
                                    {communityReach >= 1000 ? `${(communityReach / 1000).toFixed(1)}k` : communityReach.toLocaleString()}
                                </div>
                                <div className={styles.statChange}>
                                    {totalFavourites} driver favorites
                                </div>
                            </div>
                        </motion.div>

                        {activePromotion && (
                            <motion.div variants={itemVars}>
                                <ActivePromotionCard promotion={activePromotion} />
                            </motion.div>
                        )}
                    </div>

                    {/* Chart Area */}
                    <motion.div variants={itemVars} className={styles.chartArea}>
                        <div className={styles.sectionHeader}>
                            <h2>Market Opportunity Trend</h2>
                            <p>Your pricing vs the market average (7-day history)</p>
                        </div>
                        <MarketTrendChart data={trendData} />
                    </motion.div>

                    {/* Combined Feedback & Reports Snapshot */}
                    <motion.div variants={itemVars}>
                        <FeedbackSnapshot feedbacks={[
                            ...(feedbacks || []).map((f: any) => ({ ...f, type: 'review' })),
                            ...(reports || []).map((r: any) => ({
                                id: r.id,
                                comment: r.notes || "",
                                price: r.price,
                                fuel_type: r.fuel_type,
                                meter_accuracy: r.meter_accuracy,
                                rating: 5,
                                sentiment: 'neutral',
                                created_at: r.created_at,
                                type: 'report',
                                user_id: r.user_id,
                                profiles: (r as any).profiles,
                                response: (r as any).response
                            }))
                        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())} />
                    </motion.div>
                </div>

                {/* Right Column / Sidebar Widgets: Operations & Intelligence */}
                <div className="flex flex-col gap-6">

                    {/* Action Panel - Grouped Controls Together */}
                    <motion.div variants={itemVars} className="bg-card p-5 rounded-xl border border-border shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Operations</h3>

                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-2 text-blue-500 font-medium">
                                <Droplet size={18} /> Update PMS Price
                            </div>
                            <QuickPriceAction fuelType="PMS" initialPrice={station?.price_pms || statePrice} />
                        </div>

                        <hr className="border-none border-t border-border my-4" />

                        <StockOutToggle stationId={station?.id} isOutOfStock={station?.is_out_of_stock || false} />
                    </motion.div>

                    <motion.div variants={itemVars}>
                        <SmartRecommendations
                            priceDiff={priceDiff}
                            activePromotion={activePromotion}
                            isOutOfStock={station?.is_out_of_stock || false}
                            peakHourLabel={peakHourLabel}
                        />
                    </motion.div>

                    <motion.div variants={itemVars}>
                        <CompetitorWatch competitors={formattedCompetitors} yourPrice={station?.price_pms || 1} />
                    </motion.div>

                </div>
            </div>
        </motion.div>
    );
}
