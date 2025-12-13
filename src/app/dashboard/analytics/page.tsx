"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"
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
    AreaChart,
    Area
} from "recharts"
import { Loader2, TrendingUp, Users, Activity, Fuel, Calendar } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
        if (authLoading) return

        const fetchData = async () => {
            setLoading(true)
            const { data: analytics, error } = await supabase.rpc('get_dashboard_analytics')

            if (error) {
                console.error('Error fetching analytics:', error)
            } else {
                // Process dates for charts
                if (analytics) {
                    // Transform Price Trends to be Chart-friendly (pivot by fuel type if needed, or structured array)
                    // The SQL returns raw rows. We might need to group them by date for multi-line chart.
                    const trendMap = new Map();
                    analytics.price_trends.forEach((item: any) => {
                        const d = format(new Date(item.date), 'MMM dd');
                        if (!trendMap.has(d)) trendMap.set(d, { date: d });
                        const existing = trendMap.get(d);
                        existing[item.fuel_type] = item.avg_price;
                    });
                    const formattedTrends = Array.from(trendMap.values());

                    // User Growth
                    const formattedGrowth = analytics.user_growth.map((d: any) => ({
                        date: format(new Date(d.date), 'MMM dd'),
                        new_users: d.new_users
                    }));

                    // Volume
                    const formattedVolume = analytics.recent_activity_volume.map((d: any) => ({
                        date: format(new Date(d.date), 'MMM dd'),
                        count: d.count
                    }));

                    setData({
                        ...analytics,
                        formattedTrends,
                        formattedGrowth,
                        formattedVolume
                    })
                }
            }
            setLoading(false)
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
                            {data?.recent_activity_volume.reduce((acc: number, curr: any) => acc + curr.count, 0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Petrol Price</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₦{data?.formattedTrends[data.formattedTrends.length - 1]?.['PMS'] || data?.formattedTrends[data.formattedTrends.length - 1]?.['Petrol'] || '---'}
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
                            {data?.user_growth.reduce((acc: number, curr: any) => acc + curr.new_users, 0) || 0}
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
                                {/* Dynamically generate lines if multiple fuel types exist, for now assuming PMS/NGO/AGO standard keys if they appear */}
                                <Line type="monotone" dataKey="PMS" name="Petrol" stroke="#ef4444" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="AGO" name="Diesel" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="DPK" name="Kerosene" stroke="#eab308" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="LPG" name="Gas" stroke="#22c55e" strokeWidth={2} dot={false} />
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
