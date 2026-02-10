<<<<<<< HEAD

"use client"

import { format, formatDistanceToNow } from "date-fns"
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  Coins,
  Flag,
  Fuel,
  Lightbulb,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { User } from "lucide-react"


// --- Define Types for our Fetched Data ---
interface Stats {
  totalStations: number;
  activeUsers: number;
  totalSubmissions: number;
  pendingSuggestions: number;
  totalFlags: number;
  pendingManagers: number;
}
interface MonthlyPrice {
  month: string;
  price: number;
}
interface RegionSubmission {
  address: string;
  submissions: number;
}
interface RecentStation {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  added_by: string | null;
  avatar_url: string | null;
}
interface RecentSuggestion {
  id: number;
  name: string;
  created_at: string;
  submitted_by: string | null;
  avatar_url: string | null;
}
interface RecentFlag {
  id: number;
  station_name: string;
  reason: string;
  created_at: string;
  user_name: string | null;
  avatar_url: string | null;
}
interface GamificationStats {
  total_points_awarded: number;
  total_points_redeemed: number;
  pending_redemptions: number;
}

// Stat Card Component - Clean Design
function StatCard({
  href,
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  iconBgClass,
  iconColorClass,
  delay,
  loading
}: {
  href: string;
  title: string;
  value?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconBgClass?: string;
  iconColorClass?: string;
  delay: number;
  loading?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="stat-card hover-lift p-5 animate-fade-in-up opacity-0"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 w-full">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{value?.toLocaleString() ?? 0}</p>
            )}

            {loading ? (
              <Skeleton className="h-4 w-16 mt-1" />
            ) : (
              trend && trendValue && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'text-muted-foreground'
                  }`}>
                  {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                  <span>{trendValue}</span>
                </div>
              )
            )}
          </div>
          <div className={`icon-container ${iconBgClass || 'icon-container-primary'}`}>
            <Icon className={`h-5 w-5 ${iconColorClass || 'text-primary'}`} />
          </div>
        </div>

        {/* Subtle view indicator */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View details</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

// Quick Action Button - Simplified
function QuickAction({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link href={href}>
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3 gap-2 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </Button>
    </Link>
  )
}


export default function DashboardPage() {
  const { isLoading: authLoading, adminUser } = useAuth();

  // Independent loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);

  const [stats, setStats] = useState<Stats | null>(null);
  const [priceTrendData, setPriceTrendData] = useState<MonthlyPrice[]>([]);
  const [regionData, setRegionData] = useState<RegionSubmission[]>([]);
  const [recentStations, setRecentStations] = useState<RecentStation[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<RecentSuggestion[]>([]);
  const [recentFlags, setRecentFlags] = useState<RecentFlag[]>([]);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // 1. Fetch Stats (Fastest)
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const stationCountPromise = supabase.from('stations').select('*', { count: 'exact', head: true });
        const userCountPromise = supabase.from('profiles').select('*', { count: 'exact', head: true });
        const submissionCountPromise = supabase.from('price_reports').select('*', { count: 'exact', head: true });
        const suggestionCountPromise = supabase.from('suggested_fuel_stations').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const flagCountPromise = supabase.from('flagged_stations').select('*', { count: 'exact', head: true });
        const managerCountPromise = supabase.from('manager_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending');

        const [
          { count: stationCount },
          { count: userCount },
          { count: submissionCount },
          { count: suggestionCount },
          { count: flagCount },
          { count: managerCount },
        ] = await Promise.all([
          stationCountPromise,
          userCountPromise,
          submissionCountPromise,
          suggestionCountPromise,
          flagCountPromise,
          managerCountPromise,
        ]);

        setStats({
          totalStations: stationCount ?? 0,
          activeUsers: userCount ?? 0,
          totalSubmissions: submissionCount ?? 0,
          pendingSuggestions: suggestionCount ?? 0,
          totalFlags: flagCount ?? 0,
          pendingManagers: managerCount ?? 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    // 2. Fetch Charts Data (Optimized)
    const fetchCharts = async () => {
      setChartsLoading(true);
      try {
        const priceTrendPromise = supabase.rpc('get_monthly_avg_price');
        const regionSubmissionsPromise = supabase.rpc('get_weekly_submission_counts');

        const [{ data: trendData, error: trendError }, { data: regionChartData, error: regionChartError }] = await Promise.all([
          priceTrendPromise,
          regionSubmissionsPromise
        ]);

        if (trendData) {
          const formattedTrendData = trendData.map((d: any) => ({
            month: format(new Date(d.month_start), 'MMM'),
            price: parseFloat(d.average_price).toFixed(2),
          }));
          setPriceTrendData(formattedTrendData);
        }
        if (trendError) console.error("Error fetching price trend:", trendError.message);

        if (regionChartData) {
          // Data is already aggregated from the server!
          // Expected format: [{ address: string, submissions: number }]
          setRegionData(regionChartData);
        }
        if (regionChartError) {
          console.error("Error fetching region data:", regionChartError.message);
          setRegionData([]);
        }

      } catch (error) {
        console.error("Error fetching charts:", error);
      } finally {
        setChartsLoading(false);
      }
    };

    // 3. Fetch Recent Lists (Tables)
    const fetchRecentLists = async () => {
      setListsLoading(true);
      try {
        const recentStationsPromise = supabase.rpc('get_recently_added_stations', { _limit: 5 });

        const recentSuggestionsPromise = supabase
          .from('suggested_fuel_stations')
          .select('id, name, created_at, profiles!suggested_fuel_stations_submitted_by_profiles_fkey(full_name, avatar_url)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        const recentFlagsPromise = supabase
          .from('flagged_stations')
          .select(`
            id,
            reason,
            created_at,
            station_id,
            user_id,
            stations!flagged_stations_station_id_fkey(name),
            profiles!flagged_stations_user_id_profiles_fkey(full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        const [
          { data: recentStationsData, error: recentStationsError },
          { data: suggestionsData, error: suggestionsError },
          { data: flagsData, error: flagsError },
        ] = await Promise.all([
          recentStationsPromise,
          recentSuggestionsPromise,
          recentFlagsPromise
        ]);

        if (recentStationsData) {
          setRecentStations(recentStationsData);
        }
        if (recentStationsError) console.error("Error fetching recent stations:", recentStationsError.message);

        if (suggestionsData) {
          const formattedSuggestions = suggestionsData.map((s: any) => ({
            id: s.id,
            name: s.name,
            created_at: s.created_at,
            submitted_by: s.profiles?.full_name || 'Anonymous',
            avatar_url: s.profiles?.avatar_url,
          }));
          setRecentSuggestions(formattedSuggestions);
        }
        if (suggestionsError) console.error("Error fetching suggestions:", suggestionsError.message);

        if (flagsData) {
          const formattedFlags = flagsData.map((f: any) => ({
            id: f.id,
            station_name: f.stations?.name || 'Unknown Station',
            reason: f.reason,
            created_at: f.created_at,
            user_name: f.profiles?.full_name || 'Anonymous',
            avatar_url: f.profiles?.avatar_url,
          }));
          setRecentFlags(formattedFlags);
        }
        if (flagsError) console.error("Error fetching flags:", flagsError.message);

      } catch (error) {
        console.error("Error fetching lists:", error);
      } finally {
        setListsLoading(false);
      }
    };

    // 4. Fetch Gamification Stats
    const fetchGamificationStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_gamification_dashboard_stats');
        if (data && !error) {
          setGamificationStats(data);
        }
      } catch (err) {
        console.error('Gamification stats error:', err);
      }
    };

    fetchStats();
    fetchCharts();
    fetchRecentLists();
    fetchGamificationStats();

  }, [authLoading]);

  const currentDate = new Date();
  const greeting = currentDate.getHours() < 12 ? "Good morning" : currentDate.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* --- Welcome Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {adminUser?.full_name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(currentDate, "EEEE, MMMM d, yyyy")}
            <span className="mx-1.5">·</span>
            <Clock className="h-3.5 w-3.5" />
            {format(currentDate, "h:mm a")}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <QuickAction icon={Plus} label="Add Station" href="/dashboard/stations" />
          <QuickAction icon={Bell} label="Notifications" href="/dashboard/notifications" />
          <QuickAction icon={BarChart3} label="Reports" href="/dashboard/reports" />
        </div>
      </div>

      {/* --- Stat Cards Using Real Data --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          href="/dashboard/stations"
          title="Total Stations"
          value={stats?.totalStations}
          icon={Fuel}
          trend="up"
          trendValue="+12 this month"
          delay={0}
          loading={statsLoading}
        />
        <StatCard
          href="/dashboard/managers"
          title="Verify Managers"
          value={stats?.pendingManagers}
          icon={ShieldCheck}
          iconBgClass="icon-container-primary"
          iconColorClass="text-blue-600 dark:text-blue-500"
          delay={25}
          loading={statsLoading}
        />
        <StatCard
          href="/dashboard/users"
          title="Active Users"
          value={stats?.activeUsers}
          icon={Users}
          trend="up"
          trendValue="+8% growth"
          iconBgClass="icon-container-success"
          iconColorClass="text-emerald-600 dark:text-emerald-500"
          delay={50}
          loading={statsLoading}
        />
        <StatCard
          href="/dashboard/moderation"
          title="Total Submissions"
          value={stats?.totalSubmissions}
          icon={CheckCheck}
          trend="up"
          trendValue="+24 today"
          delay={100}
          loading={statsLoading}
        />
        <StatCard
          href="/dashboard/suggested-stations"
          title="Pending Suggestions"
          value={stats?.pendingSuggestions}
          icon={Lightbulb}
          iconBgClass="icon-container-warning"
          iconColorClass="text-amber-600 dark:text-amber-500"
          delay={150}
          loading={statsLoading}
        />
        <StatCard
          href="/dashboard/flags"
          title="Flagged Items"
          value={stats?.totalFlags}
          icon={Flag}
          iconBgClass="icon-container-danger"
          iconColorClass="text-red-600 dark:text-red-500"
          delay={200}
          loading={statsLoading}
        />
      </div>

      {/* --- Gamification Stats Card --- */}
      <Card className="animate-fade-in-up opacity-0" style={{ animationDelay: '225ms', animationFillMode: 'forwards' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                Gamification Overview
              </CardTitle>
              <CardDescription>Points and redemption activity</CardDescription>
            </div>
            <Link href="/dashboard/redemptions">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {gamificationStats?.total_points_awarded?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Points Awarded</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-500/5">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {gamificationStats?.total_points_redeemed?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Points Redeemed</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {gamificationStats?.pending_redemptions || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pending Redemptions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Charts Section --- */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 chart-container animate-fade-in-up opacity-0" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Average Price Trend
                </CardTitle>
                <CardDescription className="mt-0.5">PMS price over the last 6 months</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {chartsLoading ? (
              <Skeleton className="w-full h-[320px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={priceTrendData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)'
                    }}
                    labelStyle={{ fontWeight: 500 }}
                  />
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 chart-container animate-fade-in-up opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Weekly Submissions by Location</CardTitle>
            <CardDescription>
              {regionData.length > 0 ? "Top locations by price submissions (7 days)" : "No data for the last 7 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="w-full h-[320px] rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                {regionData.length > 0 ? (
                  <BarChart data={regionData} layout="vertical">
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} hide />
                    <YAxis type="category" dataKey="address" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={85} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)'
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                    <Bar dataKey="submissions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <p className="text-sm">No recent data</p>
                    </div>
                  </div>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Tables Section --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="chart-container animate-fade-in-up opacity-0" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Pending Suggestions
                </CardTitle>
                <CardDescription>New stations suggested by users</CardDescription>
              </div>
              <Link href="/dashboard/suggested-stations">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {listsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Station</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Submitted By</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSuggestions.length > 0 ? recentSuggestions.map((suggestion) => (
                    <TableRow key={suggestion.id} className="table-row-hover">
                      <TableCell className="font-medium text-sm">{suggestion.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={suggestion.avatar_url || ''} />
                            <AvatarFallback className="bg-muted text-xs"><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{suggestion.submitted_by}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground text-sm">
                        No pending suggestions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="chart-container animate-fade-in-up opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  Flagged Stations
                </CardTitle>
                <CardDescription>Stations flagged for review</CardDescription>
              </div>
              <Link href="/dashboard/flags">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {listsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Station</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Reason</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Flagged By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFlags.length > 0 ? recentFlags.map((flag) => (
                    <TableRow key={flag.id} className="table-row-hover">
                      <TableCell className="font-medium text-sm">{flag.station_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {flag.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={flag.avatar_url || ''} />
                            <AvatarFallback className="bg-muted text-xs"><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{flag.user_name}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground text-sm">
                        No flagged stations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- Recently Added Stations --- */}
      <Card className="chart-container animate-fade-in-up opacity-0" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Fuel className="h-4 w-4 text-primary" />
                Recently Added Stations
              </CardTitle>
              <CardDescription>Latest stations added to the platform</CardDescription>
            </div>
            <Link href="/dashboard/stations">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {listsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground">Station</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Added By</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStations.length > 0 ? recentStations.map((station) => (
                  <TableRow key={station.id} className="table-row-hover">
                    <TableCell className="font-medium text-sm">{station.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-normal ${station.is_active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          }`}
                      >
                        {station.is_active ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={station.avatar_url || ''} />
                          <AvatarFallback className="bg-muted text-xs"><User className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{station.added_by || 'Anonymous'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(station.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground text-sm">
                      No recently added stations
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
=======
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { PriceUpdater } from '@/components/features/PriceUpdater'
import { LeaderboardList } from '@/components/features/LeaderboardList'

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [station, setStation] = useState<any>(null)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase
                .from('manager_profiles')
                .select('*, stations(*)')
                .eq('id', user.id)
                .single()

            setProfile(profileData)
            if (profileData?.stations) {
                setStation(profileData.stations)
            }

            setLoading(false)
        }
        fetchData()
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )

    return (
        <div className="min-h-screen bg-background pb-32">
            <Header user={profile} />

            <main className="px-4 space-y-6">
                {/* Summary Circles/Top Leaders */}
                <div className="flex items-center justify-around py-4">
                    {/* Mock Leaders for Visuals */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-700 p-[2px] shadow-lg shadow-primary/20">
                                <div className="w-full h-full rounded-full bg-card flex items-center justify-center border-2 border-background">
                                    <span className="font-bold text-primary">OG</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card rounded-full flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-foreground">OGUNKOY...</p>
                            <p className="text-[10px] text-muted-foreground">2 reports</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 scale-110">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-violet-500 p-[2px] shadow-xl shadow-primary/30">
                                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center border-4 border-background text-primary-foreground text-2xl font-bold">
                                    G
                                </div>
                            </div>
                            <div className="absolute 0 bottom-0 right-0 w-7 h-7 bg-card rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-background">1</div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Ggg</p>
                            <p className="text-xs text-muted-foreground font-medium">3 reports</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/80 to-pink-500 p-[2px] shadow-lg shadow-pink-500/20">
                                <div className="w-full h-full rounded-full bg-card flex items-center justify-center border-2 border-background">
                                    <span className="font-bold text-primary">AF</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card rounded-full flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-foreground">Akinpelu Faith</p>
                            <p className="text-[10px] text-muted-foreground">1 reports</p>
                        </div>
                    </div>
                </div>

                {/* All Ranks Header */}
                <div>
                    <h2 className="text-xl font-bold text-foreground">All Ranks</h2>
                </div>

                {/* Price Updater Card */}
                {station && (
                    <PriceUpdater
                        stationId={station.id}
                        initialPrices={{
                            pms: station.price_pms || 0,
                            ago: station.price_ago || 0,
                            dpk: station.price_dpk || 0
                        }}
                    />
                )}

                {/* Rank List */}
                <LeaderboardList />

                {/* Test Ad Banner */}
                <div className="mt-8 rounded-xl bg-card overflow-hidden border border-border/50 relative">
                    <div className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[10px] text-white backdrop-blur-sm">SPONSORED</div>
                    <div className="p-4 pt-8">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm">Test Ad (Browser Agent Manual)</h3>
                            <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">Learn More</Button>
                        </div>
                        <div className="bg-muted rounded-lg h-32 w-full flex items-center justify-center relative overflow-hidden">
                            {/* Placeholder for ad image */}
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-blue-900/20" />
                            <span className="text-muted-foreground/50 text-xs text-center px-4">Ad Content Visualization</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
>>>>>>> origin/main
}
