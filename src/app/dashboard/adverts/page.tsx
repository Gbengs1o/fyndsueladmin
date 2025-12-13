"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { format } from "date-fns"
import {
    Loader2,
    MoreHorizontal,
    PlusCircle,
    Trash2,
    Image as ImageIcon,
    Video,
    ExternalLink,
    MapPin,
    Clock,
    PlayCircle,
    Pencil,
    Search,
    Power,
    BarChart3,
    BarChart2, // Added
    Filter,
    CheckSquare,
    Square,
    AlertCircle,
    Download
} from "lucide-react"


import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { CreateAdvertDialog } from "@/components/adverts/create-advert-dialog"
import { EditAdvertDialog } from "@/components/adverts/edit-advert-dialog"
import { AdAnalyticsChart } from "@/components/adverts/ad-analytics-chart"
import { AdInteractionsDialog } from "@/components/adverts/ad-interactions-dialog" // Added

interface Advert {
    id: string
    title: string
    type: 'image' | 'video'
    content_url: string
    start_date: string
    end_date: string
    target_locations: string[] | null
    is_active: boolean
    priority: number
    cta_text: string | null
    cta_link: string | null
    display_duration: number
    created_at: string
}

interface AnalyticsData {
    advert_id: string
    impressions: number
    clicks: number
}

