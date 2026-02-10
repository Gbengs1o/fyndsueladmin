"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
    Users,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    ExternalLink,
    MapPin,
    Phone,
    User as UserIcon,
    ShieldCheck,
    MoreVertical
} from "lucide-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Review {
    id: string
    rating_meter: number
    rating_quality: number
    rating: number // overall
    comment: string | null
    response: string | null
    responded_at: string | null
    created_at: string
    user: {
        full_name: string
        avatar_url: string | null
    } | null
}

interface ManagerProfile {
    id: string
    full_name: string
    phone_number: string
    station_id: number | null
    verification_status: 'pending' | 'verified' | 'rejected'
    verification_photo_url: string | null
    created_at: string
    stations?: {
        id: number
        name: string
        address: string | null
        state: string | null
        latitude: number
        longitude: number
        reviews: Review[]
    }
    // Computed properties
    trust_score?: number
    response_rate?: number
    total_reviews?: number
    is_gold?: boolean
}

export default function ManagersPage() {
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const [managers, setManagers] = useState<ManagerProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Modal states
    const [selectedManager, setSelectedManager] = useState<ManagerProfile | null>(null)
    const [isPhotoOpen, setIsPhotoOpen] = useState(false)
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false) // New sheet state
    const [stationSearch, setStationSearch] = useState("")
    const [stations, setStations] = useState<{ id: number, name: string, city: string, state: string }[]>([])
    const [isSearchingStations, setIsSearchingStations] = useState(false)

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: keyof ManagerProfile, direction: 'asc' | 'desc' } | null>(null)

    const fetchManagers = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('manager_profiles')
                .select(`
          *,
          stations (
            id,
            name,
            address,
            state,
            latitude,
            longitude,
            reviews (
                id,
                rating,
                rating_meter,
                rating_quality,
                comment,
                response,
                responded_at,
                created_at,
                user:profiles (
                    full_name,
                    avatar_url
                )
            )
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Calculate metrics for each manager
            const processedData = (data || []).map((manager: any) => {
                const reviews = manager.stations?.reviews || []
                const totalReviews = reviews.length

                let trustScore = 0
                let responseRate = 0
                let isGold = false

                if (totalReviews > 0) {
                    // Trust Score Calculation
                    // Formula: (Sum of (rating_meter + rating_quality)) / (Total Reviews * 2 * 5) * 100
                    const totalPoints = reviews.reduce((sum: number, r: any) => {
                        return sum + (r.rating_meter || 5) + (r.rating_quality || 5)
                    }, 0)

                    const maxPoints = totalReviews * 2 * 5
                    trustScore = Math.round((totalPoints / maxPoints) * 100)

                    // Response Rate Calculation
                    const responseCount = reviews.filter((r: any) => r.response).length
                    responseRate = Math.round((responseCount / totalReviews) * 100)

                    // Gold badge criteria: Trust >= 90%, Reviews >= 10, Response >= 90%
                    if (trustScore >= 90 && totalReviews >= 10 && responseRate >= 90) {
                        isGold = true
                    }
                }

                // Sort reviews by date descending within the manager object
                if (manager.stations?.reviews) {
                    manager.stations.reviews.sort((a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                }

                return {
                    ...manager,
                    trust_score: trustScore,
                    response_rate: responseRate,
                    total_reviews: totalReviews,
                    is_gold: isGold
                }
            })

            setManagers(processedData)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    const requestSort = (key: keyof ManagerProfile) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const searchStations = async (query: string) => {
        if (query.length < 2) return
        setIsSearchingStations(true)
        try {
            const { data, error } = await supabase
                .from('stations')
                .select('id, name, city, state')
                .ilike('name', `%${query}%`)
                .limit(5)

            if (error) throw error
            setStations(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setIsSearchingStations(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (stationSearch) searchStations(stationSearch)
        }, 300)
        return () => clearTimeout(timer)
    }, [stationSearch])

    useEffect(() => {
        if (!authLoading) {
            fetchManagers()
        }
    }, [fetchManagers, authLoading])

    const handleUpdateStatus = async (id: string, status: 'verified' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('manager_profiles')
                .update({ verification_status: status })
                .eq('id', id)

            if (error) throw error

            toast({ title: "Success", description: `Manager status updated to ${status}.` })
            fetchManagers()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleAssignStation = async (stationId: number) => {
        if (!selectedManager) return
        try {
            const { error } = await supabase
                .from('manager_profiles')
                .update({ station_id: stationId })
                .eq('id', selectedManager.id)

            if (error) throw error

            toast({ title: "Success", description: "Station assigned successfully." })
            setIsAssignDialogOpen(false)
            fetchManagers()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const filteredManagers = managers.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone_number.includes(searchTerm) ||
        m.stations?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'verified':
                return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
            default:
                return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
        }
    }

    return (
        <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        Manager Management
                    </h1>
                    <p className="text-sm text-muted-foreground">Verify and manage station managers</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchManagers} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{managers.filter(m => m.verification_status === 'pending').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Verified Managers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{managers.filter(m => m.verification_status === 'verified').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Profiles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{managers.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search managers or stations..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('full_name')}>Manager</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead className="cursor-pointer text-center" onClick={() => requestSort('trust_score')}>Trust Score</TableHead>
                                <TableHead className="cursor-pointer text-center" onClick={() => requestSort('response_rate')}>Response Rate</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('verification_status')}>Status</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('created_at')}>Registered</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredManagers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No manager profiles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredManagers
                                    .sort((a, b) => {
                                        if (!sortConfig) return 0;
                                        if (a[sortConfig.key]! < b[sortConfig.key]!) {
                                            return sortConfig.direction === 'asc' ? -1 : 1;
                                        }
                                        if (a[sortConfig.key]! > b[sortConfig.key]!) {
                                            return sortConfig.direction === 'asc' ? 1 : -1;
                                        }
                                        return 0;
                                    })
                                    .map((manager) => (
                                        <TableRow key={manager.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 cursor-pointer" onClick={() => {
                                                        setSelectedManager(manager)
                                                        setIsProfileOpen(true)
                                                    }}>
                                                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span
                                                            className="font-medium flex items-center gap-1 cursor-pointer hover:underline text-primary"
                                                            onClick={() => {
                                                                setSelectedManager(manager)
                                                                setIsProfileOpen(true)
                                                            }}
                                                        >
                                                            {manager.full_name}
                                                            {manager.is_gold && (
                                                                <div title="Gold Status Manager">
                                                                    <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                                                </div>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {manager.phone_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">{manager.stations?.name || "Not Assigned"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {manager.total_reviews && manager.total_reviews > 0 ? (
                                                    <Badge variant="outline" className={`
                                                        ${(manager.trust_score || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            (manager.trust_score || 0) >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-red-50 text-red-700 border-red-200'}
                                                    `}>
                                                        {manager.trust_score}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {manager.total_reviews && manager.total_reviews > 0 ? (
                                                    <span className="text-sm font-medium">{manager.response_rate}%</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(manager.verification_status)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(manager.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedManager(manager)
                                                            setIsProfileOpen(true)
                                                        }}>
                                                            <UserIcon className="w-4 h-4 mr-2" /> View Full Profile
                                                        </DropdownMenuItem>
                                                        {manager.verification_photo_url && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedManager(manager)
                                                                setIsPhotoOpen(true)
                                                            }}>
                                                                <ExternalLink className="w-4 h-4 mr-2" /> View Board Photo
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedManager(manager)
                                                            setIsAssignDialogOpen(true)
                                                        }}>
                                                            <MapPin className="w-4 h-4 mr-2" /> {manager.station_id ? 'Change Station' : 'Assign Station'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateStatus(manager.id, 'verified')}
                                                            disabled={manager.verification_status === 'verified'}
                                                            className="text-emerald-600"
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-2" /> Verify Manager
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateStatus(manager.id, 'rejected')}
                                                            disabled={manager.verification_status === 'rejected'}
                                                            className="text-destructive"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" /> Reject Manager
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Manager Profile View Sheet */}
            <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <SheetContent className="sm:max-w-xl w-full p-0">
                    {selectedManager && (
                        <div className="flex flex-col h-full">
                            <SheetHeader className="p-6 border-b bg-muted/20">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                        <AvatarFallback className="text-xl">
                                            {selectedManager.full_name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <SheetTitle className="text-xl flex items-center gap-2 text-left">
                                            {selectedManager.full_name}
                                            {selectedManager.is_gold && (
                                                <ShieldCheck className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                                            )}
                                        </SheetTitle>
                                        <SheetDescription className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {selectedManager.phone_number}
                                        </SheetDescription>
                                        <div className="mt-2 text-left">
                                            {getStatusBadge(selectedManager.verification_status)}
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>

                            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                                <div className="px-6 border-b bg-background text-left">
                                    <TabsList className="w-full justify-start h-12 bg-transparent gap-6 p-0">
                                        <TabsTrigger value="overview" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">Overview</TabsTrigger>
                                        <TabsTrigger value="reviews" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">Reviews</TabsTrigger>
                                        <TabsTrigger value="station" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2">Station Details</TabsTrigger>
                                    </TabsList>
                                </div>

                                <ScrollArea className="flex-1">
                                    <TabsContent value="overview" className="p-6 m-0 space-y-6">
                                        {/* Performance Section */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="bg-primary/5 border-none shadow-none">
                                                <CardContent className="p-4 pt-4">
                                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 text-left">Trust Score</div>
                                                    <div className="text-3xl font-bold text-primary text-left">{selectedManager.trust_score}%</div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-emerald-50 border-none shadow-none">
                                                <CardContent className="p-4 pt-4">
                                                    <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1 text-left">Response Rate</div>
                                                    <div className="text-3xl font-bold text-emerald-700 text-left">{selectedManager.response_rate}%</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Detailed Metrics */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-sm uppercase tracking-tight text-muted-foreground text-left">Performance Breakdown</h3>
                                            <div className="space-y-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between text-sm">
                                                        <span>Meter Accuracy</span>
                                                        <span className="font-medium">
                                                            {((selectedManager.stations?.reviews.reduce((acc, r) => acc + (r.rating_meter || 5), 0) || 0) / (selectedManager.total_reviews || 1)).toFixed(1)}/5.0
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${((selectedManager.stations?.reviews.reduce((acc, r) => acc + (r.rating_meter || 5), 0) || 0) / ((selectedManager.total_reviews || 1) * 5)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between text-sm">
                                                        <span>Fuel Quality</span>
                                                        <span className="font-medium">
                                                            {((selectedManager.stations?.reviews.reduce((acc, r) => acc + (r.rating_quality || 5), 0) || 0) / (selectedManager.total_reviews || 1)).toFixed(1)}/5.0
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${((selectedManager.stations?.reviews.reduce((acc, r) => acc + (r.rating_quality || 5), 0) || 0) / ((selectedManager.total_reviews || 1) * 5)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Board Photo Quick Link */}
                                        {selectedManager.verification_photo_url && (
                                            <div className="relative group rounded-xl overflow-hidden border aspect-video cursor-pointer" onClick={() => setIsPhotoOpen(true)}>
                                                <img
                                                    src={selectedManager.verification_photo_url}
                                                    alt="Verification Board"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="text-white w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="reviews" className="p-6 m-0 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-left">Recent Reviews ({selectedManager.total_reviews})</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {selectedManager.stations?.reviews.length === 0 ? (
                                                <div className="text-center py-12 text-muted-foreground italic bg-muted/10 rounded-xl border-2 border-dashed">
                                                    No reviews yet for this station.
                                                </div>
                                            ) : (
                                                selectedManager.stations?.reviews.map((review) => (
                                                    <div key={review.id} className="p-4 border rounded-xl space-y-3 bg-muted/5 text-left">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-7 w-7">
                                                                    <AvatarImage src={review.user?.avatar_url || ''} />
                                                                    <AvatarFallback>{review.user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-medium">{review.user?.full_name || 'Anonymous User'}</span>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50">M: {review.rating_meter}/5</Badge>
                                                                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-emerald-50">Q: {review.rating_quality}/5</Badge>
                                                            </div>
                                                        </div>
                                                        {review.comment && (
                                                            <p className="text-sm text-balance text-muted-foreground italic">"{review.comment}"</p>
                                                        )}
                                                        {review.response ? (
                                                            <div className="ml-4 p-3 bg-primary/5 border-l-2 border-primary rounded-r-lg">
                                                                <p className="text-[13px] font-semibold text-primary mb-1">Manager Response:</p>
                                                                <p className="text-[13px]">{review.response}</p>
                                                                <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(review.responded_at || ''), 'MMM d, yyyy')}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end">
                                                                <p className="text-[10px] text-amber-600 font-medium font-bold italic">No response provided</p>
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-muted-foreground font-medium text-right pt-1 border-t">
                                                            Submitted on {format(new Date(review.created_at), 'PPP')}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="station" className="p-6 m-0 space-y-6">
                                        {selectedManager.stations ? (
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl text-left">
                                                    <div className="p-2.5 bg-background rounded-lg border shadow-sm text-primary">
                                                        <MapPin className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-base">{selectedManager.stations.name}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                            {selectedManager.stations.address || 'No specific address available'}
                                                            <br />
                                                            {selectedManager.stations.state}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 border rounded-xl bg-background shadow-sm text-left">
                                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Latitude</p>
                                                        <p className="font-mono text-sm">{selectedManager.stations.latitude.toFixed(6)}</p>
                                                    </div>
                                                    <div className="p-4 border rounded-xl bg-background shadow-sm text-left">
                                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Longitude</p>
                                                        <p className="font-mono text-sm">{selectedManager.stations.longitude.toFixed(6)}</p>
                                                    </div>
                                                </div>

                                                <Button
                                                    className="w-full h-12 text-sm font-semibold rounded-xl"
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedManager.stations?.latitude},${selectedManager.stations?.longitude}`, '_blank')}
                                                >
                                                    <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Maps
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground italic bg-muted/10 rounded-xl border-2 border-dashed">
                                                No station assigned to this manager.
                                            </div>
                                        )}
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Photo View Dialog */}
            <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
                <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-sm border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Verification Photo</DialogTitle>
                        <DialogDescription>
                            Price board confirmation from {selectedManager?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center bg-black/5 rounded-2xl overflow-hidden border shadow-inner">
                        {selectedManager?.verification_photo_url ? (
                            <img
                                src={selectedManager.verification_photo_url}
                                alt="Station board"
                                className="max-h-[70vh] w-full object-contain"
                            />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground italic">
                                No photo available
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Assign Station Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Station</DialogTitle>
                        <DialogDescription>
                            Search and select a station for {selectedManager?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search station name..."
                                className="pl-10 h-11 rounded-xl"
                                value={stationSearch}
                                onChange={e => setStationSearch(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="h-64 pr-4">
                            <div className="space-y-2">
                                {isSearchingStations ? (
                                    <div className="text-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </div>
                                ) : stations.length > 0 ? (
                                    stations.map(station => (
                                        <div
                                            key={station.id}
                                            className="flex items-center justify-between p-3.5 border rounded-xl hover:bg-primary/5 hover:border-primary/20 cursor-pointer transition-all active:scale-[0.98]"
                                            onClick={() => handleAssignStation(station.id)}
                                        >
                                            <div className="flex-1 min-w-0 pr-4 text-left">
                                                <div className="font-semibold text-sm truncate">{station.name}</div>
                                                <div className="text-xs text-muted-foreground truncate">{station.city}, {station.state}</div>
                                            </div>
                                            <Button size="sm" variant="outline" className="rounded-lg h-8 px-3 shrink-0">Select</Button>
                                        </div>
                                    ))
                                ) : stationSearch.length >= 2 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        No stations found matching "{stationSearch}"
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-sm text-muted-foreground italic">
                                        Type at least 2 characters to search...
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

