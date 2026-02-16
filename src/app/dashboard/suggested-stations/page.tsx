"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { logAdminAction } from "@/lib/admin-logger"
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps"
import {
  Loader2,
  User as UserIcon,
  Check,
  X,
  MapPin,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Inbox,
  Calendar,
  Building2,
  Trash2,
  MoreHorizontal
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SuggestedStation {
  id: number
  name: string | null
  address: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  latitude: number | null
  longitude: number | null
  submitted_by: string | null
  full_name: string | null
  avatar_url: string | null
}

interface Stats {
  pending: number
  approved: number
  rejected: number
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType
  label: string
  value: number
  variant?: 'default' | 'warning' | 'success' | 'danger'
}) {
  const colors = {
    default: 'bg-muted text-foreground',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[variant]}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

const NIGERIA_CENTER = { lat: 9.0820, lng: 8.6753 }

export default function SuggestedStationsPage() {
  const { isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("pending")
  const [suggestions, setSuggestions] = useState<SuggestedStation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Stats
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 })

  // Detail dialog
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedStation | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Delete dialog
  const [suggestionToDelete, setSuggestionToDelete] = useState<SuggestedStation | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Separate fetch for stats (counts)
  const fetchStats = useCallback(async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        supabase.from('suggested_fuel_stations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('suggested_fuel_stations').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('suggested_fuel_stations').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
      ])

      setStats({
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

  // Fetch suggestions optimized for active tab
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)

    try {
      let query = supabase
        .from('suggested_fuel_stations')
        .select(`
          id, name, address, status, created_at, latitude, longitude, submitted_by,
          profiles!suggested_fuel_stations_submitted_by_profiles_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50) // Pagination limit

      // Filter by active tab status
      if (activeTab !== 'all') { // Although 'all' isn't a current tab option, handling for robustness
        query = query.eq('status', activeTab)
      }

      // If there is a search term, we might need a different query or handle it differently
      // Ideally search should be server-side too, but for simplicity with tabs:
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      } else {
        const formatted = (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          status: s.status,
          created_at: s.created_at,
          latitude: s.latitude,
          longitude: s.longitude,
          submitted_by: s.submitted_by,
          full_name: s.profiles?.full_name || null,
          avatar_url: s.profiles?.avatar_url || null
        }))
        setSuggestions(formatted)
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error.message)
      toast({ variant: "destructive", title: "Error", description: error.message })
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, searchTerm, toast])

  // Initial load
  useEffect(() => {
    if (!authLoading) {
      fetchStats()
      fetchSuggestions()
    }
  }, [authLoading, fetchStats, fetchSuggestions]) // fetchSuggestions dependencies include activeTab

  const handleApprove = async (suggestion: SuggestedStation) => {
    setIsProcessing(true)

    // 1. Insert into stations table
    const { data: newStation, error: insertError } = await supabase
      .from('stations')
      .insert({
        name: suggestion.name,
        address: suggestion.address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        is_active: true,
        submitted_by: suggestion.submitted_by,
        created_by_user: true,
        origin_type: 'suggestion'
      })
      .select()
      .single()

    if (insertError) {
      toast({ variant: "destructive", title: "Approval Failed", description: insertError.message })
      setIsProcessing(false)
      return
    }

    // 2. Update suggestion status
    const { error: updateError } = await supabase
      .from('suggested_fuel_stations')
      .update({ status: 'approved' })
      .eq('id', suggestion.id)

    if (updateError) {
      toast({ variant: "destructive", title: "Partial Failure", description: updateError.message })
    } else {
      await logAdminAction('APPROVE_SUGGESTION', 'suggested_fuel_stations', suggestion.id.toString(), {
        created_station_id: newStation.id,
        suggestion_details: suggestion,
        name: suggestion.name,
        address: suggestion.address
      })
      toast({ title: "Approved!", description: `"${suggestion.name}" has been added as a station.` })
    }

    setIsProcessing(false)
    setIsDetailOpen(false)
    fetchStats() // Refresh counts
    fetchSuggestions() // Refresh list
  }

  const handleReject = async (suggestion: SuggestedStation) => {
    setIsProcessing(true)

    const { error } = await supabase
      .from('suggested_fuel_stations')
      .update({ status: 'rejected' })
      .eq('id', suggestion.id)

    if (error) {
      toast({ variant: "destructive", title: "Rejection Failed", description: error.message })
    } else {
      await logAdminAction('REJECT_SUGGESTION', 'suggested_fuel_stations', suggestion.id.toString(), {
        name: suggestion.name,
        previous_status: 'pending'
      })
      toast({ title: "Rejected", description: "Suggestion has been rejected." })
    }

    setIsProcessing(false)
    setIsDetailOpen(false)
    fetchStats() // Refresh counts
    fetchSuggestions() // Refresh list
  }

  const handleDelete = async () => {
    if (!suggestionToDelete) return
    setIsProcessing(true)

    // Snapshot before delete
    const { data: previousState } = await supabase.from('suggested_fuel_stations').select('*').eq('id', suggestionToDelete.id).single()

    const { error } = await supabase
      .from('suggested_fuel_stations')
      .delete()
      .eq('id', suggestionToDelete.id)

    if (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    } else {
      if (previousState) {
        await logAdminAction('DELETE_SUGGESTION', 'suggested_fuel_stations', suggestionToDelete.id.toString(), {
          name: suggestionToDelete.name,
          previous_state: previousState
        })
      }
      toast({ title: "Deleted", description: "Suggestion has been permanently deleted." })
    }

    setIsProcessing(false)
    setSuggestionToDelete(null)
    fetchStats() // Refresh counts
    fetchSuggestions() // Refresh list
  }

  const openDetail = (suggestion: SuggestedStation) => {
    setSelectedSuggestion(suggestion)
    setIsDetailOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Pending</Badge>
      case 'approved':
        return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Approved</Badge>
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Use suggestions directly since they are already filtered by server
  const displaySuggestions = suggestions

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Suggested Stations
          </h1>
          <p className="text-sm text-muted-foreground">Review and moderate community-submitted fuel stations</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchSuggestions(); }} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="flex flex-wrap gap-3">
        <StatBadge icon={Clock} label="Pending Review" value={stats.pending} variant={stats.pending > 0 ? 'warning' : 'default'} />
        <StatBadge icon={CheckCircle2} label="Approved" value={stats.approved} variant="success" />
        <StatBadge icon={XCircle} label="Rejected" value={stats.rejected} variant="danger" />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" /> Pending
              {stats.pending > 0 && <span className="ml-1 text-xs bg-amber-500 text-white rounded-full px-1.5">{stats.pending}</span>}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" /> Rejected
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suggestions..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {['pending', 'approved', 'rejected'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card className="chart-container">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium">Station Details</TableHead>
                      <TableHead className="text-xs font-medium">Location</TableHead>
                      <TableHead className="text-xs font-medium">Submitted By</TableHead>
                      <TableHead className="text-xs font-medium">Date</TableHead>
                      <TableHead className="text-right text-xs font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : displaySuggestions.length > 0 ? (
                      displaySuggestions.map((item) => (
                        <TableRow key={item.id} className="table-row-hover cursor-pointer" onClick={() => openDetail(item)}>
                          <TableCell>
                            <div className="font-medium text-sm">{item.name || "Unnamed Station"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.address || "No address"}</div>
                          </TableCell>
                          <TableCell>
                            {item.latitude && item.longitude ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                <MapPin className="h-3 w-3" />
                                View on map
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">No coordinates</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.submitted_by ? (
                              <Link
                                href={`/dashboard/users/${item.submitted_by}`}
                                className="flex items-center gap-2 hover:opacity-80"
                                onClick={e => e.stopPropagation()}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={item.avatar_url || ''} />
                                  <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                                </Avatar>
                                <span className="text-sm hover:underline">{item.full_name || 'Anonymous'}</span>
                              </Link>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">Anonymous</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                              {tabValue === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(item)}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(item)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => openDetail(item)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                  {item.latitude && item.longitude && (
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" /> Open in Maps
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setSuggestionToDelete(item)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Inbox className="h-10 w-10 opacity-50" />
                            <span>No {tabValue === 'pending' ? 'pending' : tabValue} suggestions</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing top 50 {tabValue} suggestions
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedSuggestion?.name || "Unnamed Station"}
            </DialogTitle>
            <DialogDescription>
              Review the details of this suggested station
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(selectedSuggestion.status)}
              </div>

              {/* Map Preview */}
              {selectedSuggestion.latitude && selectedSuggestion.longitude && apiKey && (
                <div className="h-[200px] w-full rounded-lg overflow-hidden border">
                  <APIProvider apiKey={apiKey}>
                    <Map
                      defaultCenter={{ lat: selectedSuggestion.latitude, lng: selectedSuggestion.longitude }}
                      defaultZoom={14}
                      mapId="suggestion-preview"
                      disableDefaultUI={true}
                    >
                      <AdvancedMarker position={{ lat: selectedSuggestion.latitude, lng: selectedSuggestion.longitude }}>
                        <Pin background="#f59e0b" glyphColor="white" borderColor="#d97706" />
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Address</span>
                  <div className="font-medium text-sm">{selectedSuggestion.address || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Coordinates</span>
                  <div className="font-medium text-sm font-mono">
                    {selectedSuggestion.latitude && selectedSuggestion.longitude
                      ? `${selectedSuggestion.latitude.toFixed(4)}, ${selectedSuggestion.longitude.toFixed(4)}`
                      : 'Not provided'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Submitted By</span>
                  {selectedSuggestion.submitted_by ? (
                    <Link
                      href={`/dashboard/users/${selectedSuggestion.submitted_by}`}
                      className="flex items-center gap-2 mt-1 p-2 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedSuggestion.avatar_url || ''} />
                        <AvatarFallback className="text-xs"><UserIcon className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm group-hover:underline">{selectedSuggestion.full_name || 'Anonymous'}</div>
                        <div className="text-xs text-muted-foreground">Click to view profile</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm text-muted-foreground">Anonymous</span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Submitted On</span>
                  <div className="font-medium text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedSuggestion.created_at), 'MMM d, yyyy')} at {format(new Date(selectedSuggestion.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              {selectedSuggestion.status === 'pending' && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(selectedSuggestion)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Approve & Add Station
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(selectedSuggestion)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              )}

              {selectedSuggestion.status !== 'pending' && (
                <div className="text-center text-sm text-muted-foreground">
                  This suggestion has already been {selectedSuggestion.status}.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!suggestionToDelete} onOpenChange={() => setSuggestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the suggestion for <strong>"{suggestionToDelete?.name}"</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
