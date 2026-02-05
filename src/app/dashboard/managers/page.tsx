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

interface ManagerProfile {
    id: string
    full_name: string
    phone_number: string
    station_id: number | null
    verification_status: 'pending' | 'verified' | 'rejected'
    verification_photo_url: string | null
    created_at: string
    stations?: {
        name: string
    }
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
    const [stationSearch, setStationSearch] = useState("")
    const [stations, setStations] = useState<{ id: number, name: string, city: string, state: string }[]>([])
    const [isSearchingStations, setIsSearchingStations] = useState(false)

    const fetchManagers = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('manager_profiles')
                .select(`
          *,
          stations (
            name
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setManagers(data || [])
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

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
                                <TableHead>Manager</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredManagers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No manager profiles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredManagers.map((manager) => (
                                    <TableRow key={manager.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{manager.full_name}</span>
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

            {/* Photo View Dialog */}
            <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Verification Photo</DialogTitle>
                        <DialogDescription>
                            Photo of the station price board provided by {selectedManager?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center bg-black/5 rounded-lg overflow-hidden border">
                        {selectedManager?.verification_photo_url ? (
                            <img
                                src={selectedManager.verification_photo_url}
                                alt="Station board"
                                className="max-h-[60vh] object-contain"
                            />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground italic">
                                No photo available
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsPhotoOpen(false)}>Close</Button>
                    </DialogFooter>
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
                                className="pl-10"
                                value={stationSearch}
                                onChange={e => setStationSearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            {isSearchingStations ? (
                                <div className="text-center py-4">
                                    <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                                </div>
                            ) : stations.length > 0 ? (
                                stations.map(station => (
                                    <div
                                        key={station.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleAssignStation(station.id)}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{station.name}</div>
                                            <div className="text-xs text-muted-foreground">{station.city}, {station.state}</div>
                                        </div>
                                        <Button size="sm" variant="ghost">Select</Button>
                                    </div>
                                ))
                            ) : stationSearch.length >= 2 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                    No stations found matching "{stationSearch}"
                                </div>
                            ) : (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                    Type at least 2 characters to search...
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
