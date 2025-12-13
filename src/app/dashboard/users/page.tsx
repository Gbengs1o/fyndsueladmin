"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { logAdminAction } from "@/lib/admin-logger"
import {
  MoreHorizontal,
  Search,
  User as UserIcon,
  Loader2,
  Mail,
  Phone,
  Users,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  Eye,
  Shield,
  TrendingUp,
  DollarSign,
  Flag,
  Lightbulb,
  ChevronRight,
  ArrowUpDown,
  Inbox,
  ExternalLink,
  Calendar
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  last_sign_in_at: string | null
  provider: string
  role: string // NEW
  is_banned: boolean // NEW
  report_count: number
  suggestion_count?: number
  flag_count?: number
  total_count: number
}

interface Stats {
  total: number
  activeToday: number
  newThisWeek: number
  topContributors: number
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, variant = 'default' }: {
  icon: React.ElementType
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning'
}) {
  const colors = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors[variant]}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

const USERS_PER_PAGE = 15

export default function UsersPage() {
  const { isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const router = useRouter()

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 400)
  const [sortBy, setSortBy] = useState("newest")
  const [providerFilter, setProviderFilter] = useState("all")

  // Stats
  const [stats, setStats] = useState<Stats>({ total: 0, activeToday: 0, newThisWeek: 0, topContributors: 0 })

  // Quick view dialog
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [quickViewData, setQuickViewData] = useState<{ reports: number, suggestions: number, flags: number }>({ reports: 0, suggestions: 0, flags: 0 })
  const [loadingQuickView, setLoadingQuickView] = useState(false)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [totalRes, activeRes, newRes, topRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_sign_in_at', today.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('price_reports').select('user_id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString())
    ])

    setStats({
      total: totalRes.count ?? 0,
      activeToday: activeRes.count ?? 0,
      newThisWeek: newRes.count ?? 0,
      topContributors: topRes.count ?? 0
    })
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const offset = (currentPage - 1) * USERS_PER_PAGE

    const { data, error } = await supabase.rpc('get_users_for_admin_page', {
      _search_term: debouncedSearchTerm,
      _sort_by: sortBy,
      _provider_filter: providerFilter,
      _has_avatar_filter: null,
      _limit: USERS_PER_PAGE,
      _offset: offset,
    })



    if (error) {
      console.error("Error fetching users:", error)
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      setUsers(data || [])
      setTotalUsers(data && data.length > 0 ? data[0].total_count : 0)
    }
    setIsLoading(false)
  }, [currentPage, debouncedSearchTerm, sortBy, providerFilter, toast])

  useEffect(() => {
    if (!authLoading) {
      fetchStats()
      fetchUsers()
    }
  }, [fetchStats, fetchUsers, authLoading])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, sortBy, providerFilter])

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE)

  const handleRowClick = (userId: string, event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return
    }
    router.push(`/dashboard/users/${userId}`)
  }

  const openQuickView = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedUser(user)
    setIsQuickViewOpen(true)
    setLoadingQuickView(true)

    // Fetch user activity counts
    const [reportsRes, suggestionsRes, flagsRes] = await Promise.all([
      supabase.from('price_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('suggested_fuel_stations').select('*', { count: 'exact', head: true }).eq('submitted_by', user.id),
      supabase.from('flagged_stations').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    ])

    setQuickViewData({
      reports: reportsRes.count ?? 0,
      suggestions: suggestionsRes.count ?? 0,
      flags: flagsRes.count ?? 0
    })
    setLoadingQuickView(false)
  }

  // --- ACTIONS ---

  const handleToggleBan = async (user: UserProfile) => {
    // Snapshot
    const { data: previousState } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    // Use RPC to toggle ban status in profiles AND auth.users
    const { data: newStatus, error } = await supabase.rpc('toggle_ban_user', { target_user_id: user.id })

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      const action = newStatus ? 'BAN_USER' : 'UNBAN_USER'
      await logAdminAction(action as any, 'profiles', user.id, {
        user_name: user.full_name,
        previous_state: previousState
      })
      toast({ title: "Success", description: `User ${newStatus ? 'banned' : 'unbanned'}.` })
      fetchUsers() // Refresh list
    }
  }

  const handleToggleAdmin = async (user: UserProfile) => {
    // Snapshot
    const { data: previousState } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    // Use RPC to toggle admin role
    const { data: newRole, error } = await supabase.rpc('toggle_admin_role', { target_user_id: user.id })

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      const action = newRole === 'admin' ? 'PROMOTE_USER' : 'DEMOTE_USER'
      await logAdminAction(action as any, 'profiles', user.id, {
        user_name: user.full_name,
        previous_state: previousState
      })
      toast({ title: "Success", description: `User role updated to ${newRole}.` })
      fetchUsers()
    }
  }

  // Note: True deletion of a user usually requires deleting from auth.users which is restricted. 
  // We will delete from 'profiles' and let CASCADE handle the rest, or strictly handle 'profiles'.
  // Ideally we should use an Edge Function to delete from auth.users, but for now we follow the pattern of deleting the profile data.
  // Actually, 'profiles' is usually linked to auth.users. Deleting 'profiles' row might be blocked or cascade. 
  // Let's assume we just mark as banned if we can't delete auth, BUT user asked for "Delete". 
  // We will try DELETE on profiles.
  const handleDeleteUser = async (user: UserProfile) => {
    // Snapshot
    const { data: previousState } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    // Use RPC to delete from auth.users and profiles
    const { error } = await supabase.rpc('delete_user_completely', { target_user_id: user.id })

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      await logAdminAction('DELETE_USER' as any, 'profiles', user.id, {
        user_name: user.full_name,
        previous_state: previousState
      })
      toast({ title: "Success", description: "User permanently deleted." })
      fetchUsers()
    }
  }

  // Calculate activity level
  const getActivityLevel = (reportCount: number) => {
    if (reportCount >= 50) return { label: 'Power User', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' }
    if (reportCount >= 20) return { label: 'Active', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' }
    if (reportCount >= 5) return { label: 'Regular', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' }
    return { label: 'New', color: 'text-slate-600 bg-slate-50 dark:bg-slate-500/10' }
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">View and manage all registered users</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchUsers(); }} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="flex flex-wrap gap-3">
        <StatBadge icon={Users} label="Total Users" value={stats.total} />
        <StatBadge icon={UserCheck} label="Active Today" value={stats.activeToday} variant="success" />
        <StatBadge icon={Clock} label="New This Week" value={stats.newThisWeek} variant="warning" />
        <StatBadge icon={TrendingUp} label="Contributors (7d)" value={stats.topContributors} />
      </div>

      {/* Main Content */}
      <Card className="chart-container">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="last_signin">Last Active</SelectItem>
                <SelectItem value="submissions_desc">Most Submissions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">User</TableHead>
                <TableHead className="text-xs font-medium">Provider</TableHead>
                <TableHead className="text-xs font-medium">Activity</TableHead>
                <TableHead className="text-xs font-medium">Reports</TableHead>
                <TableHead className="text-xs font-medium">Last Active</TableHead>
                <TableHead className="text-xs font-medium">Joined</TableHead>
                <TableHead className="text-right text-xs font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && users.length > 0 && users.map((user) => {
                const activity = getActivityLevel(user.report_count)
                return (
                  <TableRow
                    key={user.id}
                    className="table-row-hover cursor-pointer"
                    onClick={(e) => handleRowClick(user.id, e)}
                  >

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {user.full_name || "Anonymous"}
                            {user.role === 'admin' && <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary text-primary">Admin</Badge>}
                            {user.is_banned && <Badge variant="destructive" className="text-[10px] h-4 px-1">Banned</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email || user.phone || 'No contact'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.provider === 'email' ? (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm capitalize">{user.provider || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${activity.color}`}>
                        {activity.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{user.report_count.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.last_sign_in_at
                        ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={(e) => openQuickView(user, e)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                              <Shield className="mr-2 h-4 w-4" /> {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleBan(user)} className={user.is_banned ? "text-emerald-600" : "text-amber-600"}>
                              {user.is_banned ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                              {user.is_banned ? 'Unban User' : 'Ban User'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive focus:text-destructive">
                              <UserX className="mr-2 h-4 w-4" /> Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="h-10 w-10 opacity-50" />
                      <span>No users found (Length is 0)</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalUsers > 0
              ? `Showing ${Math.min((currentPage - 1) * USERS_PER_PAGE + 1, totalUsers)}–${Math.min(currentPage * USERS_PER_PAGE, totalUsers)} of ${totalUsers}`
              : "0 users"}
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

      {/* Quick View Dialog */}
      <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              User Quick View
            </DialogTitle>
            <DialogDescription>
              Quick overview of user activity
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                  <AvatarFallback className="text-lg"><UserIcon className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-lg">{selectedUser.full_name || 'Anonymous User'}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email || selectedUser.phone}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    Joined {format(new Date(selectedUser.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              {loadingQuickView ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                    <div className="text-2xl font-bold">{quickViewData.reports}</div>
                    <div className="text-xs text-muted-foreground">Price Reports</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Lightbulb className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                    <div className="text-2xl font-bold">{quickViewData.suggestions}</div>
                    <div className="text-xs text-muted-foreground">Suggestions</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Flag className="h-5 w-5 mx-auto mb-1 text-red-600" />
                    <div className="text-2xl font-bold">{quickViewData.flags}</div>
                    <div className="text-xs text-muted-foreground">Flags Raised</div>
                  </div>
                </div>
              )}

              {/* Trust Score */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Activity Level</span>
                  <span className="font-medium">{getActivityLevel(quickViewData.reports).label}</span>
                </div>
                <Progress
                  value={Math.min(quickViewData.reports * 2, 100)}
                  className="h-2"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setIsQuickViewOpen(false)
                    router.push(`/dashboard/users/${selectedUser.id}`)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Full Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
