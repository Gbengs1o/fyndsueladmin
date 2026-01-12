"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { format, subDays, startOfDay, isSameDay, parseISO } from "date-fns"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts"
import { Loader2, TrendingUp, Users, Activity, Fuel } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Theme colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
    const { isLoading: authLoading } = useAuth()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (mounted) setLoading(false)
        }, 15000)

        if (authLoading) return

        const fetchData = async () => {
            setLoading(true)
            try {
                const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

                // 1. Fetch Price Reports (Last 30 days)
                const reportsPromise = supabase
                    .from('price_reports')
                    .select(`
                        id, created_at, price, fuel_type, station_id, user_id, status,
                        stations ( id, name, address ),
                        profiles ( id, full_name, avatar_url )
                    `)
                    .gte('created_at', thirtyDaysAgo)
                    .order('created_at', { ascending: false })

                // 2. Fetch New Users (Last 30 days)
                const usersPromise = supabase
                    .from('profiles')
                    .select('created_at')
                    .gte('created_at', thirtyDaysAgo)

                const [{ data: reportsData, error: reportsError }, { data: usersData, error: usersError }] = await Promise.all([
                    reportsPromise,
                    usersPromise
                ])

                if (reportsError) throw reportsError
                if (usersError) throw usersError

                if (mounted && reportsData) {
                    // --- Process Data Client-Side ---

                    // 1. Price Trends (Daily Avg by Fuel Type)
                    const trendsMap = new Map<string, any>()
                    // Initialize map for last 30 days to ensure continuity in charts
                    for (let i = 29; i >= 0; i--) {
                        const d = subDays(new Date(), i)
                        const key = format(d, 'MMM dd')
                        trendsMap.set(key, { date: key, PMS: 0, AGO: 0, DPK: 0, LPG: 0, counts: { PMS: 0, AGO: 0, DPK: 0, LPG: 0 } })
                    }

                    reportsData.forEach((report: any) => {
                        const dateKey = format(new Date(report.created_at), 'MMM dd')
                        const entry = trendsMap.get(dateKey)
                        if (entry && report.price && report.fuel_type) {
                           // Simple cumulative average logic
                           const type = report.fuel_type as 'PMS' | 'AGO' | 'DPK' | 'LPG'
                           if (entry.counts[type] !== undefined) {
                               entry[type] += report.price
                               entry.counts[type] += 1
                           }
                        }
                    })

                    const formattedTrends = Array.from(trendsMap.values()).map(day => ({
                        date: day.date,
                        PMS: day.counts.PMS ? Math.round(day.PMS / day.counts.PMS) : null,
                        AGO: day.counts.AGO ? Math.round(day.AGO / day.counts.AGO) : null,
                        DPK: day.counts.DPK ? Math.round(day.DPK / day.counts.DPK) : null,
                        LPG: day.counts.LPG ? Math.round(day.LPG / day.counts.LPG) : null,
                    }))

                    // 2. Volume (Reports per day)
                    const volumeMap = new Map<string, number>()
                     for (let i = 29; i >= 0; i--) {
                        const key = format(subDays(new Date(), i), 'MMM dd')
                        volumeMap.set(key, 0)
                    }
                    reportsData.forEach((report: any) => {
                        const key = format(new Date(report.created_at), 'MMM dd')
                        volumeMap.set(key, (volumeMap.get(key) || 0) + 1)
                    })
                    const formattedVolume = Array.from(volumeMap.entries()).map(([date, count]) => ({ date, count }))

                    // 3. User Growth
                    const growthMap = new Map<string, number>()
                    for (let i = 29; i >= 0; i--) {
                        const key = format(subDays(new Date(), i), 'MMM dd')
                        growthMap.set(key, 0)
                    }
                    if (usersData) {
                        usersData.forEach((user: any) => {
                             const key = format(new Date(user.created_at), 'MMM dd')
                             growthMap.set(key, (growthMap.get(key) || 0) + 1)
                        })
                    }
                    const formattedGrowth = Array.from(growthMap.entries()).map(([date, new_users]) => ({ date, new_users }))

                    // 4. Fuel Distribution
                    const fuelCounts: Record<string, number> = {}
                    reportsData.forEach((report: any) => {
                        const type = report.fuel_type || 'Unknown'
                        fuelCounts[type] = (fuelCounts[type] || 0) + 1
                    })
                    const fuel_distribution = Object.entries(fuelCounts).map(([fuel_type, count]) => ({ fuel_type, count }))

                    // 5. Top Stations
                    const stationCounts: Record<string, number> = {}
                    reportsData.forEach((report: any) => {
                        const name = report.stations?.name || 'Unknown Station'
                        stationCounts[name] = (stationCounts[name] || 0) + 1
                    })
                    const top_stations = Object.entries(stationCounts)
                        .map(([name, reports]) => ({ name, reports }))
                        .sort((a, b) => b.reports - a.reports)
                        .slice(0, 5)

                    // 6. Regional Stats (Derived from Address - very naive)
                    // We'll just group by the first part of the address or just use raw address if short
                    const regionMap = new Map<string, { reports: number, users: Set<string>, prices: number[], total_price: number }>()

                    reportsData.forEach((report: any) => {
                        // Attempt to extract a meaningful "region" or "city"
                        // Assuming address format "123 Street, City, State"
                        let region = 'Unknown'
                        const addr = report.stations?.address
                        if (addr) {
                             const parts = addr.split(',')
                             if (parts.length > 1) {
                                 // Try to grab the last part (State) or second to last (City)
                                 region = parts[parts.length - 1].trim()
                             } else {
                                 region = addr.trim() // Fallback to full address
                             }
                        }

                        if (!regionMap.has(region)) {
                            regionMap.set(region, { reports: 0, users: new Set(), prices: [], total_price: 0 })
                        }
                        const entry = regionMap.get(region)!
                        entry.reports += 1
                        if (report.user_id) entry.users.add(report.user_id)
                        if (report.price && report.fuel_type === 'PMS') { // Avg price usually for PMS
                            entry.prices.push(report.price)
                            entry.total_price += report.price
                        }
                    })

                    const regional_stats = Array.from(regionMap.entries())
                        .map(([region, stats]) => ({
                            region,
                            reports: stats.reports,
                            active_users: stats.users.size,
                            avg_pms_price: stats.prices.length > 0 ? Math.round(stats.total_price / stats.prices.length) : 0
                        }))
                        .sort((a, b) => b.reports - a.reports)
                        .slice(0, 10) // Top 10 regions

                    // 7. Verification Data (Raw rows)
                    const verification_data = reportsData.slice(0, 20).map((r: any) => ({
                        created_at: r.created_at,
                        station_id: r.station_id,
                        station_name: r.stations?.name || 'Unknown',
                        region: r.stations?.address || 'Unknown',
                        fuel_type: r.fuel_type,
                        price: r.price,
                        user_id: r.user_id,
                        reported_by: r.profiles?.full_name
                    }))

                    setData({
                        formattedTrends,
                        formattedGrowth,
                        formattedVolume,
                        fuel_distribution,
                        top_stations,
                        regional_stats,
                        verification_data,
                        recent_activity_volume: formattedVolume // Map to expected prop for card
                    })
                }

            } catch (error) {
                console.error('Error fetching analytics:', error)
            } finally {
                clearTimeout(safetyTimeout)
                if (mounted) setLoading(false)
            }
        }

        fetchData()

        return () => { mounted = false }
    }, [authLoading])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Analytics...</span>
            </div>
        )
    }

    // Handle empty data state
    const totalReports = data?.recent_activity_volume?.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0
    const totalNewUsers = data?.formattedGrowth?.reduce((acc: number, curr: any) => acc + curr.new_users, 0) || 0

    // Get latest PMS price safely
    const latestTrends = data?.formattedTrends ? [...data.formattedTrends].reverse().find((d: any) => d.PMS > 0) : null
    const currentPrice = latestTrends?.PMS || '---'

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    Analytics Dashboard
                </h1>
                <p className="text-muted-foreground">Deep dive into prices, user growth, and system usage.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reports (30d)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalReports}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 30 days activity</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Petrol Price</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₦{currentPrice}
                        </div>
                        <p className="text-xs text-muted-foreground">Latest daily average</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Users (30d)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalNewUsers}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

                {/* Main Chart: Price Trends */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Price Trends (Last 30 Days)</CardTitle>
                        <CardDescription>Daily average price fluctuations by fuel type.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={data?.formattedTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₦${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    formatter={(value: any) => [`₦${value}`, 'Price']}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="PMS" name="Petrol" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="AGO" name="Diesel" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="DPK" name="Kerosene" stroke="#eab308" strokeWidth={2} dot={false} connectNulls />
                                <Line type="monotone" dataKey="LPG" name="Gas" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Side Chart: Fuel Mix */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Report Distribution</CardTitle>
                        <CardDescription>Breakdown of reports by fuel type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={data?.fuel_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="fuel_type"
                                >
                                    {data?.fuel_distribution?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* User Growth */}
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                        <CardDescription>New user signups over the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data?.formattedGrowth}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="new_users" name="New Users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Stations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Active Stations</CardTitle>
                        <CardDescription>Stations with the most price reports.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart layout="vertical" data={data?.top_stations}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} interval={0} />
                                <Tooltip />
                                <Bar dataKey="reports" name="Reports" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Reports by Region */}
                <Card>
                    <CardHeader>
                        <CardTitle>Reports by Location</CardTitle>
                        <CardDescription>Volume of activity per region.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data?.regional_stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="region" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="reports" name="Reports" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Users by Region */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Users</CardTitle>
                        <CardDescription>Unique contributors by region.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data?.regional_stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="region" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="active_users" name="Users" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Price by Region */}
                <Card>
                    <CardHeader>
                        <CardTitle>Avg Petrol Price</CardTitle>
                        <CardDescription>Regional price comparison.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data?.regional_stats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide domain={['dataMin - 50', 'auto']} />
                                <YAxis dataKey="region" type="category" width={80} tick={{ fontSize: 12 }} interval={0} />
                                <Tooltip formatter={(value) => `₦${value}`} />
                                <Bar dataKey="avg_pms_price" name="Avg Price" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Data Verification Section */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Source Data Verification</CardTitle>
                    <CardDescription>Recent reports used to calculate the analytics above. Use this to verify data integrity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Reported By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.verification_data?.map((item: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                        {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/stations/${item.station_id}`} className="hover:underline text-primary">
                                            {item.station_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{item.region}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.fuel_type === 'PMS' ? 'bg-red-100 text-red-800' :
                                                item.fuel_type === 'AGO' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {item.fuel_type}
                                        </span>
                                    </TableCell>
                                    <TableCell>₦{item.price}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.user_id ? (
                                            <Link href={`/dashboard/users/${item.user_id}`} className="hover:underline text-primary">
                                                {item.reported_by || 'Unknown User'}
                                            </Link>
                                        ) : (
                                            item.reported_by || 'Anonymous'
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
