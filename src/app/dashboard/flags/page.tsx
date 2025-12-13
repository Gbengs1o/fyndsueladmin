"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  RefreshCw,
  User as UserIcon,
  MapPin,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Filter,
  ImageIcon,
  ShieldAlert,
  Flag,
  Search,
  Eye,
  XCircle,
  Clock,
  Building2,
  Inbox,
  MoreHorizontal,
  ChevronRight
} from "lucide-react"
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { logAdminAction } from "@/lib/admin-logger"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FlaggedStation {
  id: number
  reason: string
  created_at: string
  station_name: string | null
  station_address: string | null
  station_lat: number | null
  station_lng: number | null
  station_id: number
  user_name: string | null
  user_avatar: string | null
  user_id: string
}

interface StationGroup {
  station_id: number
  station_name: string
  station_address: string | null
  station_lat: number | null
  station_lng: number | null
  flags: FlaggedStation[]
  flagCount: number
  latestFlag: string
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType
  label: string
  value: number
  variant?: 'default' | 'warning' | 'danger'
}) {
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

// Reason badge styling
const getReasonBadge = (reason: string) => {
  const reasonLower = reason.toLowerCase()
  if (reasonLower.includes('not_exist') || reasonLower.includes('does not exist')) {
    return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-0">Doesn't Exist</Badge>
  }
  if (reasonLower.includes('closed')) {
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-0">Closed</Badge>
  }
  if (reasonLower.includes('price')) {
    return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0">Wrong Price</Badge>
  }
  return <Badge variant="outline">{reason}</Badge>
}

export default function FlaggedStationsPage() {
  const { isLoading: authLoading } = useAuth()
  const [flags, setFlags] = useState<FlaggedStation[]>([])
  const [filterReason, setFilterReason] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"all" | "grouped">("grouped")

  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const [selectedFlag, setSelectedFlag] = useState<FlaggedStation | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<StationGroup | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Station details
  const [stationReports, setStationReports] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, uniqueStations: 0, highRisk: 0, todayCount: 0 })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Fetch Flags
  const fetchFlaggedStations = useCallback(async () => {
    setIsLoading(true)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: flagsData, error } = await supabase
      .from("flagged_stations")
      .select(`
        id,
        reason,
        created_at,
        user_id,
        station_id,
        stations ( name, address, latitude, longitude ),
        profiles!flagged_stations_user_id_profiles_fkey ( full_name, avatar_url )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
      setFlags([])
      setIsLoading(false)
      return
    }

    const formattedData = (flagsData || []).map((item: any) => ({
      id: item.id,
      reason: item.reason,
      created_at: item.created_at,
      station_name: item.stations?.name || "Unknown",
      station_address: item.stations?.address || "No Address",
      station_lat: item.stations?.latitude,
      station_lng: item.stations?.longitude,
      station_id: item.station_id,
      user_name: item.profiles?.full_name || "Anonymous",
      user_avatar: item.profiles?.avatar_url,
      user_id: item.user_id
    }))

    setFlags(formattedData)

    // Calculate stats
    const uniqueStations = new Set(formattedData.map(f => f.station_id)).size
    const stationCounts: Record<number, number> = {}
    formattedData.forEach(f => {
      stationCounts[f.station_id] = (stationCounts[f.station_id] || 0) + 1
    })
    const highRisk = Object.values(stationCounts).filter(c => c >= 3).length
    const todayCount = formattedData.filter(f => new Date(f.created_at) >= today).length

    setStats({
      total: formattedData.length,
      uniqueStations,
      highRisk,
      todayCount
    })

    setIsLoading(false)
  }, [toast])

  useEffect(() => {
    if (!authLoading) fetchFlaggedStations()
  }, [fetchFlaggedStations, authLoading])

  // Group flags by station
  const groupedFlags = useMemo(() => {
    const groups: Record<number, StationGroup> = {}

    flags.forEach(flag => {
      if (!groups[flag.station_id]) {
        groups[flag.station_id] = {
          station_id: flag.station_id,
          station_name: flag.station_name || 'Unknown',
          station_address: flag.station_address,
          station_lat: flag.station_lat,
          station_lng: flag.station_lng,
          flags: [],
          flagCount: 0,
          latestFlag: flag.created_at
        }
      }
      groups[flag.station_id].flags.push(flag)
      groups[flag.station_id].flagCount++
    })

    return Object.values(groups).sort((a, b) => b.flagCount - a.flagCount)
  }, [flags])

  // Filter logic
  const filteredFlags = useMemo(() => {
    let filtered = flags

    if (filterReason !== "all") {
      filtered = filtered.filter(f => f.reason.toLowerCase().includes(filterReason))
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(f =>
        f.station_name?.toLowerCase().includes(term) ||
        f.station_address?.toLowerCase().includes(term) ||
        f.user_name?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [flags, filterReason, searchTerm])

  const filteredGroups = useMemo(() => {
    if (!searchTerm && filterReason === "all") return groupedFlags

    return groupedFlags.filter(g => {
      const matchesSearch = !searchTerm ||
        g.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.station_address?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesReason = filterReason === "all" ||
        g.flags.some(f => f.reason.toLowerCase().includes(filterReason))

      return matchesSearch && matchesReason
    })
  }, [groupedFlags, searchTerm, filterReason])

  // Fetch station details
  const fetchStationDetails = async (stationId: number) => {
    setLoadingReports(true)

    const { data } = await supabase
      .from('price_reports')
      .select('price, created_at, notes, photo_url, profiles(full_name)')
      .eq('station_id', stationId)
      .order('created_at', { ascending: false })
      .limit(10)

    setStationReports(data || [])
    setLoadingReports(false)
  }

  const handleOpenGroupDetail = (group: StationGroup) => {
    setSelectedGroup(group)
    setSelectedFlag(group.flags[0])
    setIsDetailOpen(true)
    fetchStationDetails(group.station_id)
  }

  const handleOpenFlagDetail = (flag: FlaggedStation) => {
    setSelectedFlag(flag)
    setSelectedGroup(null)
    setIsDetailOpen(true)
    fetchStationDetails(flag.station_id)
  }

  const handleDismissFlag = async (flagId?: number) => {
    const targetId = flagId || selectedFlag?.id
    if (!targetId) return
    setIsProcessing(true)

    // Snapshot
    const { data: previousState } = await supabase.from('flagged_stations').select('*').eq('id', targetId).single()

    const { error } = await supabase.from('flagged_stations').delete().eq('id', targetId)

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      if (previousState) {
        await logAdminAction('DISMISS_FLAG', 'flagged_stations', targetId.toString(), { previous_state: previousState })
      }
      toast({ title: "Flag Dismissed", description: "The flag has been removed." })

      // Update local state
      if (selectedGroup) {
        const updatedFlags = selectedGroup.flags.filter(f => f.id !== targetId)
        if (updatedFlags.length === 0) {
          setIsDetailOpen(false)
        } else {
          setSelectedGroup({ ...selectedGroup, flags: updatedFlags, flagCount: updatedFlags.length })
          setSelectedFlag(updatedFlags[0])
        }
      } else {
        setIsDetailOpen(false)
      }

      fetchFlaggedStations()
    }

    setIsProcessing(false)
  }

  const handleClearAllFlags = async () => {
    if (!selectedGroup) return
    setIsProcessing(true)

    // Snapshot
    const { data: previousState } = await supabase.from('flagged_stations').select('*').eq('station_id', selectedGroup.station_id)

    const { error } = await supabase
      .from('flagged_stations')
      .delete()
      .eq('station_id', selectedGroup.station_id)

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      await logAdminAction('CLEAR_ALL_FLAGS', 'flagged_stations', selectedGroup.station_id.toString(), {
        station_name: selectedGroup.station_name,
        flags_cleared: selectedGroup.flagCount,
        previous_state: previousState // This is an array of flags
      })
      toast({ title: "All Flags Cleared", description: `${selectedGroup.flagCount} flags have been removed.` })
      setIsDetailOpen(false)
      fetchFlaggedStations()
    }

    setIsProcessing(false)
  }

  const handleDeleteStation = async () => {
    const stationId = selectedGroup?.station_id || selectedFlag?.station_id
    const stationName = selectedGroup?.station_name || selectedFlag?.station_name
    if (!stationId) return

    setIsProcessing(true)

    // Snapshot Station
    const { data: stationSnapshot } = await supabase.from('stations').select('*').eq('id', stationId).single()

    const { error } = await supabase.from('stations').delete().eq('id', stationId)

    if (error) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message })
    } else {
      if (stationSnapshot) {
        await logAdminAction('DELETE_STATION', 'stations', stationId.toString(), {
          name: stationName,
          previous_state: stationSnapshot
        })
      }
      toast({ title: "Station Deleted", description: "Station and all related data have been removed." })
      setShowDeleteDialog(false)
      setIsDetailOpen(false)
      fetchFlaggedStations()
    }

    setIsProcessing(false)
  }

  const evidencePhotos = stationReports.filter(r => r.photo_url)

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Flag className="h-6 w-6 text-red-500" />
            Flagged Stations
          </h1>
          <p className="text-sm text-muted-foreground">Review and moderate user-reported station issues</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFlaggedStations} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="flex flex-wrap gap-3">
        <StatBadge icon={Flag} label="Total Flags" value={stats.total} variant={stats.total > 0 ? 'danger' : 'default'} />
        <StatBadge icon={Building2} label="Stations Affected" value={stats.uniqueStations} />
        <StatBadge icon={ShieldAlert} label="High Risk (3+ flags)" value={stats.highRisk} variant={stats.highRisk > 0 ? 'danger' : 'default'} />
        <StatBadge icon={Clock} label="Today" value={stats.todayCount} variant={stats.todayCount > 0 ? 'warning' : 'default'} />
      </div>

      {/* Filters */}
      <Card className="chart-container">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by station name or address..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "grouped")} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="grouped" className="text-xs px-3">By Station</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-3">All Flags</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "grouped" ? (
            // Grouped by Station View
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium">Station</TableHead>
                  <TableHead className="text-xs font-medium">Flags</TableHead>
                  <TableHead className="text-xs font-medium">Reasons</TableHead>
                  <TableHead className="text-xs font-medium">Latest Flag</TableHead>
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
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <TableRow
                      key={group.station_id}
                      className={`table-row-hover cursor-pointer ${group.flagCount >= 3 ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}
                      onClick={() => handleOpenGroupDetail(group)}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/stations/${group.station_id}`}
                          className="font-medium text-sm hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {group.station_name}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{group.station_address}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={group.flagCount >= 3 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {group.flagCount} flag{group.flagCount !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(group.flags.map(f => f.reason))].slice(0, 2).map((reason, i) => (
                            <span key={i}>{getReasonBadge(reason)}</span>
                          ))}
                          {[...new Set(group.flags.map(f => f.reason))].length > 2 && (
                            <Badge variant="outline" className="text-xs">+{[...new Set(group.flags.map(f => f.reason))].length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(group.latestFlag), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('flagged_stations')
                                .delete()
                                .eq('station_id', group.station_id)
                              if (!error) {
                                await logAdminAction('CLEAR_ALL_FLAGS', 'flagged_stations', group.station_id.toString(), { station_name: group.station_name, flags_cleared: group.flagCount })
                                toast({ title: "Flags Cleared", description: `All ${group.flagCount} flags removed from "${group.station_name}"` })
                                fetchFlaggedStations()
                              } else {
                                toast({ variant: "destructive", title: "Error", description: error.message })
                              }
                            }}
                            title="Clear all flags (dismiss as false)"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => handleOpenGroupDetail(group)}>
                            <Eye className="h-4 w-4 mr-1" /> Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                        <span>No flagged stations! All clear.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            // All Flags View
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium">Station</TableHead>
                  <TableHead className="text-xs font-medium">Reason</TableHead>
                  <TableHead className="text-xs font-medium">Flagged By</TableHead>
                  <TableHead className="text-xs font-medium">When</TableHead>
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
                ) : filteredFlags.length > 0 ? (
                  filteredFlags.map((flag) => (
                    <TableRow key={flag.id} className="table-row-hover cursor-pointer" onClick={() => handleOpenFlagDetail(flag)}>
                      <TableCell>
                        <Link
                          href={`/dashboard/stations/${flag.station_id}`}
                          className="font-medium text-sm hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {flag.station_name}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{flag.station_address}</div>
                      </TableCell>
                      <TableCell>{getReasonBadge(flag.reason)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/users/${flag.user_id}`}
                          className="flex items-center gap-2 hover:opacity-80"
                          onClick={e => e.stopPropagation()}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={flag.user_avatar || ''} />
                            <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm hover:underline">{flag.user_name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleDismissFlag(flag.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => handleOpenFlagDetail(flag)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-10 w-10 opacity-50" />
                        <span>No flags match your filters</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between py-4 border-t">
          <div className="text-sm text-muted-foreground">
            {viewMode === "grouped"
              ? `${filteredGroups.length} station${filteredGroups.length !== 1 ? 's' : ''} with flags`
              : `${filteredFlags.length} flag${filteredFlags.length !== 1 ? 's' : ''}`
            }
          </div>
        </CardFooter>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Flag Review: {selectedGroup?.station_name || selectedFlag?.station_name}
            </DialogTitle>
            <DialogDescription>
              <Link
                href={`/dashboard/stations/${selectedGroup?.station_id || selectedFlag?.station_id}`}
                className="hover:underline inline-flex items-center gap-1"
              >
                View station profile <ExternalLink className="h-3 w-3" />
              </Link>
            </DialogDescription>
          </DialogHeader>

          {(selectedFlag || selectedGroup) && (
            <div className="grid gap-6 py-4 md:grid-cols-2">
              {/* Left: Map & Evidence */}
              <div className="space-y-4">
                {/* Map */}
                <div className="h-[200px] w-full rounded-lg border overflow-hidden bg-muted relative">
                  {(selectedGroup?.station_lat || selectedFlag?.station_lat) && (selectedGroup?.station_lng || selectedFlag?.station_lng) && apiKey ? (
                    <APIProvider apiKey={apiKey}>
                      <Map
                        defaultCenter={{
                          lat: selectedGroup?.station_lat || selectedFlag?.station_lat || 0,
                          lng: selectedGroup?.station_lng || selectedFlag?.station_lng || 0
                        }}
                        defaultZoom={15}
                        mapId="flag-detail-map"
                        disableDefaultUI={true}
                      >
                        <AdvancedMarker position={{
                          lat: selectedGroup?.station_lat || selectedFlag?.station_lat || 0,
                          lng: selectedGroup?.station_lng || selectedFlag?.station_lng || 0
                        }}>
                          <Pin background="#ef4444" glyphColor="white" borderColor="#b91c1c" />
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                      <MapPin className="h-8 w-8 opacity-50" />
                      <span>No coordinates available</span>
                    </div>
                  )}
                </div>

                {/* Evidence Photos */}
                {evidencePhotos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Visual Evidence
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {evidencePhotos.slice(0, 4).map((photo, i) => (
                        <a key={i} href={photo.photo_url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                          <img src={photo.photo_url} alt="Evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</h4>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8 bg-muted/50">
                          <TableHead className="h-8 text-xs">User</TableHead>
                          <TableHead className="h-8 text-xs">Price</TableHead>
                          <TableHead className="h-8 text-xs">Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingReports ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : stationReports.length > 0 ? (
                          stationReports.slice(0, 5).map((r, i) => (
                            <TableRow key={i} className="h-9">
                              <TableCell className="py-1 text-xs">{r.profiles?.full_name || 'Anon'}</TableCell>
                              <TableCell className="py-1 text-xs">₦{r.price?.toLocaleString()}</TableCell>
                              <TableCell className="py-1 text-xs truncate max-w-[100px]" title={r.notes}>{r.notes || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={3} className="text-center py-4 text-xs text-muted-foreground">No recent reports</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Right: Flags & Actions */}
              <div className="space-y-6">
                {/* Risk Alert */}
                {(selectedGroup?.flagCount || 1) >= 3 && (
                  <div className="p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400 rounded-md flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">High Risk Station</p>
                      <p className="text-xs opacity-90">This station has {selectedGroup?.flagCount || 1} flags. Consider removal.</p>
                    </div>
                  </div>
                )}

                {/* Flag List */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {selectedGroup ? `All Flags (${selectedGroup.flagCount})` : 'Flag Details'}
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {(selectedGroup?.flags || [selectedFlag]).filter(Boolean).map((flag) => flag && (
                      <div key={flag.id} className="p-3 rounded-lg border bg-muted/30 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getReasonBadge(flag.reason)}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <Link href={`/dashboard/users/${flag.user_id}`} className="flex items-center gap-2 text-sm hover:opacity-80">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={flag.user_avatar || ''} />
                              <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                            </Avatar>
                            <span className="hover:underline">{flag.user_name}</span>
                          </Link>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleDismissFlag(flag.id)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Moderation Actions</h4>
                  <div className="flex flex-col gap-2">
                    {selectedGroup && selectedGroup.flagCount > 1 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleClearAllFlags}
                        disabled={isProcessing}
                      >
                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                        Clear All {selectedGroup.flagCount} Flags
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Station Permanently
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Actions are logged to the audit trail
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Station Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{selectedGroup?.station_name || selectedFlag?.station_name}"</strong> and all associated data including price reports and flags. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStation}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Station
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
