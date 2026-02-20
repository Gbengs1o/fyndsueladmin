"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
    Users,
    CheckCircle2,
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
    MoreVertical,
    Eye,
    ImageIcon,
    Mail,
    ShieldAlert,
    Star,
    Building2,
    Activity,
    AlertTriangle,
    ShieldX,
    Shield
} from "lucide-react"
import { format, formatDistanceToNow, isValid } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
    rating_meter?: number
    rating_quality?: number
    rating: number // overall
    comment: string | null
    response: string | null
    responded_at: string | null
    created_at: string
    profiles?: {
        full_name: string | null
        avatar_url: string | null
    } | null
    user?: {
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
        is_verified?: boolean
        is_active?: boolean
        brand?: string | null
        reviews: Review[]
        flagged_stations?: {
            id: number
            reason: string
            created_at: string
            profiles?: { full_name: string | null; avatar_url: string | null }
        }[]
    }
    profiles?: {
        email: string | null
        avatar_url: string | null
        is_banned: boolean
        price_reports?: {
            id: number
            price: number
            fuel_type: string
            created_at: string
            notes: string
            rating: number
        }[]
        point_transactions?: {
            id: number
            amount: number
            description: string | null
            type: string
            created_at: string
        }[]
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
    const router = useRouter()
    const [managers, setManagers] = useState<ManagerProfile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Modal states
    const [selectedManager, setSelectedManager] = useState<ManagerProfile | null>(null)
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
    const [isPhotoOpen, setIsPhotoOpen] = useState(false)
    const [isLedgerOpen, setIsLedgerOpen] = useState(false)
    const [stationSearch, setStationSearch] = useState("")
    const [stations, setStations] = useState<any[]>([])
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
            is_verified,
            is_active,
            brand,
            flagged_stations ( 
              id, 
              reason, 
              created_at,
              profiles:user_id ( full_name, avatar_url )
            ),
            reviews (
                id,
                rating,
                rating_meter,
                rating_quality,
                comment,
                response,
                responded_at,
                created_at,
                profiles:user_id (
                    full_name,
                    avatar_url
                )
            )
          ),
          profiles!id (
            email,
            avatar_url,
            is_banned,
            price_reports!user_id (
              id,
              price,
              fuel_type,
              created_at,
              notes,
              rating
            ),
            point_transactions!user_id (
              id,
              amount,
              description,
              type,
              created_at
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
                    const totalPoints = reviews.reduce((sum: number, r: any) => {
                        return sum + (r.rating_meter || 5) + (r.rating_quality || 5)
                    }, 0)

                    const maxPoints = totalReviews * 2 * 5
                    trustScore = Math.round((totalPoints / maxPoints) * 100)

                    // Response Rate Calculation
                    const responseCount = reviews.filter((r: any) => r.response).length
                    responseRate = Math.round((responseCount / totalReviews) * 100)

                    // Gold badge criteria
                    if (trustScore >= 90 && totalReviews >= 10 && responseRate >= 90) {
                        isGold = true
                    }
                }

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

    const handleToggleBan = async (id: string, currentBanStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: !currentBanStatus })
                .eq('id', id)

            if (error) throw error

            toast({
                title: "Success",
                description: `Manager ${currentBanStatus ? 'unbanned' : 'banned'} successfully.`
            })
            fetchManagers()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleRowClick = (manager: ManagerProfile) => {
        router.push(`/dashboard/managers/${manager.id}`)
    }

    const calculateStationHealth = (station?: ManagerProfile['stations']) => {
        if (!station) return null
        let score = 60
        if (station.is_verified) score += 20
        if (station.is_active === false) score -= 40
        const flags = station.flagged_stations?.length || 0
        score -= flags * 15
        score = Math.max(0, Math.min(100, score))

        if (score >= 80) return { score, label: 'Excellent', color: 'text-emerald-500', icon: ShieldCheck }
        if (score >= 50) return { score, label: 'Good', color: 'text-amber-500', icon: Shield }
        return { score, label: 'Poor', color: 'text-red-500', icon: ShieldX }
    }

    const filteredManagers = managers.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone_number.includes(searchTerm) ||
        m.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left">
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
                    <CardHeader className="pb-2 text-left">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className="text-2xl font-bold">{managers.filter(m => m.verification_status === 'pending').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-left">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Verified Managers</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className="text-2xl font-bold text-emerald-600">{managers.filter(m => m.verification_status === 'verified').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 text-left">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Profiles</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left">
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
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="cursor-pointer" onClick={() => requestSort('full_name')}>Manager</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="cursor-pointer text-center" onClick={() => requestSort('trust_score')}>Trust Score</TableHead>
                                <TableHead className="cursor-pointer text-center" onClick={() => requestSort('response_rate')}>Resp. Rate</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => requestSort('created_at')}>Registered</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredManagers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No manager profiles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredManagers
                                    .sort((a, b) => {
                                        if (!sortConfig) return 0;
                                        const valA = a[sortConfig.key] ?? '';
                                        const valB = b[sortConfig.key] ?? '';
                                        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                                        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                                        return 0;
                                    })
                                    .map((manager) => (
                                        <TableRow
                                            key={manager.id}
                                            className={`group cursor-pointer transition-colors hover:bg-muted/50 ${manager.profiles?.is_banned ? 'opacity-60 bg-red-50/10' : ''}`}
                                            onClick={() => handleRowClick(manager)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={manager.profiles?.avatar_url || ''} />
                                                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium flex items-center gap-1 text-primary">
                                                            {manager.full_name}
                                                            {manager.is_gold && (
                                                                <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                                                            )}
                                                            {manager.profiles?.is_banned && (
                                                                <Badge variant="destructive" className="h-4 px-1 text-[10px] uppercase font-bold">Banned</Badge>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{manager.profiles?.email || manager.phone_number}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(manager.verification_status)}</TableCell>
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
                                                    <span className="text-xs text-muted-foreground italic">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {manager.total_reviews && manager.total_reviews > 0 ? (
                                                    <span className="text-sm font-medium">{manager.response_rate}%</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-left">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm truncate max-w-[150px]">{manager.stations?.name || "Not Assigned"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(manager.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleRowClick(manager)}>
                                                            <Eye className="w-4 h-4 mr-2" /> View Full Profile
                                                        </DropdownMenuItem>
                                                        {manager.verification_photo_url && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedManager(manager)
                                                                setIsPhotoOpen(true)
                                                            }}>
                                                                <ImageIcon className="w-4 h-4 mr-2" /> View ID Photo
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedManager(manager)
                                                            setIsAssignDialogOpen(true)
                                                        }}>
                                                            <MapPin className="w-4 h-4 mr-2" /> {manager.station_id ? 'Change Station' : 'Assign Station'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Verification</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateStatus(manager.id, 'verified')}
                                                            disabled={manager.verification_status === 'verified'}
                                                            className="text-emerald-600"
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-2" /> Approve Manager
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleUpdateStatus(manager.id, 'rejected')}
                                                            disabled={manager.verification_status === 'rejected'}
                                                            className="text-destructive"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" /> Reject Manager
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Account Control</DropdownMenuLabel>
                                                        {manager.profiles?.is_banned ? (
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggleBan(manager.id, true)}
                                                                className="text-blue-600"
                                                            >
                                                                <ShieldCheck className="h-4 w-4 mr-2" /> Unban Account
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => handleToggleBan(manager.id, false)}
                                                                className="text-red-600"
                                                            >
                                                                <ShieldX className="h-4 w-4 mr-2" /> Ban Account
                                                            </DropdownMenuItem>
                                                        )}
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

            {/* Remaining Dialogs for Management Actions */}

            {/* Point Ledger Dialog */}
            <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Star className="h-6 w-6 text-primary fill-primary/20" />
                            Points Ledger: {selectedManager?.full_name}
                        </DialogTitle>
                        <DialogDescription>
                            Complete history of reward points transactions.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 border rounded-xl">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0">
                                <TableRow>
                                    <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold">Description</TableHead>
                                    <TableHead className="text-[10px] uppercase font-bold text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedManager?.profiles?.point_transactions?.length ? (
                                    selectedManager.profiles.point_transactions
                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(t.created_at), 'MMM dd, HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={t.amount > 0 ? "success" : "destructive"} className="text-[9px] px-1.5 uppercase font-black tracking-tighter">
                                                        {t.amount > 0 ? "Credit" : "Debit"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">{t.description || 'System reward'}</TableCell>
                                                <TableCell className={`text-right font-black ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">No transactions found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <div className="mt-6 p-5 rounded-2xl bg-primary/5 border border-primary/20 flex justify-between items-center shadow-inner">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Balance</span>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-primary">
                                {selectedManager?.profiles?.point_transactions?.reduce((sum, t) => sum + t.amount, 0) || 0}
                            </span>
                            <Star className="h-6 w-6 text-primary fill-primary" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
