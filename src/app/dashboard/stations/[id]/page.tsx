
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { format, formatDistanceToNow } from "date-fns"
import {
    Loader2,
    ArrowLeft,
    MapPin,
    Flag,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Calendar,
    AlertTriangle,
    User,
    Trash2,
    Edit2,
    ExternalLink,
    Shield,
    ShieldCheck,
    ShieldX,
    ToggleLeft,
    ToggleRight,
    MessageSquare,
    Star,
    Activity
} from "lucide-react"
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { logAdminAction } from "@/lib/admin-logger"

interface Station {
    id: number
    name: string
    address: string
    latitude: number
    longitude: number
    status: string
    is_active: boolean
    is_verified: boolean
    created_at: string
    brand: string | null
}

interface PriceReport {
    id: number
    created_at: string
    price: number
    fuel_type: string
    notes: string
    rating: number
    user: { full_name: string; avatar_url: string; id: string } | null
}

interface FlagItem {
    id: number
    reason: string
    created_at: string
    user: { full_name: string; id: string } | null
}

// Health score calculation
function calculateHealthScore(reports: number, flags: number, lastUpdate: Date | null): { score: number; label: string; color: string } {
    let score = 50 // Base score

    // Reports boost (max +30)
    score += Math.min(reports * 3, 30)

    // Flags penalty (each flag -15)
    score -= flags * 15

    // Recency bonus (if updated in last 7 days: +20)
    if (lastUpdate && (Date.now() - lastUpdate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        score += 20
    }

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score))

    if (score >= 80) return { score, label: 'Excellent', color: 'text-emerald-600' }
    if (score >= 60) return { score, label: 'Good', color: 'text-green-600' }
    if (score >= 40) return { score, label: 'Fair', color: 'text-amber-600' }
    if (score >= 20) return { score, label: 'Poor', color: 'text-orange-600' }
    return { score, label: 'Critical', color: 'text-red-600' }
}

