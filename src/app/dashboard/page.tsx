
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Fuel,
  Users,
  FileText,
  CheckCheck,
  Flag,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Bell,
  BarChart3,
  Calendar,
  Clock,
  Activity
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { format, formatDistanceToNow } from "date-fns"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


// --- Define Types for our Fetched Data ---
interface Stats {
  totalStations: number;
  activeUsers: number;
  totalSubmissions: number;
  pendingSuggestions: number;
  totalFlags: number;
}
interface RecentSubmission {
  stationName: string;
  price: number | null;
  date: string;
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
  delay
}: {
  href: string;
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconBgClass?: string;
  iconColorClass?: string;
  delay: number;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="stat-card hover-lift p-5 animate-fade-in-up opacity-0"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString()}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'text-muted-foreground'
                }`}>
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
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
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [priceTrendData, setPriceTrendData] = useState<MonthlyPrice[]>([]);
  const [regionData, setRegionData] = useState<RegionSubmission[]>([]);
  const [recentStations, setRecentStations] = useState<RecentStation[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<RecentSuggestion[]>([]);
  const [recentFlags, setRecentFlags] = useState<RecentFlag[]>([]);

  useEffect(() => {
    if (authLoading) return;
    const fetchDashboardData = async () => {
      setIsLoading(true);

      // --- Stat Count Promises ---
      const stationCountPromise = supabase.from('stations').select('*', { count: 'exact', head: true });
      const userCountPromise = supabase.from('profiles').select('*', { count: 'exact', head: true });
      const submissionCountPromise = supabase.from('price_reports').select('*', { count: 'exact', head: true });
      const suggestionCountPromise = supabase.from('suggested_fuel_stations').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const flagCountPromise = supabase.from('flagged_stations').select('*', { count: 'exact', head: true });

      // --- Data Fetch Promises ---
      const recentSubmissionsPromise = supabase
        .from('price_reports')
        .select(`
          price,
          created_at,
          stations ( name, address ) 
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const priceTrendPromise = supabase.rpc('get_monthly_avg_price');

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const regionSubmissionsPromise = supabase
        .from('price_reports')
        .select('stations ( address )')
        .gte('created_at', sevenDaysAgo);

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
        { count: stationCount },
        { count: userCount },
        { count: submissionCount },
        { count: suggestionCount },
        { count: flagCount },
        { data: submissionsData, error: submissionsError },
        { data: trendData, error: trendError },
        { data: regionChartData, error: regionChartError },
        { data: recentStationsData, error: recentStationsError },
        { data: suggestionsData, error: suggestionsError },
        { data: flagsData, error: flagsError },
      ] = await Promise.all([
        stationCountPromise,
        userCountPromise,
        submissionCountPromise,
        suggestionCountPromise,
        flagCountPromise,
        recentSubmissionsPromise,
        priceTrendPromise,
        regionSubmissionsPromise,
        recentStationsPromise,
        recentSuggestionsPromise,
        recentFlagsPromise,
      ]);

      setStats({
        totalStations: stationCount ?? 0,
        activeUsers: userCount ?? 0,
        totalSubmissions: submissionCount ?? 0,
        pendingSuggestions: suggestionCount ?? 0,
        totalFlags: flagCount ?? 0,
      });

      if (submissionsData) {
        const formattedSubmissions = submissionsData.map((s: any) => ({
          stationName: s.stations ? `${s.stations.name}, ${s.stations.address || ''}`.replace(/, $/, '') : 'Unknown Station',
          price: s.price,
          date: format(new Date(s.created_at), "MMM d, h:mm a"),
        }));
        setRecentSubmissions(formattedSubmissions);
      }
      if (submissionsError) console.error("Error fetching submissions:", submissionsError.message);

      if (trendData) {
        const formattedTrendData = trendData.map((d: any) => ({
          month: format(new Date(d.month_start), 'MMM'),
          price: parseFloat(d.average_price).toFixed(2),
        }));
        setPriceTrendData(formattedTrendData);
      }
      if (trendError) console.error("Error fetching price trend:", trendError.message);

      if (regionChartData) {
        const counts = regionChartData
          .filter(r => r.stations?.address)
          .reduce((acc: Record<string, number>, report: any) => {
            const address = report.stations.address;
            acc[address] = (acc[address] || 0) + 1;
            return acc;
          }, {});

        const sortedData = Object.entries(counts)
          .map(([address, submissions]) => ({ address, submissions }))
          .sort((a, b) => b.submissions - a.submissions)
          .slice(0, 10);

        setRegionData(sortedData);
      }
      if (regionChartError) {
        console.error("Error fetching region data:", regionChartError.message);
        setRegionData([]);
      }

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

      setIsLoading(false);
    };

    fetchDashboardData();
  }, [authLoading]);


  if (isLoading || !stats) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          href="/dashboard/stations"
          title="Total Stations"
          value={stats.totalStations}
          icon={Fuel}
          trend="up"
          trendValue="+12 this month"
          delay={0}
        />
        <StatCard
          href="/dashboard/users"
          title="Active Users"
          value={stats.activeUsers}
          icon={Users}
          trend="up"
          trendValue="+8% growth"
          iconBgClass="icon-container-success"
          iconColorClass="text-emerald-600 dark:text-emerald-500"
          delay={50}
        />
        <StatCard
          href="/dashboard/moderation"
          title="Total Submissions"
          value={stats.totalSubmissions}
          icon={CheckCheck}
          trend="up"
          trendValue="+24 today"
          delay={100}
        />
        <StatCard
          href="/dashboard/suggested-stations"
          title="Pending Suggestions"
          value={stats.pendingSuggestions}
          icon={Lightbulb}
          iconBgClass="icon-container-warning"
          iconColorClass="text-amber-600 dark:text-amber-500"
          delay={150}
        />
        <StatCard
          href="/dashboard/flags"
          title="Flagged Items"
          value={stats.totalFlags}
          icon={Flag}
          iconBgClass="icon-container-danger"
          iconColorClass="text-red-600 dark:text-red-500"
          delay={200}
        />
      </div>

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
        </CardContent>
      </Card>
    </div>
  )
}
