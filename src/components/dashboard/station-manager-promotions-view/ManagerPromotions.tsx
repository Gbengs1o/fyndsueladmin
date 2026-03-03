'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, Eye, MousePointer2, TrendingUp, DollarSign, Rocket, History, LayoutDashboard, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getWalletInfo,
    getActivePromotion,
    getCampaignHistory,
    getPromotionTiers
} from './actions';
import WalletDashboard from './WalletDashboard';
import ActivePromotionCard from './ActivePromotionCard';
import BoostModal from './BoostModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagerPromotionsProps {
    managerId: string;
    stationId: number | null;
}

const TIER_ICONS: Record<string, any> = {
    'Quick Boost': <Rocket className="h-5 w-5" />,
    'Flash Sale': <Rocket className="h-5 w-5" />,
    'Area Takeover': <Rocket className="h-5 w-5" />,
    'Featured Station': <Rocket className="h-5 w-5" />,
    'Scarcity Hero': <Rocket className="h-5 w-5" />,
};

const TIER_COLORS: Record<string, string> = {
    'Quick Boost': 'text-blue-500 bg-blue-500/10',
    'Flash Sale': 'text-amber-500 bg-amber-500/10',
    'Area Takeover': 'text-emerald-500 bg-emerald-500/10',
    'Featured Station': 'text-purple-500 bg-purple-500/10',
    'Scarcity Hero': 'text-red-500 bg-red-500/10',
};