export default function StationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const stationId = params.id as string
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()

    const [station, setStation] = React.useState<Station | null>(null)
    const [reports, setReports] = React.useState<PriceReport[]>([])
    const [flags, setFlags] = React.useState<FlagItem[]>([])
    const [stats, setStats] = React.useState({ avgPrice: 0, totalReports: 0, lastUpdate: '' })

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    // Action states
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
    const [showClearFlagsDialog, setShowClearFlagsDialog] = React.useState(false)
    const [showEditDialog, setShowEditDialog] = React.useState(false)
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [editData, setEditData] = React.useState<Partial<Station>>({})

    const fetchStationData = React.useCallback(async () => {
        if (!stationId) return
        setLoading(true)
        setError(null)

        const stationPromise = supabase
            .from('stations')
            .select('*')
            .eq('id', stationId)
            .single()

        const reportsPromise = supabase
            .from('price_reports')
            .select(`
                id, created_at, price, fuel_type, notes, rating,
                profiles ( id, full_name, avatar_url )
            `)
            .eq('station_id', stationId)
            .order('created_at', { ascending: false })
            .limit(50)

        const flagsPromise = supabase
            .from('flagged_stations')
            .select(`
                id, reason, created_at,
                profiles ( id, full_name )
            `)
            .eq('station_id', stationId)
            .order('created_at', { ascending: false })

        const [
            { data: stationData, error: stationError },
            { data: reportsData },
            { data: flagsData }
        ] = await Promise.all([stationPromise, reportsPromise, flagsPromise])

        if (stationError || !stationData) {
            setError("Could not load station details.")
        } else {
            setStation(stationData)
            setEditData(stationData)
        }

        if (reportsData) {
            const formattedReports = reportsData.map((r: any) => ({
                id: r.id,
                created_at: r.created_at,
                price: r.price,
                fuel_type: r.fuel_type || 'Unknown',
                notes: r.notes,
                rating: r.rating,
                user: r.profiles ? { full_name: r.profiles.full_name, avatar_url: r.profiles.avatar_url, id: r.profiles.id } : null
            }))
            setReports(formattedReports)

            const total = formattedReports.length
            const sum = formattedReports.reduce((acc, curr) => acc + (curr.price || 0), 0)
            const avg = total > 0 ? sum / total : 0
            setStats({
                avgPrice: avg,
                totalReports: total,
                lastUpdate: total > 0 ? formatDistanceToNow(new Date(formattedReports[0].created_at)) + ' ago' : 'Never'
            })
        }

        if (flagsData) {
            setFlags(flagsData.map((f: any) => ({
                id: f.id,
                reason: f.reason,
                created_at: f.created_at,
                user: f.profiles ? { full_name: f.profiles.full_name, id: f.profiles.id } : null
            })))
        }

        setLoading(false)
    }, [stationId])

    React.useEffect(() => {
        if (authLoading || !stationId) return
        fetchStationData()
    }, [stationId, authLoading, fetchStationData])

    // Action Handlers
    const handleDeleteStation = async () => {
        if (!station) return
        setIsProcessing(true)

        try {
            const { error } = await supabase.from('stations').delete().eq('id', station.id)
            if (error) throw error

            await logAdminAction('DELETE_STATION', 'stations', station.id.toString(), {
                name: station.name,
                address: station.address
            })

            toast({ title: "Deleted", description: `Station "${station.name}" has been deleted.` })
            router.push('/dashboard/stations')
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message })
        } finally {
            setIsProcessing(false)
            setShowDeleteDialog(false)
        }
    }

    const handleClearAllFlags = async () => {
        if (!station) return
        setIsProcessing(true)

        try {
            const { error } = await supabase.from('flagged_stations').delete().eq('station_id', station.id)
            if (error) throw error

            await logAdminAction('CLEAR_FLAGS', 'flagged_stations', station.id.toString(), {
                station_name: station.name,
                flags_cleared: flags.length
            })

            toast({ title: "Flags Cleared", description: `All ${flags.length} flags have been removed.` })
            fetchStationData()
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message })
        } finally {
            setIsProcessing(false)
            setShowClearFlagsDialog(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!station) return
        setIsProcessing(true)

        try {
            const { error } = await supabase.from('stations').update({ is_active: !station.is_active }).eq('id', station.id)
            if (error) throw error

            toast({ title: "Updated", description: `Station is now ${!station.is_active ? 'Active' : 'Inactive'}.` })
            fetchStationData()
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleSaveEdit = async () => {
        if (!station) return
        setIsProcessing(true)

        try {
            const { error } = await supabase.from('stations').update(editData).eq('id', station.id)
            if (error) throw error

            toast({ title: "Saved", description: "Station details updated successfully." })
            setShowEditDialog(false)
            fetchStationData()
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDismissFlag = async (flagId: number) => {
        try {
            const { error } = await supabase.from('flagged_stations').delete().eq('id', flagId)
            if (error) throw error

            toast({ title: "Flag Dismissed", description: "The flag has been removed." })
            fetchStationData()
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message })
        }
    }

    if (loading) return (
        <div className="flex h-96 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading station...</p>
            </div>
        </div>
    )

    if (error || !station) return (
        <div className="text-center py-10">
            <p className="text-lg text-destructive mb-4">{error || "Station not found"}</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
    )

    const lastReportDate = reports.length > 0 ? new Date(reports[0].created_at) : null
    const health = calculateHealthScore(stats.totalReports, flags.length, lastReportDate)

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{station.name}</h1>
                            {station.is_verified && <ShieldCheck className="h-5 w-5 text-blue-500" />}
                            {!station.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        <div className="flex items-center text-muted-foreground gap-2 text-sm mt-1">
                            <MapPin className="h-4 w-4" /> {station.address}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleToggleStatus} disabled={isProcessing}>
                        {station.is_active ? (
                            <><ToggleLeft className="mr-2 h-4 w-4" /> Set Inactive</>
                        ) : (
                            <><ToggleRight className="mr-2 h-4 w-4" /> Set Active</>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {flags.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                            <p className="font-medium">{flags.length} Active Flag{flags.length > 1 ? 's' : ''}</p>
                            <p className="text-sm opacity-80">This station has been flagged by users</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowClearFlagsDialog(true)} className="text-red-700 border-red-300 hover:bg-red-100">
                        Clear All Flags
                    </Button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Map & Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="chart-container overflow-hidden">
                        <div className="h-[250px] w-full bg-muted relative">
                            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                                <Map
                                    defaultCenter={{ lat: station.latitude, lng: station.longitude }}
                                    defaultZoom={15}
                                    mapId="STATION_MAP"
                                    disableDefaultUI={true}
                                >
                                    <AdvancedMarker position={{ lat: station.latitude, lng: station.longitude }}>
                                        <Pin
                                            background={station.is_active ? '#10b981' : '#6b7280'}
                                            glyphColor="white"
                                            borderColor={station.is_active ? '#059669' : '#4b5563'}
                                        />
                                    </AdvancedMarker>
                                </Map>
                            </APIProvider>
                        </div>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">Open in</span>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                    Google Maps <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <Separator className="my-3" />
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase">Brand</span>
                                    <div className="font-medium">{station.brand || 'Independent'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase">Status</span>
                                    <div className="font-medium capitalize">{station.is_active ? 'Active' : 'Inactive'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase">Added</span>
                                    <div className="font-medium">{format(new Date(station.created_at), 'MMM yyyy')}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase">Coordinates</span>
                                    <div className="text-xs font-mono">{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card className="chart-container">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Shield className="h-4 w-4" /> Health Score
                                </div>
                                <div className={`font-bold ${health.color}`}>{health.score}/100 ({health.label})</div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <DollarSign className="h-4 w-4" /> Avg Price
                                </div>
                                <div className="font-bold">₦{stats.avgPrice.toFixed(0)}</div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <TrendingUp className="h-4 w-4" /> Total Reports
                                </div>
                                <div className="font-bold">{stats.totalReports}</div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" /> Last Update
                                </div>
                                <div className="text-sm">{stats.lastUpdate}</div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Flag className="h-4 w-4" /> Active Flags
                                </div>
                                <Badge variant={flags.length > 0 ? "destructive" : "secondary"}>{flags.length}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Tabs */}
                <div className="md:col-span-2">
                    <Tabs defaultValue="history" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="history">Activity History</TabsTrigger>
                            <TabsTrigger value="flags" className="gap-2">
                                Flags & Issues
                                {flags.length > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-1.5">{flags.length}</span>}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="history">
                            <Card className="chart-container">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-medium">Recent Price Reports</CardTitle>
                                    <CardDescription>Timeline of user contributions</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-xs font-medium">User</TableHead>
                                                <TableHead className="text-xs font-medium">Price / Fuel</TableHead>
                                                <TableHead className="text-xs font-medium">Note</TableHead>
                                                <TableHead className="text-right text-xs font-medium">Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reports.length > 0 ? reports.map((r) => (
                                                <TableRow key={r.id} className="table-row-hover">
                                                    <TableCell>
                                                        {r.user ? (
                                                            <Link href={`/dashboard/users/${r.user.id}`} className="flex items-center gap-2 hover:opacity-80">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={r.user.avatar_url} />
                                                                    <AvatarFallback className="text-xs"><User className="h-3 w-3" /></AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm hover:underline">{r.user.full_name}</span>
                                                            </Link>
                                                        ) : <span className="text-muted-foreground italic text-sm">Anonymous</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit text-xs">{r.fuel_type}</Badge>
                                                            <span className="font-semibold">₦{r.price}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm max-w-[200px] truncate">{r.notes || '—'}</div>
                                                        {r.rating > 0 && (
                                                            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                                                <Star className="h-3 w-3 fill-current" /> {r.rating}/5
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground text-xs">
                                                        {formatDistanceToNow(new Date(r.created_at))} ago
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        No reports yet
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="flags">
                            <Card className={`chart-container ${flags.length > 0 ? 'border-red-200 dark:border-red-500/20' : ''}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                                Active Flags
                                                {flags.length > 0 && <Badge variant="destructive">{flags.length}</Badge>}
                                            </CardTitle>
                                            <CardDescription>Issues reported by the community</CardDescription>
                                        </div>
                                        {flags.length > 0 && (
                                            <Button variant="outline" size="sm" onClick={() => setShowClearFlagsDialog(true)}>
                                                Clear All
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-xs font-medium">Reason</TableHead>
                                                <TableHead className="text-xs font-medium">Reported By</TableHead>
                                                <TableHead className="text-xs font-medium">When</TableHead>
                                                <TableHead className="text-right text-xs font-medium">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {flags.length > 0 ? flags.map((f) => (
                                                <TableRow key={f.id} className="table-row-hover">
                                                    <TableCell>
                                                        <div className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4" /> {f.reason}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {f.user ? (
                                                            <Link href={`/dashboard/users/${f.user.id}`} className="text-sm hover:underline">
                                                                {f.user.full_name}
                                                            </Link>
                                                        ) : 'Anonymous'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {formatDistanceToNow(new Date(f.created_at))} ago
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => handleDismissFlag(f.id)}>
                                                            Dismiss
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-24 text-center">
                                                        <div className="flex flex-col items-center gap-2 text-emerald-600">
                                                            <CheckCircle2 className="h-8 w-8" />
                                                            <span>No active flags! This station is clean.</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Station?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>"{station.name}"</strong> and all associated data including {stats.totalReports} price reports and {flags.length} flags. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteStation}
                            disabled={isProcessing}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Delete Station
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear Flags Dialog */}
            <AlertDialog open={showClearFlagsDialog} onOpenChange={setShowClearFlagsDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Flags?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove all {flags.length} flag(s) from this station. The station will no longer appear in flagged content. This action will be logged.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllFlags} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Clear All Flags
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Station</DialogTitle>
                        <DialogDescription>Update the station details below.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right text-sm">Name</Label>
                            <Input id="edit-name" value={editData.name || ''} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-address" className="text-right text-sm">Address</Label>
                            <Input id="edit-address" value={editData.address || ''} onChange={e => setEditData(d => ({ ...d, address: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-brand" className="text-right text-sm">Brand</Label>
                            <Input id="edit-brand" value={editData.brand || ''} onChange={e => setEditData(d => ({ ...d, brand: e.target.value }))} className="col-span-3" />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-end space-x-2">
                            <Switch id="edit-active" checked={editData.is_active} onCheckedChange={checked => setEditData(d => ({ ...d, is_active: checked }))} />
                            <Label htmlFor="edit-active">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
                        <Button onClick={handleSaveEdit} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
