"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
    ArrowLeft,
    Building2,
    Calendar,
    Mail,
    MapPin,
    RefreshCw,
    Shield,
    Star,
    User,
    Zap,
    MessageSquare,
    AlertTriangle,
    CheckCircle2
} from "lucide-react"
import { format, formatDistanceToNow, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { ManagerActivityTimeline } from "@/components/dashboard/manager-activity-timeline"
import ManagerAnalytics from '@/components/dashboard/station-manager-analytics-view/ManagerAnalytics'
import ManagerOverview from "@/components/dashboard/station-manager-view/ManagerOverview"
import ManagerPricing from '@/components/dashboard/station-manager-pricing-view/ManagerPricing'
import ManagerReputation from '@/components/dashboard/station-manager-reputation-view/ManagerReputation'
import ManagerPromotions from '@/components/dashboard/station-manager-promotions-view/ManagerPromotions'

import { useToast } from "@/hooks/use-toast"

interface ManagerProfile {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
    phone: string | null
    verification_status: 'pending' | 'verified' | 'rejected'
    is_verified?: boolean
    is_banned: boolean
    trust_score: number
    response_rate: number
    total_reviews: number
    joined_at: string
    verification_photo_url: string | null
    status?: string
    stations?: {
        id: number
        name: string
        address: string
        city: string
        state: string
        latitude: number
        longitude: number
        reviews: any[]
        flagged_stations: any[]
    }
    profiles?: {
        email: string | null
        avatar_url: string | null
        is_banned: boolean
        created_at: string
        point_transactions: any[]
    }
}

export default function ManagerProfilePage() {
    const { id } = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [manager, setManager] = useState<ManagerProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false)
    const [intelligenceData, setIntelligenceData] = useState<{
        activities: any[],
        analytics: any[],
        governance: any[]
    } | null>(null)

    useEffect(() => {
        if (id) {
            fetchManagerData()
        }
    }, [id])

    const fetchManagerData = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('manager_profiles')
                .select(`
                    *,
                    stations (
                        *,
                        reviews (*, profiles (full_name, avatar_url)),
                        flagged_stations (*)
                    ),
                    profiles:id (
                        email,
                        avatar_url,
                        is_banned,
                        created_at,
                        point_transactions (*)
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            // Calculate metrics for the manager
            const reviews = data.stations?.reviews || []
            const totalReviews = reviews.length
            let trustScore = 0
            let responseRate = 0

            if (totalReviews > 0) {
                const totalPoints = reviews.reduce((sum: number, r: any) => {
                    return sum + (r.rating_meter || 5) + (r.rating_quality || 5)
                }, 0)
                const maxPoints = totalReviews * 2 * 5
                trustScore = Math.round((totalPoints / maxPoints) * 100)

                const responseCount = reviews.filter((r: any) => r.response).length
                responseRate = Math.round((responseCount / totalReviews) * 100)
            }

            const processedManager = {
                ...data,
                email: data.profiles?.email || data.email,
                is_banned: data.profiles?.is_banned || false,
                joined_at: data.profiles?.created_at || data.created_at,
                trust_score: trustScore,
                response_rate: responseRate,
                total_reviews: totalReviews
            }

            setManager(processedManager)
            fetchManagerIntelligence(processedManager)
        } catch (error) {
            console.error("Error fetching manager:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchManagerIntelligence = async (manager: ManagerProfile) => {
        setIsIntelligenceLoading(true)
        try {
            const { data: priceLogs } = await supabase
                .from('price_logs')
                .select('*')
                .eq('updated_by', manager.id)
                .order('created_at', { ascending: false })

            const { data: auditLogs } = await supabase
                .from('admin_audit_logs')
                .select('*')
                .eq('target_id', manager.id)
                .order('created_at', { ascending: false })

            const activities = [
                ...(priceLogs || []).map(p => ({
                    id: `p-${p.id}`,
                    type: 'price_update',
                    title: `Price Updated: ${p.fuel_type}`,
                    description: `Changed from ₦${p.old_price} to ₦${p.new_price}`,
                    timestamp: p.created_at,
                })),
                ...(manager.profiles?.point_transactions || []).map(t => ({
                    id: `t-${t.id}`,
                    type: 'points_earned',
                    title: 'Points Earned',
                    description: t.description || `Earned ${t.amount} points`,
                    timestamp: t.created_at,
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

            const governance = (auditLogs || []).map(a => ({
                id: a.id,
                type: a.action_type === 'VERIFY' ? 'verification' : a.action_type === 'BAN' ? 'ban' : 'system',
                title: a.action_type.replace('_', ' '),
                description: a.details?.reason || `Action performed by admin`,
                timestamp: a.created_at,
            }))

            const analytics = Array.from({ length: 7 }).map((_, i) => {
                const date = new Date()
                date.setHours(0, 0, 0, 0)
                date.setDate(date.getDate() - (6 - i))
                const dateStr = format(date, 'MMM dd')

                const dayLogsCount = (priceLogs || []).filter(p => {
                    const logDate = new Date(p.created_at)
                    return logDate.getDate() === date.getDate() &&
                        logDate.getMonth() === date.getMonth() &&
                        logDate.getFullYear() === date.getFullYear()
                }).length

                return {
                    date: dateStr,
                    trustScore: manager.trust_score,
                    reports: dayLogsCount
                }
            })

            // Performance Metrics
            const respondedReviews = manager.stations?.reviews.filter(r => r.response && r.responded_at) || []
            let avgResponseTime = 0
            if (respondedReviews.length > 0) {
                const totalDiff = respondedReviews.reduce((sum, r) => {
                    const diff = new Date(r.responded_at).getTime() - new Date(r.created_at).getTime()
                    return sum + diff
                }, 0)
                avgResponseTime = Math.round((totalDiff / respondedReviews.length) / (1000 * 60 * 60) * 10) / 10 // Hours
            }

            const recentLogs = (priceLogs || []).filter(p => {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                return new Date(p.created_at) > monthAgo
            }).length

            const performanceRadar = {
                accuracy: manager.trust_score,
                responseTime: avgResponseTime,
                insight: recentLogs > 10
                    ? `This manager is highly active with ${recentLogs} updates this month. Excellent performance.`
                    : recentLogs > 0
                        ? `Regular activity detected (${recentLogs} updates). Maintaining steady reporting.`
                        : "Limited reporting activity recently. Encourage more frequent price updates."
            }

            setIntelligenceData({ activities, analytics, governance, performanceRadar })
        } catch (error) {
            console.error("Error fetching intelligence:", error)
        } finally {
            setIsIntelligenceLoading(false)
        }
    }

    const handleToggleBan = async () => {
        if (!manager) return
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !manager.is_banned })
                .eq('id', manager.id)

            if (error) throw error

            toast({
                title: "Success",
                description: `Manager ${manager.is_banned ? 'unbanned' : 'banned'} successfully.`
            })
            fetchManagerData()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/30" />
            </div>
        )
    }

    if (!manager) {
        return (
            <div className="flex flex-col h-[80vh] items-center justify-center gap-4">
                <AlertTriangle className="h-12 w-12 text-destructive/50" />
                <h1 className="text-xl font-bold">Manager Not Found</h1>
                <Button onClick={() => router.push('/dashboard/managers')}>Back to List</Button>
            </div>
        )
    }

    return (
        <div className="w-full py-6 px-4 md:px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border shadow-xl shadow-primary/5">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 object-cover opacity-50 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 object-cover opacity-50 pointer-events-none" />

                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-8 left-8 rounded-full h-10 w-10 bg-background/50 backdrop-blur-md hover:bg-background/80 shadow-sm border border-black/5"
                            onClick={() => router.push('/dashboard/managers')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>

                        <div className="flex items-center gap-6 mt-12 md:mt-0 md:ml-16">
                            <div className="relative">
                                <Avatar className="h-28 w-28 border-[6px] border-background shadow-2xl">
                                    <AvatarImage src={manager.avatar_url || ''} className="object-cover" />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-4xl font-black">
                                        {manager.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {manager.verification_status === 'verified' && (
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-background shadow-lg">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black tracking-tight">{manager.full_name}</h1>
                                    <Badge variant="outline" className={`font-black uppercase tracking-widest text-[10px] py-1 px-3 ${manager.verification_status === 'verified'
                                        ? "border-emerald-500/30 bg-emerald-50 text-emerald-600"
                                        : "border-amber-500/30 bg-amber-50 text-amber-600"
                                        }`}>
                                        {manager.verification_status === 'verified' ? "Verified" : "Pending"}
                                    </Badge>
                                    {manager.is_banned && <Badge variant="destructive" className="font-black uppercase tracking-widest text-[10px] py-1 px-3">Banned</Badge>}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-black/5">
                                        <Mail className="h-4 w-4 text-primary" />
                                        <span>{manager.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-black/5">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span>Joined {manager.joined_at && isValid(new Date(manager.joined_at)) ? format(new Date(manager.joined_at), 'MMM yyyy') : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <Button
                            variant={manager.is_banned ? "outline" : "destructive"}
                            className={`font-black rounded-xl px-8 shadow-lg ${!manager.is_banned ? 'shadow-red-500/20' : ''}`}
                            onClick={handleToggleBan}
                        >
                            {manager.is_banned ? 'Unban Account' : 'Ban Account'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Trust Score', value: `${manager.trust_score}%`, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { label: 'Response Rate', value: `${manager.response_rate}%`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { label: 'Total Reviews', value: manager.total_reviews, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    { label: 'Reward Points', value: manager.profiles?.point_transactions?.reduce((sum, t) => sum + t.amount, 0) || 0, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                ].map((stat, i) => (
                    <Card key={i} className={`border ${stat.border} shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 bg-gradient-to-br from-background to-muted/20 relative group`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.bg}`} />
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3 relative z-10">
                            <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} ring-4 ring-background shadow-inner transition-transform duration-500 group-hover:scale-110`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{stat.label}</p>
                                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <div className="mb-6 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
                    <TabsList className="inline-flex h-11 bg-muted/40 rounded-xl p-1 gap-1 w-max">
                        {['overview', 'activity', 'analytics', 'governance', 'station', 'manager-dashboard', 'manager-pricing', 'manager-reputation', 'manager-promotions'].map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="h-full rounded-lg px-4 text-sm font-semibold capitalize whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                {tab === 'manager-dashboard' ? "Manager's View" : tab === 'manager-pricing' ? "Pricing" : tab === 'manager-reputation' ? "Reputation" : tab === 'manager-promotions' ? "Promotions" : tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="min-h-[400px]">
                    <TabsContent value="overview" className="animate-in fade-in slide-in-from-left-4 duration-300 m-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="md:col-span-2 border shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-background to-muted/10">
                                <CardHeader className="bg-muted/10 border-b p-6">
                                    <CardTitle className="text-xl font-black">About Manager</CardTitle>
                                    <CardDescription>Biographical and professional details</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Verification Proof
                                            </p>
                                            <div className="aspect-[4/3] relative rounded-2xl overflow-hidden border-2 bg-muted/20 group">
                                                {manager.verification_photo_url ? (
                                                    <img
                                                        src={manager.verification_photo_url}
                                                        alt="Proof"
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground italic gap-2 opacity-50">
                                                        <Shield className="h-8 w-8" />
                                                        <span className="text-xs font-bold">No photo submitted</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="p-5 rounded-2xl bg-muted/30 border border-black/5 space-y-1">
                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Contact Information</p>
                                                <div className="mt-2 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-xl bg-background shadow-sm"><Mail className="h-4 w-4 text-primary" /></div>
                                                        <p className="text-sm font-bold">{manager.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-xl bg-background shadow-sm"><User className="h-4 w-4 text-primary" /></div>
                                                        <p className="text-sm font-bold text-muted-foreground">{manager.phone || 'No phone provided'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-muted/30 border border-black/5 space-y-2">
                                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">System Status</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <Badge variant="outline" className={`font-black uppercase tracking-widest py-1 border-primary/20 ${manager.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/5 text-primary'}`}>
                                                        {manager.verification_status?.toUpperCase() || 'PENDING'}
                                                    </Badge>
                                                    {manager.is_banned && <Badge variant="destructive" className="font-black uppercase tracking-widest py-1">Access Revoked</Badge>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm rounded-3xl overflow-hidden bg-gradient-to-b from-background to-muted/10 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                <CardHeader className="bg-muted/10 border-b p-6">
                                    <CardTitle className="text-xl font-black">Performance Radar</CardTitle>
                                    <CardDescription>Behavioral insights</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Reporting Accuracy</span>
                                            <span className="text-lg font-black text-emerald-600">{intelligenceData?.performanceRadar?.accuracy || 0}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${intelligenceData?.performanceRadar?.accuracy || 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Avg. Response Time</span>
                                            <span className="text-lg font-black text-amber-600">{intelligenceData?.performanceRadar?.responseTime || 0}h</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (24 / (intelligenceData?.performanceRadar?.responseTime || 24)) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Zap className="h-12 w-12 text-primary" /></div>
                                        <p className="text-xs font-bold text-primary leading-relaxed relative z-10">
                                            <span className="block text-[10px] uppercase font-black tracking-widest mb-1 opacity-70">AI Insight</span>
                                            {intelligenceData?.performanceRadar?.insight || "Calculating behavioral insights..."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="activity" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <Card className="border shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-background to-muted/10">
                            <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b p-6">
                                <div>
                                    <CardTitle className="text-xl font-black">Operational Timeline</CardTitle>
                                    <CardDescription>Complete behavioral audit feed</CardDescription>
                                </div>
                                {isIntelligenceLoading && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
                            </CardHeader>
                            <CardContent className="p-8">
                                <ManagerActivityTimeline activities={intelligenceData?.activities || []} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="animate-in fade-in zoom-in-95 duration-300 m-0">
                        <ManagerAnalytics stationId={manager.station_id} />
                    </TabsContent>

                    <TabsContent value="governance" className="animate-in fade-in slide-in-from-bottom-4 duration-300 m-0">
                        <Card className="border shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-background to-muted/10">
                            <CardHeader className="bg-muted/10 border-b p-6">
                                <CardTitle className="text-xl font-black">Administrative Governance</CardTitle>
                                <CardDescription>Audit trail of actions taken on this manager</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <ManagerActivityTimeline activities={intelligenceData?.governance || []} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="station" className="animate-in fade-in slide-in-from-up-4 duration-300 m-0">
                        {manager.stations ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="border shadow-sm rounded-3xl overflow-hidden bg-gradient-to-b from-background to-muted/10">
                                    <CardContent className="p-8 space-y-8">
                                        <div className="flex items-start gap-5">
                                            <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl text-primary border border-primary/10 shadow-inner">
                                                <Building2 className="h-10 w-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-black tracking-tight">{manager.stations.name}</h3>
                                                <p className="text-muted-foreground font-medium flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    {manager.stations.address}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 border-2 border-muted/50 rounded-2xl bg-background space-y-2 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-2"><MapPin className="h-3 w-3" /> Location</p>
                                                <p className="text-base font-bold">{manager.stations.city}, {manager.stations.state}</p>
                                            </div>
                                            <div className="p-5 border-2 border-muted/50 rounded-2xl bg-background space-y-2 shadow-sm transition-all hover:border-red-500/20 hover:shadow-md">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> Active Flags</p>
                                                <p className="text-base font-bold text-red-500">{manager.stations.flagged_stations?.length || 0} issues reported</p>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full h-14 rounded-xl text-base font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${manager.stations?.latitude},${manager.stations?.longitude}`, '_blank')}
                                        >
                                            <MapPin className="mr-2 h-5 w-5" /> Navigation to Station
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="border shadow-sm rounded-3xl overflow-hidden bg-background">
                                    <ScrollArea className="h-[430px]">
                                        <CardHeader className="sticky top-0 bg-background/80 backdrop-blur-xl z-10 border-b p-6">
                                            <CardTitle className="text-xl font-black">Recent User Reviews</CardTitle>
                                        </CardHeader>
                                        <div className="p-6 space-y-4 bg-muted/5">
                                            {manager.stations.reviews.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic space-y-3 opacity-60">
                                                    <MessageSquare className="h-10 w-10" />
                                                    <span>No feedback received for this station yet.</span>
                                                </div>
                                            ) : (
                                                manager.stations.reviews.map((review: any) => (
                                                    <div key={review.id} className="p-6 border-2 border-muted/50 rounded-2xl space-y-4 bg-background shadow-sm hover:border-primary/20 transition-all group">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-10 w-10 border shadow-sm group-hover:border-primary/30 transition-colors">
                                                                    <AvatarImage src={review.profiles?.avatar_url || ''} />
                                                                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{review.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-black">{review.profiles?.full_name || 'Anonymous User'}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <Badge variant="outline" className="text-[9px] px-2 py-0 border-blue-500/20 bg-blue-50 text-blue-600 font-bold uppercase tracking-widest">Meter: {review.rating_meter}/5</Badge>
                                                                <Badge variant="outline" className="text-[9px] px-2 py-0 border-emerald-500/20 bg-emerald-50 text-emerald-600 font-bold uppercase tracking-widest">Quality: {review.rating_quality}/5</Badge>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm italic font-medium leading-relaxed bg-muted/30 p-4 rounded-xl text-muted-foreground border border-black/5">"{review.comment}"</p>
                                                        {review.response && (
                                                            <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-xl ms-4">
                                                                <p className="text-[10px] font-black text-primary mb-1.5 uppercase tracking-widest leading-none flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Manager Response
                                                                </p>
                                                                <p className="text-xs font-bold leading-relaxed">{review.response}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </Card>
                            </div>
                        ) : (
                            <div className="text-center py-40 text-muted-foreground italic bg-muted/5 rounded-3xl border-4 border-dashed mx-auto max-w-2xl">
                                This manager has no assigned fuel station yet.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="manager-dashboard" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <ManagerOverview
                            managerId={id as string}
                            stationId={manager.stations?.id}
                        />
                    </TabsContent>

                    <TabsContent value="manager-pricing" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <ManagerPricing
                            managerId={id as string}
                            stationId={manager.stations?.id}
                            state={manager.stations?.state}
                            latitude={manager.stations?.latitude}
                            longitude={manager.stations?.longitude}
                            currentPrices={{
                                pms: manager.stations?.price_pms,
                                ago: manager.stations?.price_ago,
                                dpk: manager.stations?.price_dpk
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="manager-reputation" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <ManagerReputation
                            managerId={id as string}
                            stationId={manager.stations?.id || 0}
                        />
                    </TabsContent>

                    <TabsContent value="manager-promotions" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <ManagerPromotions
                            managerId={id as string}
                            stationId={manager.stations?.id || null}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