export default function ManagerPromotions({ managerId, stationId }: ManagerPromotionsProps) {
    const router = useRouter();
    const [walletData, setWalletData] = useState<any>(null);
    const [tiers, setTiers] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [activePromo, setActivePromo] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshingSection, setRefreshingSection] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [wData, tData] = await Promise.all([
                getWalletInfo(managerId),
                getPromotionTiers()
            ]);
            setWalletData(wData);
            setTiers(tData);

            if (stationId !== null) {
                const [hData, activeData] = await Promise.all([
                    getCampaignHistory(stationId),
                    getActivePromotion(stationId)
                ]);
                setHistory(hData || []);
                setActivePromo(activeData);
            }
        } catch (error) {
            console.error('Error fetching manager promotion data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [managerId, stationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = async (section: string) => {
        setRefreshingSection(section);
        try {
            if (section === 'wallet') {
                const wData = await getWalletInfo(managerId);
                setWalletData(wData);
            } else if (section === 'analytics' || section === 'history' || section === 'all') {
                if (stationId !== null) {
                    const [hData, activeData, wData] = await Promise.all([
                        getCampaignHistory(stationId),
                        getActivePromotion(stationId),
                        getWalletInfo(managerId)
                    ]);
                    setHistory(hData || []);
                    setActivePromo(activeData);
                    setWalletData(wData);
                }
            } else if (section === 'plans') {
                const tData = await getPromotionTiers();
                setTiers(tData);
            }
        } catch (error) {
            console.error(`Error refreshing ${section}:`, error);
        } finally {
            setRefreshingSection(null);
        }
    };

    const analytics = useMemo(() => {
        const totalReach = history.reduce((sum, c) => sum + (c.views || 0), 0);
        const totalClicks = history.reduce((sum, c) => sum + (c.clicks || 0), 0);
        const avgCTR = totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(1) : '0.0';
        const totalSpent = history.reduce((sum, c) => sum + (c.tier?.price || 0), 0);
        return { totalReach, totalClicks, avgCTR, totalSpent, totalCampaigns: history.length };
    }, [history]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                </div>
                <Skeleton className="h-[400px] w-full rounded-2xl" />
            </div>
        );
    }

    if (stationId === null || stationId === undefined) {
        return (
            <Card className="border-dashed border-2 bg-muted/5">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <div className="p-4 bg-muted rounded-full">
                        <Rocket className="h-10 w-10 text-muted-foreground opacity-50" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">No Station Assigned</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            This manager does not have a station assigned to them yet. Promotional tools require an active station to function.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Rocket className="h-6 w-6 text-primary" />
                        Promotional Tools
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">
                        Manage station visibility and promotional wallet balances.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRefresh('all')}
                        disabled={refreshingSection === 'all'}
                        className="rounded-xl border shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshingSection === 'all' ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:shadow-primary/30 transition-all gap-2"
                    >
                        <Rocket className="h-4 w-4" /> Activate Boost
                    </Button>
                </div>
            </div>

            {/* Wallet & Active Promotion Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <WalletDashboard
                        managerId={managerId}
                        wallet={walletData?.wallet}
                        transactions={walletData?.transactions || []}
                        onRefresh={() => handleRefresh('wallet')}
                        isRefreshing={refreshingSection === 'wallet'}
                    />
                </div>
                <div className="space-y-6">
                    {activePromo ? (
                        <Card className="border shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Active Promotion</CardTitle>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">LIVE</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ActivePromotionCard promotion={activePromo} />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border border-dashed bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                                <div className="p-3 bg-muted rounded-full">
                                    <Zap className="h-5 w-5 text-muted-foreground opacity-30" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">No Active Boost</p>
                                    <p className="text-xs text-muted-foreground">The station is currently not being promoted.</p>
                                </div>
                                <Button variant="link" size="sm" onClick={() => setIsModalOpen(true)} className="font-bold text-primary">
                                    Boost Now
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Performance Analytics */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black tracking-tight">Performance Analytics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Reach', value: analytics.totalReach.toLocaleString(), icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Total Clicks', value: analytics.totalClicks.toLocaleString(), icon: MousePointer2, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Avg. CTR', value: `${analytics.avgCTR}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
                        { label: 'Total Spent', value: `₦${analytics.totalSpent.toLocaleString()}`, icon: DollarSign, color: 'text-red-500', bg: 'bg-red-50' },
                    ].map((stat, i) => (
                        <Card key={i} className="border shadow-sm group hover:shadow-md transition-all">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Promotional Tiers Grid */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black tracking-tight">Available Boost Plans</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tiers.filter(t => ['Quick Boost', 'Flash Sale', 'Area Takeover'].includes(t.name)).map((tier) => (
                        <Card key={tier.id} className="border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all flex flex-col group">
                            <div className="h-1.5 w-full bg-muted overflow-hidden">
                                <div className={`h-full w-full opacity-60 ${TIER_COLORS[tier.name].split(' ')[1]}`} />
                            </div>
                            <CardHeader>
                                <div className={`p-3 rounded-xl w-fit mb-2 ${TIER_COLORS[tier.name].split(' ').slice(0, 2).join(' ')}`}>
                                    {TIER_ICONS[tier.name] || <Rocket className="h-5 w-5" />}
                                </div>
                                <CardTitle className="text-lg font-black">{tier.name}</CardTitle>
                                <CardDescription className="font-medium">{tier.duration_hours} Hours Boost Duration</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-6">
                                <div className="text-3xl font-black">
                                    ₦{tier.price.toLocaleString()}
                                </div>
                                <ul className="space-y-2 flex-1">
                                    {tier.features?.map((f: string, i: number) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-full rounded-xl font-bold border-2 border-primary/10 bg-muted hover:bg-primary hover:text-white hover:border-primary text-foreground transition-all h-12"
                                >
                                    Activate Plan
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Campaign History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-black tracking-tight">Campaign History</h2>
                    </div>
                </div>
                <Card className="border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="p-4 text-xs uppercase font-bold text-muted-foreground tracking-widest">Campaign Tier</th>
                                    <th className="p-4 text-xs uppercase font-bold text-muted-foreground tracking-widest">Timeline</th>
                                    <th className="p-4 text-xs uppercase font-bold text-muted-foreground tracking-widest">Stats</th>
                                    <th className="p-4 text-xs uppercase font-bold text-muted-foreground tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {history.length > 0 ? (
                                    history.map((campaign) => {
                                        const ctr = campaign.views > 0
                                            ? ((campaign.clicks || 0) / campaign.views * 100).toFixed(1) + '%'
                                            : '—';
                                        const isExpired = new Date(campaign.end_time) < new Date();
                                        const displayStatus = campaign.status === 'active' && isExpired ? 'expired' : campaign.status;

                                        return (
                                            <tr key={campaign.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-black text-sm">{campaign.tier?.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-bold tracking-tight">ID: {campaign.id.slice(0, 8)}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs font-semibold">{new Date(campaign.start_time).toLocaleDateString()} - {new Date(campaign.end_time).toLocaleDateString()}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">{new Date(campaign.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} start</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-3">
                                                        <div className="space-y-0.5 text-center">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">{campaign.views || 0}</p>
                                                            <p className="text-[9px] text-muted-foreground/60 italic leading-none font-medium">Reach</p>
                                                        </div>
                                                        <div className="space-y-0.5 text-center">
                                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">{ctr}</p>
                                                            <p className="text-[9px] text-muted-foreground/60 italic leading-none font-medium">CTR</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline" className={`font-black text-[10px] ${displayStatus === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-muted text-muted-foreground border-border'
                                                        }`}>
                                                        {displayStatus.toUpperCase()}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-20 text-center text-muted-foreground italic font-medium">
                                            No promotion history found for this station.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <BoostModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchData();
                }}
                tiers={tiers.filter((t) => ['Quick Boost', 'Flash Sale', 'Area Takeover'].includes(t.name))}
                walletBalance={walletData?.wallet?.balance || 0}
                managerId={managerId}
                stationId={stationId || 0}
            />
        </div>
    );
}