export default function AdvertsPage() {
    const [adverts, setAdverts] = useState<Advert[]>([])
    const [analytics, setAnalytics] = useState<Record<string, { clicks: number, impressions: number }>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isGlobalEnabled, setIsGlobalEnabled] = useState(true)
    const [isGlobalLoading, setIsGlobalLoading] = useState(true)

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

    // Dialog States
    const [selectedAdvert, setSelectedAdvert] = useState<Advert | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false) // Added

    const { toast } = useToast()

    const fetchSettings = useCallback(async () => {
        setIsGlobalLoading(true)
        try {
            const res = await fetch('/api/settings?key=global_ads_enabled')
            const data = await res.json()
            if (data && data.value !== undefined) {
                setIsGlobalEnabled(data.value)
            }
        } catch (error) {
            console.error("Failed to fetch settings", error)
        } finally {
            setIsGlobalLoading(false)
        }
    }, [])

    const fetchAnalytics = useCallback(async () => {
        // For MVP, we'll just fetch all analytics and aggregate locally.
        // In production, use a dedicated RPC or view.
        const { data, error } = await supabase
            .from('ad_analytics')
            .select('advert_id, event_type')

        if (error) {
            console.error("Error fetching analytics", error)
            return
        }

        const agg: Record<string, { clicks: number, impressions: number }> = {}
        data?.forEach((row: any) => {
            if (!agg[row.advert_id]) agg[row.advert_id] = { clicks: 0, impressions: 0 }
            if (row.event_type === 'click') agg[row.advert_id].clicks++
            else if (row.event_type === 'impression') agg[row.advert_id].impressions++
        })
        setAnalytics(agg)
    }, [])

    const fetchAdverts = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('adverts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching adverts:", error)
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            setAdverts(data as Advert[] || [])
        }
        setIsLoading(false)
    }, [toast])

    useEffect(() => {
        fetchAdverts()
        fetchSettings()
        fetchAnalytics()
    }, [fetchAdverts, fetchSettings, fetchAnalytics])

    const handleGlobalToggle = async (checked: boolean) => {
        setIsGlobalLoading(true)
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'global_ads_enabled', value: checked })
            })
            if (!res.ok) throw new Error("Failed to update setting")
            setIsGlobalEnabled(checked)
            toast({
                title: checked ? "Ads Enabled" : "Ads Disabled",
                description: checked ? "Global ads are now live." : "All ads have been globally disabled.",
                variant: checked ? "default" : "destructive"
            })
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to toggle global ads" })
        } finally {
            setIsGlobalLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this advert?")) return

        const { error } = await supabase.from('adverts').delete().eq('id', id)

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Deleted", description: "Advert deleted successfully." })
            fetchAdverts()
            setSelectedItems(prev => {
                const newSet = new Set(prev)
                newSet.delete(id)
                return newSet
            })
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} adverts?`)) return

        const ids = Array.from(selectedItems)
        const { error } = await supabase.from('adverts').delete().in('id', ids)

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Deleted", description: "Adverts deleted successfully." })
            fetchAdverts()
            setSelectedItems(new Set())
        }
    }

    const handleEdit = (advert: Advert) => {
        setSelectedAdvert(advert)
        setIsEditOpen(true)
    }

    const toggleSelection = (id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) newSet.delete(id)
            else newSet.add(id)
            return newSet
        })
    }

    const toggleAllSelection = () => {
        if (selectedItems.size === filteredAdverts.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(filteredAdverts.map(a => a.id)))
        }
    }

    const getStatus = (advert: Advert) => {
        if (!isGlobalEnabled) return { label: "Disabled Globally", variant: "destructive" as const }

        const now = new Date()
        const start = new Date(advert.start_date)
        const end = new Date(advert.end_date)

        if (!advert.is_active) return { label: "Inactive", variant: "secondary" as const }
        if (now < start) return { label: "Scheduled", variant: "outline" as const }
        if (now > end) return { label: "Expired", variant: "secondary" as const }
        return { label: "Active", variant: "default" as const }
    }

    const filteredAdverts = useMemo(() => {
        if (!searchQuery) return adverts
        const lower = searchQuery.toLowerCase()
        return adverts.filter(ad =>
            ad.title.toLowerCase().includes(lower) ||
            (ad.target_locations || []).some(l => l.toLowerCase().includes(lower))
        )
    }, [adverts, searchQuery])

    const chartData = useMemo(() => {
        return adverts.map(ad => ({
            name: ad.title,
            clicks: analytics[ad.id]?.clicks || 0,
            impressions: analytics[ad.id]?.impressions || 0
        })).filter(d => d.clicks > 0 || d.impressions > 0).slice(0, 10) // Top 10 active
    }, [adverts, analytics])

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Headers and Global Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Adverts Manager</h1>
                    <p className="text-sm text-muted-foreground">Supercharged campaign management and analytics</p>
                </div>
                <div className="flex items-center gap-4 bg-muted/50 p-2 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <Power className={`h-4 w-4 ${isGlobalEnabled ? "text-green-500" : "text-red-500"}`} />
                        <span className="text-sm font-medium">Global Ads Status</span>
                    </div>
                    <Switch
                        checked={isGlobalEnabled}
                        onCheckedChange={handleGlobalToggle}
                        disabled={isGlobalLoading}
                    />
                </div>
            </div>

            {/* Analytics Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Object.values(analytics).reduce((a, b) => a + b.clicks, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Object.values(analytics).reduce((a, b) => a + b.impressions, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <PlayCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {adverts.filter(a => a.is_active && new Date(a.end_date) > new Date()).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <div className={`h-2 w-2 rounded-full ${isGlobalEnabled ? "bg-green-500" : "bg-red-500"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {isGlobalEnabled ? "Operational" : "Offline"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isGlobalEnabled ? "Ads are being served" : "Serving suspended"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-1">
                <AdAnalyticsChart data={chartData} />
            </div>

            {/* Toolbar: Search, Filter, Create */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search campaigns..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {selectedItems.size > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedItems.size})
                        </Button>
                    )}
                    <CreateAdvertDialog onSuccess={fetchAdverts} />
                </div>
            </div>

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Campaigns</CardTitle>
                    <CardDescription>
                        List of all advertisement campaigns
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <div
                                        className="cursor-pointer"
                                        onClick={toggleAllSelection}
                                    >
                                        {selectedItems.size === filteredAdverts.length && filteredAdverts.length > 0 ? (
                                            <CheckSquare className="h-4 w-4" />
                                        ) : (
                                            <Square className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Metrics</TableHead>
                                <TableHead>Locations</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredAdverts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        {searchQuery ? "No matching adverts found." : "No adverts found. Create one to get started."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAdverts.map((advert) => {
                                    const status = getStatus(advert)
                                    const adAnalytics = analytics[advert.id] || { clicks: 0, impressions: 0 }
                                    const isSelected = selectedItems.has(advert.id)

                                    return (
                                        <TableRow key={advert.id} className={isSelected ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => toggleSelection(advert.id)}
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="h-4 w-4 text-primary" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{advert.title}</span>
                                                    {advert.cta_link && (
                                                        <a href={advert.cta_link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                                                            {advert.cta_text || "Link"} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {advert.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                                                    <span className="capitalize">{advert.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <span className="font-semibold">{adAnalytics.clicks} Clicks</span>
                                                    <span className="text-muted-foreground">{adAnalytics.impressions} Views</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {advert.target_locations && advert.target_locations.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {advert.target_locations.slice(0, 2).map(l => (
                                                            <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                                                        ))}
                                                        {advert.target_locations.length > 2 && (
                                                            <Badge variant="outline" className="text-[10px]">+{advert.target_locations.length - 2}</Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">All Locations</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(advert.start_date), 'MMM d, yyyy')}</span>
                                                    <span className="text-muted-foreground">to {format(new Date(advert.end_date), 'MMM d, yyyy')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => window.open(advert.content_url, '_blank')}>
                                                            <ExternalLink className="mr-2 h-4 w-4" /> View Content
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(advert)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { // Added
                                                            setSelectedAdvert(advert)
                                                            setIsAnalyticsOpen(true)
                                                        }}>
                                                            <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(advert.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <EditAdvertDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                advert={selectedAdvert}
                onSuccess={fetchAdverts}
            />

            <AdInteractionsDialog
                open={isAnalyticsOpen}
                onOpenChange={setIsAnalyticsOpen}
                advertId={selectedAdvert?.id || null}
                advertTitle={selectedAdvert?.title || null}
            />
        </div>
    )
}

