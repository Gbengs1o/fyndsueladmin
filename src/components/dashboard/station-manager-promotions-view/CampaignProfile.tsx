'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Eye, MousePointer2, TrendingUp, Zap, Flame, Rocket, Award, Shield, DollarSign, BarChart3, Loader2 } from 'lucide-react';
import { getCampaignDetailsAdmin, getPromotionClickEventsAdmin } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TIER_ICONS: Record<string, any> = {
    'Quick Boost': <Rocket className="h-6 w-6" />,
    'Flash Sale': <Flame className="h-6 w-6" />,
    'Area Takeover': <Zap className="h-6 w-6" />,
    'Featured Station': <Award className="h-6 w-6" />,
    'Scarcity Hero': <Shield className="h-6 w-6" />,
};

const TIER_COLORS: Record<string, string> = {
    'Quick Boost': 'text-blue-500 bg-blue-500/10',
    'Flash Sale': 'text-amber-500 bg-amber-500/10',
    'Area Takeover': 'text-emerald-500 bg-emerald-500/10',
    'Featured Station': 'text-purple-500 bg-purple-500/10',
    'Scarcity Hero': 'text-red-500 bg-red-500/10',
};

interface CampaignProfileProps {
    campaignId: string;
    onBack: () => void;
}

export default function CampaignProfile({ campaignId, onBack }: CampaignProfileProps) {
    const [campaign, setCampaign] = useState<any>(null);
    const [clickEvents, setClickEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            setLoading(true);
            try {
                const [campaignData, eventsData] = await Promise.all([
                    getCampaignDetailsAdmin(campaignId),
                    getPromotionClickEventsAdmin(campaignId)
                ]);
                setCampaign(campaignData);
                setClickEvents(eventsData || []);
            } catch (error) {
                console.error('Error fetching campaign details:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchDetails();
    }, [campaignId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading campaign analysis...</p>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">Campaign not found.</p>
                <Button variant="link" onClick={onBack}>Go back</Button>
            </div>
        );
    }

    const ctr = campaign.views > 0
        ? ((campaign.clicks || 0) / campaign.views * 100).toFixed(1)
        : '0.0';

    const cpc = campaign.clicks > 0
        ? (campaign.tier?.price / campaign.clicks).toFixed(2)
        : '0.00';

    const hourlyAggregation = clickEvents.reduce((acc: any, event: any) => {
        const hour = new Date(event.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {});

    const peakHour = Object.keys(hourlyAggregation).length > 0
        ? Object.entries(hourlyAggregation).reduce((a: any, b: any) => a[1] > b[1] ? a : b)[0]
        : null;

    const formatHour = (h: string | null) => {
        if (h === null) return 'N/A';
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour} ${ampm}`;
    };

    const isExpired = new Date(campaign.end_time) < new Date();
    const status = campaign.status === 'active' && isExpired ? 'expired' : campaign.status;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="rounded-xl border shadow-sm hover:bg-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-black tracking-tight">Campaign Profile</h2>
                    <p className="text-sm text-muted-foreground font-medium">Detailed performance analysis for {campaign.tier?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border shadow-sm bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                                    <Eye className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-blue-600/70 mb-1">Total Reach</p>
                                    <h3 className="text-3xl font-black text-blue-600">{campaign.views || 0}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm bg-purple-50/30 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl">
                                    <MousePointer2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-purple-600/70 mb-1">Total Clicks</p>
                                    <h3 className="text-3xl font-black text-purple-600">{campaign.clicks || 0}</h3>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600/70 mb-1">Interest Score</p>
                                    <h3 className="text-3xl font-black text-emerald-600">{ctr}%</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Efficiency Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                                        <DollarSign className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-sm font-bold">Cost Efficiency</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-amber-600">₦{cpc}</span>
                                    <span className="text-xs text-muted-foreground font-medium">per click</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Measures implementation cost relative to customer engagement. Higher reach lowers this value over time.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                                        <BarChart3 className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-sm font-bold">Peak Engagement</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-blue-600">{formatHour(peakHour)}</span>
                                    <span className="text-xs text-muted-foreground font-medium">busiest window</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {peakHour
                                        ? "Most clicks occur during this window. Use this for scheduling future Flash Sales."
                                        : "Collecting historical hourly data. Check back once more clicks are recorded."}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Intelligence Insights */}
                    <Card className="border shadow-sm bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                        <CardHeader>
                            <CardTitle className="text-lg font-black tracking-tight">Marketing Performance Analysis</CardTitle>
                            <CardDescription className="font-medium text-muted-foreground">What these numbers mean for this station</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 rounded-xl bg-background/50 border border-primary/10 space-y-3">
                                <p className="text-sm leading-relaxed">
                                    This <span className="font-bold text-primary">{campaign.tier?.name}</span> campaign generated an interest score of <span className="font-black text-emerald-600">{ctr}%</span>.
                                    Out of <span className="font-bold">{campaign.views}</span> total impressions, <span className="font-bold">{campaign.clicks}</span> users engaged.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary/60">The Interest Score (CTR)</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Measures how compelling this station's profile is. A high CTR suggests customers find the branding, name, or current prices attractive.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary/60">Engagement Funnel</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        We divide total <span className="font-bold">Clicks</span> by total <span className="font-bold">Reach</span>.
                                        Generally, a CTR above 5% is considered strong performance in this sector.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border shadow-lg overflow-hidden flex flex-col items-center text-center p-8 space-y-6 relative group">
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${TIER_COLORS[campaign.tier?.name]?.split(' ')[1] || 'bg-primary/20'}`} />

                        <div className={`p-5 rounded-3xl ${TIER_COLORS[campaign.tier?.name] || 'bg-primary/10 text-primary'} shadow-inner flex items-center justify-center`}>
                            {TIER_ICONS[campaign.tier?.name] || <Zap className="h-8 w-8" />}
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tighter">{campaign.tier?.name}</h3>
                            <Badge variant="outline" className={`font-black text-[10px] uppercase ${status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'
                                }`}>
                                {status}
                            </Badge>
                        </div>

                        <div className="w-full space-y-4 pt-4 border-t">
                            <div className="text-left space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Campaign Reference</p>
                                <p className="text-xs font-mono font-medium truncate">{campaign.id}</p>
                            </div>

                            <div className="text-left space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Investment</p>
                                <p className="text-lg font-black">₦{campaign.tier?.price?.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">Pre-paid via promotional wallet</p>
                            </div>

                            <div className="text-left space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Timeline</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>{new Date(campaign.start_time).toLocaleDateString()}</span>
                                    <span className="text-muted-foreground/40">—</span>
                                    <span>{new Date(campaign.end_time).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                                    Started at {new Date(campaign.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border shadow-sm border-dashed bg-muted/5">
                        <CardContent className="p-6">
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" /> Admin Controls
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                This campaign is read-only. Performance data is synchronized in real-time with customer app interactions.
                            </p>
                            <Button variant="outline" className="w-full rounded-xl text-xs font-bold h-9" onClick={onBack}>
                                Close Analysis
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
