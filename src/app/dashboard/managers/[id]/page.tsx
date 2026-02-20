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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ManagerActivityTimeline } from "@/components/dashboard/manager-activity-timeline"
import { ManagerAnalyticsCharts } from "@/components/dashboard/manager-analytics-charts"

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
        <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full shrink-0"
                        onClick={() => router.push('/dashboard/managers')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
                            <AvatarImage src={manager.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">
                                {manager.full_name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tight">{manager.full_name}</h1>
                                <Badge className={manager.verification_status === 'verified' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"}>
                                    {manager.verification_status === 'verified' ? "Verified" : "Pending"}
                                </Badge>
                                {manager.is_banned && <Badge variant="destructive">Banned</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {manager.email}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {manager.joined_at && isValid(new Date(manager.joined_at)) ? format(new Date(manager.joined_at), 'MMM yyyy') : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={manager.is_banned ? "outline" : "destructive"}
                        className="font-bold"
                        onClick={handleToggleBan}
                    >
                        {manager.is_banned ? 'Unban Account' : 'Ban Account'}
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Trust Score', value: `${manager.trust_score}%`, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Response Rate', value: `${manager.response_rate}%`, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Total Reviews', value: manager.total_reviews, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Reward Points', value: manager.profiles?.point_transactions?.reduce((sum, t) => sum + t.amount, 0) || 0, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
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

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start h-14 bg-transparent gap-8 p-0 border-b rounded-none mb-6">
                    {['overview', 'activity', 'analytics', 'governance', 'station'].map((tab) => (
                        <TabsTrigger
                            key={tab}
                            value={tab}
                            className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-base font-bold capitalize transition-all"
                        >
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="min-h-[400px]">
                    <TabsContent value="overview" className="animate-in fade-in slide-in-from-left-4 duration-300 m-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="md:col-span-2 border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold">About Manager</CardTitle>
                                    <CardDescription>Biographical and professional details</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Verification Proof</p>
                                            <div className="aspect-video relative rounded-2xl overflow-hidden border bg-muted/20 group">
                                                {manager.verification_photo_url ? (
                                                    <img
                                                        src={manager.verification_photo_url}
                                                        alt="Proof"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground italic text-xs">No photo submitted</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contact Info</p>
                                                <div className="mt-2 space-y-2">
                                                    <p className="text-sm font-semibold">{manager.email}</p>
                                                    <p className="text-sm text-muted-foreground">{manager.phone || 'No phone provided'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Profile Status</p>
                                                <div className="mt-2">
                                                    <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary">
                                                        {manager.verification_status?.toUpperCase() || 'PENDING'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold">Performance Radar</CardTitle>
                                    <CardDescription>Current reliability summary</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Reporting Accuracy</span>
                                            <span className="text-sm font-black text-emerald-600">{intelligenceData?.performanceRadar?.accuracy || 0}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${intelligenceData?.performanceRadar?.accuracy || 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Avg. Response Time</span>
                                            <span className="text-sm font-black text-amber-600">{intelligenceData?.performanceRadar?.responseTime || 0}h</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (24 / (intelligenceData?.performanceRadar?.responseTime || 24)) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                        <p className="text-xs text-primary leading-relaxed">
                                            <strong>Insight:</strong> {intelligenceData?.performanceRadar?.insight || "Calculating behavioral insights..."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="activity" className="animate-in fade-in slide-in-from-right-4 duration-300 m-0">
                        <Card className="border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold">Operational Timeline</CardTitle>
                                    <CardDescription>Complete behavioral audit feed</CardDescription>
                                </div>
                                {isIntelligenceLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </CardHeader>
                            <CardContent className="p-8">
                                <ManagerActivityTimeline activities={intelligenceData?.activities || []} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="animate-in fade-in zoom-in-95 duration-300 m-0">
                        <Card className="border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-bold">Performance Charts</CardTitle>
                                    <CardDescription>Historical trend analysis</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <ManagerAnalyticsCharts data={intelligenceData?.analytics || []} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="governance" className="animate-in fade-in slide-in-from-bottom-4 duration-300 m-0">
                        <Card className="border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">Administrative Governance</CardTitle>
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
                                <Card className="border shadow-sm">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                                                <Building2 className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black">{manager.stations.name}</h3>
                                                <p className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {manager.stations.address}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <div className="p-5 border rounded-2xl bg-muted/5 space-y-2">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">City / State</p>
                                                <p className="font-bold">{manager.stations.city}, {manager.stations.state}</p>
                                            </div>
                                            <div className="p-5 border rounded-2xl bg-muted/5 space-y-2">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Active Flags</p>
                                                <p className="font-bold text-red-500">{manager.stations.flagged_stations?.length || 0} issues reported</p>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full h-14 rounded-2xl text-base font-bold shadow-xl"
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${manager.stations?.latitude},${manager.stations?.longitude}`, '_blank')}
                                        >
                                            <MapPin className="mr-2 h-5 w-5" /> Navigation to Station
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="border shadow-sm overflow-hidden">
                                    <ScrollArea className="h-[430px]">
                                        <CardHeader className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b">
                                            <CardTitle className="text-lg font-bold">Recent User Reviews</CardTitle>
                                        </CardHeader>
                                        <div className="p-6 space-y-6">
                                            {manager.stations.reviews.length === 0 ? (
                                                <div className="text-center py-20 text-muted-foreground italic">No feedback received for this station yet.</div>
                                            ) : (
                                                manager.stations.reviews.map((review) => (
                                                    <div key={review.id} className="p-5 border rounded-2xl space-y-4 bg-muted/5">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 border">
                                                                    <AvatarImage src={review.profiles?.avatar_url || ''} />
                                                                    <AvatarFallback>{review.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-bold">{review.profiles?.full_name || 'Anonymous'}</span>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <Badge variant="outline" className="text-[10px] px-1.5 bg-blue-50/50">Meter: {review.rating_meter}/5</Badge>
                                                                <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-50/50">Quality: {review.rating_quality}/5</Badge>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm italic text-muted-foreground leading-relaxed">"{review.comment}"</p>
                                                        {review.response && (
                                                            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-2xl">
                                                                <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-widest leading-none">Manager Response</p>
                                                                <p className="text-xs font-semibold leading-relaxed">{review.response}</p>
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
                </div>
            </Tabs>
        </div>
    )
}
