"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from "date-fns"
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

// Helper to extract state from address
const extractRegion = (address: string | null): string => {
    if (!address) return 'Unknown'
    const parts = address.split(',')
    // Heuristic: Last part is usually state or country, second to last might be city/state
    // For Nigerian addresses often like: "123 Street, Ikeja, Lagos"
    if (parts.length >= 1) {
        const last = parts[parts.length - 1].trim()
        const secondLast = parts.length > 1 ? parts[parts.length - 2].trim() : ''

        // List of common Nigerian states/cities to check against if needed
        // For now, let's just take the last part if it looks like a state, or second to last.
        // Let's assume the last part is the State.
        return last.replace(/\.$/, '') // Remove trailing dot
    }
    return 'Unknown'
}

export default function AnalyticsPage() {
    const { isLoading: authLoading } = useAuth()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return

        const fetchData = async () => {
            setLoading(true)
            const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

            try {
                // 1. Fetch Price Reports (Last 30 Days)
                const reportsPromise = supabase
                    .from('price_reports')
                    .select('created_at, price, fuel_type, station_id, user_id')
                    .gte('created_at', thirtyDaysAgo)
                    .order('created_at', { ascending: true })

                // 2. Fetch User Growth (Last 30 Days)
                const usersPromise = supabase
                    .from('profiles')
                    .select('created_at')
                    .gte('created_at', thirtyDaysAgo)

                // 3. Fetch Stations (For names and addresses)
                // We fetch all stations to map IDs and extract regions.
                // Optimization: We could filter by IDs found in reports, but fetching all stations (usually < thousands) is okay for client-side mapping.
                const stationsPromise = supabase
                    .from('stations')
                    .select('id, name, address, is_active')

                // 4. Verification Data (Latest 20 reports with joins)
                const verificationPromise = supabase
                    .from('price_reports')
                    .select('created_at, price, fuel_type, station_id, user_id, stations(name, address), profiles(full_name)')
                    .order('created_at', { ascending: false })
                    .limit(20)

                const [
                    { data: reports, error: reportsError },
                    { data: newUsers, error: usersError },
                    { data: stations, error: stationsError },
                    { data: verificationData, error: verificationError }
                ] = await Promise.all([
                    reportsPromise,
                    usersPromise,
                    stationsPromise,
                    verificationPromise
                ])

                if (reportsError) console.error("Error fetching reports:", reportsError)
                if (usersError) console.error("Error fetching users:", usersError)
                if (stationsError) console.error("Error fetching stations:", stationsError)
                if (verificationError) console.error("Error fetching verification data:", verificationError)

                // --- PROCESS DATA ---

                // Map stations for quick lookup
                const stationMap = new Map(stations?.map((s: any) => [s.id, s]) || [])

                // 1. Price Trends & Volume (Daily)
                const dateRange = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })

                const formattedTrends = dateRange.map(date => {
                    const dayStr = format(date, 'MMM dd')
                    const dayReports = reports?.filter((r: any) => isSameDay(new Date(r.created_at), date)) || []

                    // Avg Price per Fuel Type
                    const fuelTypes = ['PMS', 'AGO', 'DPK', 'LPG']
                    const prices: any = { date: dayStr }

                    fuelTypes.forEach(type => {
                        const typeReports = dayReports.filter((r: any) => r.fuel_type === type)
                        if (typeReports.length > 0) {
                            const avg = typeReports.reduce((sum: number, r: any) => sum + Number(r.price), 0) / typeReports.length
                            prices[type] = Math.round(avg * 100) / 100
                        }
                    })
                    return prices
                })

                const formattedVolume = dateRange.map(date => {
                    const count = reports?.filter((r: any) => isSameDay(new Date(r.created_at), date)).length || 0
                    return { date: format(date, 'MMM dd'), count }
                })

                // 2. User Growth (Daily)
                const formattedGrowth = dateRange.map(date => {
                    const count = newUsers?.filter((u: any) => isSameDay(new Date(u.created_at), date)).length || 0
                    return { date: format(date, 'MMM dd'), new_users: count }
                })

                // 3. Fuel Distribution
                const fuelDistMap = new Map()
                reports?.forEach((r: any) => {
                    fuelDistMap.set(r.fuel_type, (fuelDistMap.get(r.fuel_type) || 0) + 1)
                })
                const fuel_distribution = Array.from(fuelDistMap.entries()).map(([fuel_type, count]) => ({ fuel_type, count }))

                // 4. Top Stations (by Report Volume)
                const stationCountMap = new Map()
                reports?.forEach((r: any) => {
                    stationCountMap.set(r.station_id, (stationCountMap.get(r.station_id) || 0) + 1)
                })
                const top_stations = Array.from(stationCountMap.entries())
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([id, count]) => ({
                        name: stationMap.get(id)?.name || 'Unknown Station',
                        reports: count
                    }))

                // 5. Regional Stats
                const regionMap = new Map()
                reports?.forEach((r: any) => {
                    const station = stationMap.get(r.station_id)
                    const region = extractRegion(station?.address)
                    if (!regionMap.has(region)) {
                        regionMap.set(region, {
                            region,
                            reports: 0,
                            active_users: new Set(),
                            total_price: 0,
                            price_count: 0
                        })
                    }
                    const entry = regionMap.get(region)
                    entry.reports += 1
                    if (r.user_id) entry.active_users.add(r.user_id)
                    if (r.fuel_type === 'PMS') { // Only track PMS for avg price comparison to be fair
                        entry.total_price += Number(r.price)
                        entry.price_count += 1
                    }
                })

                const regional_stats = Array.from(regionMap.values()).map((entry: any) => ({
                    region: entry.region,
                    reports: entry.reports,
                    active_users: entry.active_users.size,
                    avg_pms_price: entry.price_count > 0 ? Math.round(entry.total_price / entry.price_count) : 0
                })).sort((a: any, b: any) => b.reports - a.reports).slice(0, 8) // Top 8 regions

                // 6. Verification Data Formatting
                const formattedVerification = verificationData?.map((item: any) => ({
                    ...item,
                    station_name: item.stations?.name || 'Unknown',
                    region: extractRegion(item.stations?.address),
                    reported_by: item.profiles?.full_name || 'Anonymous'
                }))

                setData({
                    recent_activity_volume: formattedVolume, // actually array of {date, count}
                    formattedTrends,
                    formattedGrowth,
                    fuel_distribution,
                    top_stations,
                    regional_stats,
                    verification_data: formattedVerification,
                    // raw counts for cards
                    total_reports_30d: reports?.length || 0,
                    total_new_users_30d: newUsers?.length || 0
                })

            } catch (error) {
                console.error("Error processing analytics:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [authLoading])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading Analytics...</span>
            </div>
        )
    }

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
                            {data?.total_reports_30d?.toLocaleString() || 0}
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
                            ₦{data?.formattedTrends[data.formattedTrends.length - 1]?.['PMS'] || '---'}
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
                            {data?.total_new_users_30d?.toLocaleString() || 0}
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
                                    {data?.fuel_distribution.map((entry: any, index: number) => (
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
                                                {item.reported_by}
                                            </Link>
                                        ) : (
                                            item.reported_by
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
