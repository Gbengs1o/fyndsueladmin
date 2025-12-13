"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { logAdminAction } from "@/lib/admin-logger"
import {
  Loader2,
  User as UserIcon,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Fuel,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Inbox,
  ArrowUpDown,
  ImageIcon,
  MessageSquare,
  Star
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Submission {
  id: number
  station_id: number
  station_name: string
  station_address: string | null
  user_id: string | null
  user_name: string | null
  user_avatar: string | null
  fuel_type: string
  submitted_price: number | null
  average_price: number | null
  notes: string | null
  rating: number | null
  photo_url: string | null
  status: 'Pending' | 'Approved' | 'Rejected' | 'Flagged'
  created_at: string
  total_count?: number
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  todayCount: number
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType
  label: string
  value: number | string
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

const SUBMISSIONS_PER_PAGE = 15

export default function ModerationPage() {
  const { isLoading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState("Pending")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Stats
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, todayCount: 0 })

  // Detail dialog
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [pending, approved, rejected, todayData] = await Promise.all([
      supabase.from('price_reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('price_reports').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('price_reports').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('price_reports').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
    ])

    setStats({
      pending: pending.count ?? 0,
      approved: approved.count ?? 0,
      rejected: rejected.count ?? 0,
      todayCount: todayData.count ?? 0
    })
  }, [])

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true)
    const offset = (currentPage - 1) * SUBMISSIONS_PER_PAGE

    // Use direct query instead of RPC for more flexibility
    let query = supabase
      .from('price_reports')
      .select(`
        id, price, fuel_type, notes, rating, photo_url, status, created_at, station_id,
        stations!price_reports_station_id_fkey(name, address),
        profiles!price_reports_user_id_fkey(id, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('status', activeTab)
      .order('created_at', { ascending: false })
      .range(offset, offset + SUBMISSIONS_PER_PAGE - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching submissions:", error)
      toast({ variant: "destructive", title: "Error", description: error.message })
      setSubmissions([])
    } else {
      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        station_id: item.station_id,
        station_name: item.stations?.name || 'Unknown Station',
        station_address: item.stations?.address || null,
        user_id: item.profiles?.id || null,
        user_name: item.profiles?.full_name || null,
        user_avatar: item.profiles?.avatar_url || null,
        fuel_type: item.fuel_type || 'PMS',
        submitted_price: item.price,
        average_price: null, // Would need separate calculation
        notes: item.notes,
        rating: item.rating,
        photo_url: item.photo_url,
        status: item.status,
        created_at: item.created_at
      }))
      setSubmissions(formatted)
      setTotalSubmissions(count ?? 0)
    }
    setIsLoading(false)
  }, [currentPage, activeTab, toast])

  useEffect(() => {
    if (!authLoading) {
      fetchStats()
      fetchSubmissions()
    }
  }, [fetchStats, fetchSubmissions, authLoading])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const handleUpdateStatus = async (submission: Submission, newStatus: 'Approved' | 'Rejected') => {
    setIsProcessing(true)

    if (newStatus === 'Rejected') {
      // Snapshot before delete
      const { data: previousState } = await supabase.from('price_reports').select('*').eq('id', submission.id).single()

      const { error } = await supabase
        .from('price_reports')
        .delete()
        .eq('id', submission.id)

      if (error) {
        toast({ variant: "destructive", title: "Rejection Failed", description: error.message })
      } else {
        if (previousState) {
          await logAdminAction(
            'REJECT_PRICE',
            'price_reports',
            submission.id.toString(),
            {
              station: submission.station_name,
              price: submission.submitted_price,
              previous_state: previousState
            }
          )
        }
        toast({ title: "Rejected", description: "Submission has been deleted and removed from the app." })
        setIsDetailOpen(false)
        fetchSubmissions()
        fetchStats()
      }
    } else {
      // Approve logic (Status Update)
      const { error } = await supabase
        .from('price_reports')
        .update({ status: newStatus })
        .eq('id', submission.id)

      if (error) {
        toast({ variant: "destructive", title: "Update Failed", description: error.message })
      } else {
        await logAdminAction(
          'APPROVE_PRICE',
          'price_reports',
          submission.id.toString(),
          { station: submission.station_name, price: submission.submitted_price, previous_status: 'Pending' }
        )
        toast({ title: "Success", description: `Submission has been approved.` })
        setIsDetailOpen(false)
        fetchSubmissions()
        fetchStats()
      }
    }

    setIsProcessing(false)
  }

  const openDetail = (submission: Submission) => {
    setSelectedSubmission(submission)
    setIsDetailOpen(true)
  }

  // Calculate price variance
  const getPriceVariance = (submitted: number | null, average: number | null) => {
    if (!submitted || !average || average === 0) return null
    const variance = ((submitted - average) / average) * 100
    return variance
  }

  const totalPages = Math.ceil(totalSubmissions / SUBMISSIONS_PER_PAGE)

  // Filter by search
  const filteredSubmissions = searchTerm
    ? submissions.filter(s =>
      s.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : submissions

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Price Moderation
          </h1>
          <p className="text-sm text-muted-foreground">Review and moderate user-submitted fuel prices</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchSubmissions(); }} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="flex flex-wrap gap-3">
        <StatBadge icon={Clock} label="Pending Review" value={stats.pending} variant={stats.pending > 0 ? 'warning' : 'default'} />
        <StatBadge icon={CheckCircle2} label="Approved" value={stats.approved} variant="success" />
        <StatBadge icon={XCircle} label="Rejected" value={stats.rejected} variant="danger" />
        <StatBadge icon={TrendingUp} label="Today" value={stats.todayCount} />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="Pending" className="gap-2">
              <Clock className="h-4 w-4" /> Pending
              {stats.pending > 0 && <span className="ml-1 text-xs bg-amber-500 text-white rounded-full px-1.5">{stats.pending}</span>}
            </TabsTrigger>
            <TabsTrigger value="Approved" className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Approved
            </TabsTrigger>
            <TabsTrigger value="Rejected" className="gap-2">
              <XCircle className="h-4 w-4" /> Rejected
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by station or user..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {['Pending', 'Approved', 'Rejected'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card className="chart-container">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium">Station</TableHead>
                      <TableHead className="text-xs font-medium">Submitted By</TableHead>
                      <TableHead className="text-xs font-medium">Fuel Type</TableHead>
                      <TableHead className="text-xs font-medium">Price</TableHead>
                      <TableHead className="text-xs font-medium">Details</TableHead>
                      <TableHead className="text-xs font-medium">When</TableHead>
                      <TableHead className="text-right text-xs font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredSubmissions.length > 0 ? (
                      filteredSubmissions.map((item) => (
                        <TableRow key={item.id} className="table-row-hover cursor-pointer" onClick={() => openDetail(item)}>
                          <TableCell>
                            <Link
                              href={`/dashboard/stations/${item.station_id}`}
                              className="font-medium text-sm hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {item.station_name}
                            </Link>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">{item.station_address || 'No address'}</div>
                          </TableCell>
                          <TableCell>
                            {item.user_id ? (
                              <Link
                                href={`/dashboard/users/${item.user_id}`}
                                className="flex items-center gap-2 hover:opacity-80"
                                onClick={e => e.stopPropagation()}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={item.user_avatar || ''} />
                                  <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                                </Avatar>
                                <span className="text-sm hover:underline">{item.user_name || 'Anonymous'}</span>
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
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.fuel_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-sm">
                              {item.submitted_price ? `₦${item.submitted_price.toLocaleString()}` : 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.photo_url && (
                                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center" title="Has photo">
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              {item.notes && (
                                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center" title="Has note">
                                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                              {item.rating && item.rating > 0 && (
                                <div className="flex items-center gap-0.5 text-xs text-amber-600">
                                  <Star className="h-3 w-3 fill-current" />
                                  {item.rating}
                                </div>
                              )}
                              {!item.photo_url && !item.notes && !item.rating && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                              {tabValue === 'Pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(item, 'Approved')}
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(item, 'Rejected')}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openDetail(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Inbox className="h-10 w-10 opacity-50" />
                            <span>No {tabValue.toLowerCase()} submissions</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {totalSubmissions > 0
                    ? `Showing ${Math.min((currentPage - 1) * SUBMISSIONS_PER_PAGE + 1, totalSubmissions)}–${Math.min(currentPage * SUBMISSIONS_PER_PAGE, totalSubmissions)} of ${totalSubmissions}`
                    : "0 submissions"}
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
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Price Submission Details
            </DialogTitle>
            <DialogDescription>
              Review the details of this price report
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Photo if available */}
              {selectedSubmission.photo_url && (
                <div className="rounded-lg overflow-hidden border">
                  <a href={selectedSubmission.photo_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedSubmission.photo_url}
                      alt="Price evidence"
                      className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {/* Price Display */}
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Submitted Price</div>
                <div className="text-3xl font-bold">
                  ₦{selectedSubmission.submitted_price?.toLocaleString() || 'N/A'}
                </div>
                <Badge variant="outline" className="mt-2">{selectedSubmission.fuel_type}</Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Station</span>
                  <Link
                    href={`/dashboard/stations/${selectedSubmission.station_id}`}
                    className="font-medium text-sm hover:underline block"
                  >
                    {selectedSubmission.station_name}
                  </Link>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Submitted By</span>
                  {selectedSubmission.user_id ? (
                    <Link
                      href={`/dashboard/users/${selectedSubmission.user_id}`}
                      className="flex items-center gap-2 mt-1 hover:opacity-80"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={selectedSubmission.user_avatar || ''} />
                        <AvatarFallback className="text-xs"><UserIcon className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm hover:underline">{selectedSubmission.user_name || 'Anonymous'}</span>
                    </Link>
                  ) : (
                    <div className="font-medium text-sm text-muted-foreground">Anonymous</div>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Date</span>
                  <div className="font-medium text-sm">
                    {format(new Date(selectedSubmission.created_at), 'MMM d, yyyy')} at {format(new Date(selectedSubmission.created_at), 'h:mm a')}
                  </div>
                </div>
                {selectedSubmission.rating && selectedSubmission.rating > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Rating</span>
                    <div className="flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="h-4 w-4 fill-current" />
                      {selectedSubmission.rating} / 5
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedSubmission.notes && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Note</span>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                    {selectedSubmission.notes}
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              {selectedSubmission.status === 'Pending' && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleUpdateStatus(selectedSubmission, 'Approved')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedSubmission, 'Rejected')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              )}

              {selectedSubmission.status !== 'Pending' && (
                <div className="text-center text-sm text-muted-foreground">
                  This submission has been {selectedSubmission.status.toLowerCase()}.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
