"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  PlusCircle,
  MoreHorizontal,
  File,
  Loader2,
  Search,
  MapIcon,
  List,
  Lightbulb,
  Check,
  X,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Fuel,
  Users,
  Flag,
  Activity
} from "lucide-react"
import { logAdminAction } from "@/lib/admin-logger"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { format, formatDistanceToNow } from "date-fns"
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface Station {
  id: number
  name: string
  address: string | null
  brand: string | null
  is_active: boolean
  latitude: number | null
  longitude: number | null
  created_at: string
  price_reports: { count: number }[]
}

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

interface MapStation {
  id: number
  name: string
  address: string | null
  latitude: number
  longitude: number
  brand: string | null
  is_active: boolean
  flag_count: number
}

const STATIONS_PER_PAGE = 15
const NIGERIA_CENTER = { lat: 9.0820, lng: 8.6753 }

// Stat Card Component
function StatBadge({ icon: Icon, label, value, variant = 'default' }: { icon: React.ElementType; label: string; value: number; variant?: 'default' | 'warning' | 'danger' }) {
  const colors = {
    default: 'bg-muted text-foreground',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
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

export default function StationsPage() {
  const { isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("list")
  const [stations, setStations] = useState<Station[]>([])
  const [mapStations, setMapStations] = useState<MapStation[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedStation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true)
  const [totalStations, setTotalStations] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState("all")
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 400)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [stationToEdit, setStationToEdit] = useState<Partial<Station> | null>(null)
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null)
  const [selectedMapStation, setSelectedMapStation] = useState<MapStation | null>(null)
  const [stationToPreview, setStationToPreview] = useState<Station | null>(null)

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, flagged: 0, pending: 0 })

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: flagged },
      { count: pending }
    ] = await Promise.all([
      supabase.from('stations').select('*', { count: 'exact', head: true }),
      supabase.from('stations').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('stations').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('flagged_stations').select('*', { count: 'exact', head: true }),
      supabase.from('suggested_fuel_stations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setStats({
      total: total ?? 0,
      active: active ?? 0,
      inactive: inactive ?? 0,
      flagged: flagged ?? 0,
      pending: pending ?? 0
    })
  }, [])

  // Fetch Stations List
  const fetchStations = useCallback(async () => {
    setIsLoading(true)
    const from = (currentPage - 1) * STATIONS_PER_PAGE
    const to = from + STATIONS_PER_PAGE - 1

    let query = supabase
      .from('stations')
      .select('*, price_reports(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,address.ilike.%${debouncedSearchTerm}%,brand.ilike.%${debouncedSearchTerm}%`)
    }

    if (filterStatus === 'active') {
      query = query.eq('is_active', true)
    }
    if (filterStatus === 'inactive') {
      query = query.eq('is_active', false)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching stations:", error)
      toast({ variant: "destructive", title: "Error", description: error.message })
      setStations([])
    } else {
      setStations(data as Station[] || [])
      setTotalStations(count ?? 0)
    }
    setIsLoading(false)
  }, [currentPage, debouncedSearchTerm, filterStatus, toast])

  // Fetch Map Stations with flag counts
  const fetchMapStations = useCallback(async () => {
    setIsMapLoading(true)

    // Get all stations with coordinates
    const { data: stationData, error } = await supabase
      .from('stations')
      .select('id, name, address, latitude, longitude, brand, is_active')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (error) {
      console.error("Error fetching map stations:", error)
      setMapStations([])
      setIsMapLoading(false)
      return
    }

    // Get flag counts per station
    const { data: flagData } = await supabase
      .from('flagged_stations')
      .select('station_id')

    const flagCounts: Record<number, number> = {}
    flagData?.forEach(f => {
      flagCounts[f.station_id] = (flagCounts[f.station_id] || 0) + 1
    })

    const stationsWithFlags = stationData.map(s => ({
      ...s,
      flag_count: flagCounts[s.id] || 0
    }))

    setMapStations(stationsWithFlags as MapStation[])
    setIsMapLoading(false)
  }, [])

  // Fetch Suggestions
  const fetchSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true)

    const { data, error } = await supabase
      .rpc('get_pending_suggestions_with_profiles', { _limit: 50 })

    if (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    } else {
      setSuggestions(data || [])
    }
    setIsSuggestionsLoading(false)
  }, [])

  useEffect(() => {
    if (!authLoading) {
      fetchStats()
      fetchStations()
      fetchMapStations()
      fetchSuggestions()
    }
  }, [authLoading, fetchStats, fetchStations, fetchMapStations, fetchSuggestions])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filterStatus])

  // CRUD Handlers
  const handleSaveStation = async () => {
    if (!stationToEdit?.name) {
      toast({ variant: "destructive", title: "Missing Name", description: "Station name is required." })
      return
    }

    const { price_reports, ...updates } = stationToEdit

    // For Undo: Snapshot previous state if editing
    let previousState = null;
    if (stationToEdit.id) {
      const { data } = await supabase.from('stations').select('*').eq('id', stationToEdit.id).single();
      previousState = data;
    }

    const { data: resultData, error } = stationToEdit.id
      ? await supabase.from('stations').update(updates).eq('id', stationToEdit.id).select().single()
      : await supabase.from('stations').insert(updates).select().single()

    if (error) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message })
    } else {
      await logAdminAction(
        stationToEdit.id ? 'UPDATE_STATION' : 'CREATE_STATION',
        'stations',
        resultData.id.toString(),
        {
          station_name: resultData.name,
          previous_state: previousState
        }
      )

      toast({ title: "Success", description: `Station ${stationToEdit.id ? 'updated' : 'added'}.` })
      setIsFormOpen(false)
      fetchStations()
      fetchMapStations()
      fetchStats()
    }
  }

  const handleDeleteStation = async () => {
    if (!stationToDelete) return

    // For Undo: Snapshot the station being deleted
    const { data: previousState } = await supabase.from('stations').select('*').eq('id', stationToDelete.id).single()

    const { error } = await supabase.from('stations').delete().eq('id', stationToDelete.id)
    if (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    } else {
      if (previousState) {
        await logAdminAction(
          'DELETE_STATION',
          'stations',
          stationToDelete.id.toString(),
          {
            station_name: stationToDelete.name,
            previous_state: previousState
          }
        )
      }
      toast({ title: "Success", description: `Station "${stationToDelete.name}" deleted.` })
      setStationToDelete(null)
      fetchStations()
      fetchMapStations()
      fetchStats()
    }
  }

  const handleToggleStatus = async (station: Station) => {
    // For Undo: previous state is trivial (just invert the toggle), but complete snapshot is safer
    const previousState = { ...station };

    const { error } = await supabase.from('stations').update({ is_active: !station.is_active }).eq('id', station.id)
    if (error) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } else {
      await logAdminAction(
        'UPDATE_STATION',
        'stations',
        station.id.toString(),
        {
          station_name: station.name,
          change: 'status_toggle',
          new_status: !station.is_active,
          previous_state: previousState
        }
      )
      toast({ title: "Success", description: `${station.name} is now ${!station.is_active ? 'Active' : 'Inactive'}.` })
      fetchStations()
      fetchMapStations()
      fetchStats()
    }
  }

  const openFormDialog = (station?: Station) => {
    setStationToEdit(station || { name: '', address: '', brand: '', is_active: true })
    setIsFormOpen(true)
  }

  // Suggestion Handlers
  const handleApproveSuggestion = async (suggestion: SuggestedStation) => {
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
      return
    }

    const { error: updateError } = await supabase
      .from('suggested_fuel_stations')
      .update({ status: 'approved' })
      .eq('id', suggestion.id)

    if (updateError) {
      toast({ variant: "destructive", title: "Partial Failure", description: updateError.message })
    } else {
      await logAdminAction(
        'APPROVE_SUGGESTION',
        'suggested_fuel_stations',
        suggestion.id.toString(),
        {
          created_station_id: newStation.id,
          suggestion_details: suggestion
        }
      )
      toast({ title: "Approved!", description: `"${suggestion.name}" has been added as a station.` })
    }

    fetchSuggestions()
    fetchStations()
    fetchMapStations()
    fetchStats()
  }

  const handleRejectSuggestion = async (id: number) => {
    const { error } = await supabase
      .from('suggested_fuel_stations')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) {
      toast({ variant: "destructive", title: "Rejection Failed", description: error.message })
    } else {
      await logAdminAction(
        'REJECT_SUGGESTION',
        'suggested_fuel_stations',
        id.toString(),
        { previous_status: 'pending' }
      )
      toast({ title: "Rejected", description: "Suggestion has been rejected." })
      fetchSuggestions()
      fetchStats()
    }
  }

  // Export Handler
  const handleExport = () => {
    // Create CSV from stations
    const headers = ['Name', 'Address', 'Brand', 'Status', 'Latitude', 'Longitude']
    const rows = stations.map(s => [
      s.name,
      s.address || '',
      s.brand || '',
      s.is_active ? 'Active' : 'Inactive',
      s.latitude?.toString() || '',
      s.longitude?.toString() || ''
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stations-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: `${stations.length} stations exported to CSV.` })
  }

  const totalPages = Math.ceil(totalStations / STATIONS_PER_PAGE)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Get marker color based on status and flags
  const getMarkerColor = (station: MapStation) => {
    if (station.flag_count >= 3) return { bg: '#ef4444', border: '#b91c1c' } // Red - high risk
    if (station.flag_count >= 1) return { bg: '#f59e0b', border: '#d97706' } // Amber - flagged
    if (!station.is_active) return { bg: '#6b7280', border: '#4b5563' } // Gray - inactive
    return { bg: '#10b981', border: '#059669' } // Green - healthy
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Station Management</h1>
          <p className="text-sm text-muted-foreground">Manage, monitor, and moderate fuel stations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => openFormDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Station
          </Button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="flex flex-wrap gap-3">
        <StatBadge icon={Fuel} label="Total" value={stats.total} />
        <StatBadge icon={Activity} label="Active" value={stats.active} />
        <StatBadge icon={ToggleLeft} label="Inactive" value={stats.inactive} />
        <StatBadge icon={Flag} label="Flagged" value={stats.flagged} variant={stats.flagged > 0 ? 'danger' : 'default'} />
        <StatBadge icon={Lightbulb} label="Pending Review" value={stats.pending} variant={stats.pending > 0 ? 'warning' : 'default'} />
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" /> List
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <MapIcon className="h-4 w-4" /> Map
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Lightbulb className="h-4 w-4" /> Pending
            {stats.pending > 0 && (
              <span className="ml-1 text-xs bg-amber-500 text-white rounded-full px-1.5">{stats.pending}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <Card className="chart-container">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, address, or brand..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >All</Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('active')}
                  >Active</Button>
                  <Button
                    variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('inactive')}
                  >Inactive</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium">Station</TableHead>
                    <TableHead className="text-xs font-medium">Brand</TableHead>
                    <TableHead className="text-xs font-medium">Status</TableHead>
                    <TableHead className="text-xs font-medium">Reports</TableHead>
                    <TableHead className="text-xs font-medium">Added</TableHead>
                    <TableHead className="text-right text-xs font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : stations.length > 0 ? (
                    stations.map((station) => (
                      <TableRow key={station.id} className="table-row-hover">
                        <TableCell>
                          <div className="font-medium text-sm">{station.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{station.address || 'No address'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{station.brand || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs font-normal ${station.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
                              }`}
                          >
                            {station.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{station.price_reports[0]?.count ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {station.created_at ? format(new Date(station.created_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/stations/${station.id}`} className="flex items-center">
                                  <Eye className="mr-2 h-4 w-4" /> View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openFormDialog(station)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(station)}>
                                {station.is_active ? (
                                  <><ToggleLeft className="mr-2 h-4 w-4" /> Set Inactive</>
                                ) : (
                                  <><ToggleRight className="mr-2 h-4 w-4" /> Set Active</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setStationToDelete(station)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No stations found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex items-center justify-between py-4 border-t">
              <div className="text-sm text-muted-foreground">
                {totalStations > 0
                  ? `Showing ${Math.min((currentPage - 1) * STATIONS_PER_PAGE + 1, totalStations)}–${Math.min(currentPage * STATIONS_PER_PAGE, totalStations)} of ${totalStations}`
                  : "0 stations"}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Map View */}
        <TabsContent value="map" className="mt-6">
          <Card className="chart-container overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Interactive Map</CardTitle>
                  <CardDescription>{mapStations.length} stations with coordinates</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Healthy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>High Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <span>Inactive</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <div className="h-[65vh] w-full">
              {isMapLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !apiKey ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Google Maps API key not configured
                </div>
              ) : (
                <APIProvider apiKey={apiKey}>
                  <Map
                    defaultCenter={NIGERIA_CENTER}
                    defaultZoom={6}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    mapId="fynd-fuel-admin-map"
                    streetViewControl={false}
                    fullscreenControl={false}
                  >
                    {mapStations.map((station) => {
                      const colors = getMarkerColor(station)
                      return (
                        <AdvancedMarker
                          key={station.id}
                          position={{ lat: station.latitude, lng: station.longitude }}
                          onClick={() => setSelectedMapStation(station)}
                          title={station.name}
                        >
                          <Pin
                            background={colors.bg}
                            borderColor={colors.border}
                            glyphColor="#ffffff"
                          />
                        </AdvancedMarker>
                      )
                    })}

                    {selectedMapStation && (
                      <InfoWindow
                        position={{ lat: selectedMapStation.latitude, lng: selectedMapStation.longitude }}
                        onCloseClick={() => setSelectedMapStation(null)}
                        pixelOffset={[0, -35]}
                      >
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-semibold text-sm mb-1">{selectedMapStation.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{selectedMapStation.address || "No address"}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant={selectedMapStation.is_active ? "default" : "secondary"} className="text-xs">
                              {selectedMapStation.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {selectedMapStation.brand && (
                              <Badge variant="outline" className="text-xs">{selectedMapStation.brand}</Badge>
                            )}
                            {selectedMapStation.flag_count > 0 && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {selectedMapStation.flag_count} flags
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/dashboard/stations/${selectedMapStation.id}`} className="flex-1">
                              <Button size="sm" className="w-full text-xs">
                                <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                            </Link>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${selectedMapStation.latitude},${selectedMapStation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button size="sm" variant="outline" className="w-full text-xs">
                                <ExternalLink className="mr-1 h-3 w-3" /> Maps
                              </Button>
                            </a>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </APIProvider>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Pending Suggestions */}
        <TabsContent value="pending" className="mt-6">
          <Card className="chart-container">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Pending Station Suggestions
                  </CardTitle>
                  <CardDescription>Review and approve stations suggested by users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={isSuggestionsLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSuggestionsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium">Station Details</TableHead>
                    <TableHead className="text-xs font-medium">Location</TableHead>
                    <TableHead className="text-xs font-medium">Submitted By</TableHead>
                    <TableHead className="text-xs font-medium">When</TableHead>
                    <TableHead className="text-right text-xs font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSuggestionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <TableRow key={item.id} className="table-row-hover">
                        <TableCell>
                          <div className="font-medium text-sm">{item.name || "Unnamed Station"}</div>
                          <div className="text-xs text-muted-foreground">{item.address || "No address"}</div>
                        </TableCell>
                        <TableCell>
                          {item.latitude && item.longitude ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              View on map
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No coordinates</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={item.avatar_url || ''} />
                              <AvatarFallback className="text-xs">{item.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{item.full_name || 'Anonymous'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveSuggestion(item)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="mr-1 h-4 w-4" /> Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectSuggestion(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Check className="h-8 w-8 text-emerald-500" />
                          <span>All caught up! No pending suggestions.</span>
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

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stationToEdit?.id ? "Edit Station" : "Add New Station"}</DialogTitle>
            <DialogDescription>
              {stationToEdit?.id ? "Update the station details below." : "Fill in the details for the new station."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-sm">Name</Label>
              <Input id="name" value={stationToEdit?.name || ''} onChange={(e) => setStationToEdit(s => ({ ...s, name: e.target.value }))} className="col-span-3" placeholder="e.g. Total Filling Station" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right text-sm">Address</Label>
              <Input id="address" value={stationToEdit?.address || ''} onChange={(e) => setStationToEdit(s => ({ ...s, address: e.target.value }))} className="col-span-3" placeholder="e.g. 123 Main Street, Lagos" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand" className="text-right text-sm">Brand</Label>
              <Input id="brand" value={stationToEdit?.brand || ''} onChange={(e) => setStationToEdit(s => ({ ...s, brand: e.target.value }))} className="col-span-3" placeholder="e.g. Total, Mobil, NNPC" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="latitude" className="text-right text-sm">Latitude</Label>
              <Input id="latitude" type="number" step="any" value={stationToEdit?.latitude || ''} onChange={(e) => setStationToEdit(s => ({ ...s, latitude: parseFloat(e.target.value) || null }))} className="col-span-3" placeholder="e.g. 6.5244" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="longitude" className="text-right text-sm">Longitude</Label>
              <Input id="longitude" type="number" step="any" value={stationToEdit?.longitude || ''} onChange={(e) => setStationToEdit(s => ({ ...s, longitude: parseFloat(e.target.value) || null }))} className="col-span-3" placeholder="e.g. 3.3792" />
            </div>
            <Separator />
            <div className="flex items-center justify-end space-x-2">
              <Switch id="is_active" checked={stationToEdit?.is_active} onCheckedChange={(checked) => setStationToEdit(s => ({ ...s, is_active: checked }))} />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveStation}>Save Station</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!stationToDelete} onOpenChange={() => setStationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{stationToDelete?.name}"</strong> and all associated data including price reports and flags. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Station
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
