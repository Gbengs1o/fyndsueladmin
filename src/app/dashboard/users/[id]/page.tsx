
"use client"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { format, formatDistanceToNow } from "date-fns"
import { ArrowLeft, DollarSign, ExternalLink, Flag, Gamepad2, ImageIcon, Lightbulb, Loader2, Mail, Phone, ShieldX, Star, TrendingUp, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserProfile {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    provider: string;
    isAdmin: boolean;
    role: string;
    is_banned: boolean;
}

interface PriceReport {
    id: number;
    created_at: string;
    price: number | null;
    station_name: string;
    station_address: string;
    fuel_type: string;
    rating: number;
    notes: string;
    photo_url: string | null;
    status: string;
    station_id?: number;
}

interface Suggestion {
    id: number;
    name: string;
    address: string;
    status: string;
    created_at: string;
}

interface FlaggedItem {
    id: number;
    reason: string;
    station_name: string;
    created_at: string;
    station_id?: number;
}

interface PointTransaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    created_at: string;
}

interface RedemptionRequest {
    id: number;
    amount_points: number;
    amount_naira: number;
    status: string;
    created_at: string;
}

export default function UserDetailPage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()

    const [user, setUser] = React.useState<UserProfile | null>(null)
    const [reports, setReports] = React.useState<PriceReport[]>([])
    const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
    const [flags, setFlags] = React.useState<FlaggedItem[]>([])

    // Gamification Data
    const [transactions, setTransactions] = React.useState<PointTransaction[]>([])
    const [redemptions, setRedemptions] = React.useState<RedemptionRequest[]>([])
    const [totalPoints, setTotalPoints] = React.useState(0)

    // Derived Stats
    const [trustScore, setTrustScore] = React.useState(0)

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const fetchUserData = React.useCallback(async () => {
        if (!userId) return

        setLoading(true)
        setError(null)

        // 1. User Profile via RPC to ensuring email is fetched
        const profilePromise = supabase.rpc('get_admin_user_details', { target_user_id: userId }).single()

        // 3. Price Reports (Expanded)
        const reportsPromise = supabase
            .from('price_reports')
            .select(`
                id, created_at, price, fuel_type, rating, notes, photo_url, status, station_id,
                stations ( name, address )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 4. Suggestions (Expanded)
        const suggestionsPromise = supabase
            .from('suggested_fuel_stations')
            .select('id, name, address, status, created_at')
            .eq('submitted_by', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 5. Flags
        const flagsPromise = supabase
            .from('flagged_stations')
            .select(`
                id, reason, created_at, station_id,
                stations ( name )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 6. Point Transactions
        const transactionsPromise = supabase
            .from('point_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 7. Redemption Requests
        const redemptionsPromise = supabase
            .from('redemption_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)

        // 8. Stats (Total Points)
        const statsPromise = supabase.rpc('get_user_stats', { target_user_id: userId })

        const [
            { data: profileData, error: profileError },
            { data: reportsData },
            { data: suggestionsData },
            { data: flagsData },
            { data: transactionsData },
            { data: redemptionsData },
            { data: statsData }
        ] = await Promise.all([
            profilePromise,
            reportsPromise,
            suggestionsPromise,
            flagsPromise,
            transactionsPromise,
            redemptionsPromise,
            statsPromise
        ]);

        if (profileError || !profileData) {
            console.error("Error fetching profile:", profileError?.message)
            setError("Could not find the requested user.")
            setUser(null)
        } else {
            setUser({
                ...profileData,
                isAdmin: profileData.role === 'admin'
            });
        }

        if (reportsData) {
            setReports(reportsData.map((r: any) => ({
                id: r.id,
                created_at: r.created_at,
                price: r.price,
                fuel_type: r.fuel_type || 'Unknown',
                rating: r.rating || 0,
                notes: r.notes,
                photo_url: r.photo_url,
                status: r.status,
                station_name: r.stations?.name || 'Unknown Station',
                station_address: r.stations?.address || '',
                station_id: r.station_id
            })))
        }

        if (suggestionsData) {
            const sData = suggestionsData.map((s: any) => ({
                id: s.id,
                name: s.name,
                address: s.address,
                status: s.status,
                created_at: s.created_at
            }));
            setSuggestions(sData);

            // Calculate Trust Score based on suggestions
            const total = sData.length;
            if (total > 0) {
                const approved = sData.filter(s => s.status === 'approved').length;
                setTrustScore(Math.round((approved / total) * 100));
            } else {
                setTrustScore(100);
            }
        }

        if (flagsData) {
            setFlags(flagsData.map((f: any) => ({
                id: f.id,
                reason: f.reason,
                created_at: f.created_at,
                station_name: f.stations?.name || 'Unknown Station',
                station_id: f.station_id
            })))
        }

        if (transactionsData) setTransactions(transactionsData)
        if (redemptionsData) setRedemptions(redemptionsData)

        // Handle User Stats Response (might be array or single object depending on RPC)
        if (statsData) {
            const stats = Array.isArray(statsData) ? statsData[0] : statsData;
            if (stats && typeof stats.total_points === 'number') {
                setTotalPoints(stats.total_points);
            }
        }

        setLoading(false)
    }, [userId])

    React.useEffect(() => {
        if (!authLoading) {
            fetchUserData()
        }
    }, [fetchUserData, authLoading])

    const handleToggleBan = async () => {
        if (!user) return
        const { data: newStatus, error } = await supabase.rpc('toggle_ban_user', { target_user_id: user.id })

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Success", description: `User ${newStatus ? 'banned' : 'unbanned'}.` })
            fetchUserData()
        }
    }

    const handleToggleAdmin = async () => {
        if (!user) return
        const { data: newRole, error } = await supabase.rpc('toggle_admin_role', { target_user_id: user.id })

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Success", description: `User role updated to ${newRole}.` })
            fetchUserData()
        }
    }

    const handleDeleteUser = async () => {
        if (!user || !confirm("Are you sure you want to PERMANENTLY delete this user? This cannot be undone.")) return

        const { error } = await supabase.rpc('delete_user_completely', { target_user_id: user.id })

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Success", description: "User permanently deleted." })
            router.push('/dashboard/users')
        }
    }

    if (loading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading User Profile...</p>
            </div>
        )
    }

    if (error || !user) {
        return (
            <div className="text-center py-10">
                <p className="text-lg font-semibold text-destructive">{error || "User not found."}</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight font-headline">User Profile</h1>
                    {user.isAdmin && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Administrator</Badge>}
                    {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{trustScore}%</div>
                        <Progress value={trustScore} className={`h-2 mt-2 ${trustScore < 50 ? "bg-red-100 [&>div]:bg-red-500" : "bg-green-100 [&>div]:bg-green-500"}`} />
                        <p className="text-xs text-muted-foreground mt-2">Based on approved suggestions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contributions</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reports.length}</div>
                        <p className="text-xs text-muted-foreground">Price reports submitted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
                        <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{suggestions.length}</div>
                        <p className="text-xs text-muted-foreground">New stations proposed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Flags Raised</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{flags.length}</div>
                        <p className="text-xs text-muted-foreground">Content flagged</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                        <Gamepad2 className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earned points</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* --- Left Column: Profile Card --- */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Avatar className="h-32 w-32 mb-4">
                                <AvatarImage src={user.avatar_url || ''} />
                                <AvatarFallback className="text-3xl">
                                    <UserIcon className="w-12 h-12" />
                                </AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-2xl">{user.full_name || "Anonymous User"}</CardTitle>
                            <CardDescription>{user.email || user.phone}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm">
                            <div className="flex flex-col gap-2 mb-6">
                                <div className="flex gap-2">
                                    <Button
                                        variant={user.isAdmin ? "destructive" : "default"}
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleToggleAdmin}
                                    >
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                                    </Button>
                                    <Button
                                        variant={user.is_banned ? "outline" : "destructive"}
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleToggleBan}
                                    >
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        {user.is_banned ? "Unban User" : "Ban User"}
                                    </Button>
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteUser}>
                                    Delete User Permanently
                                </Button>
                            </div>
                            <div className="space-y-4 pt-4 text-muted-foreground border-t">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-full"><UserIcon className="h-4 w-4 opacity-70" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase">Member Since</span>
                                        <span className="font-medium text-foreground">{format(new Date(user.created_at), "MMMM d, yyyy")}</span>
                                    </div>
                                </div>
                                {user.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-full"><Phone className="h-4 w-4 opacity-70" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground uppercase">Phone</span>
                                            <span className="font-medium text-foreground">{user.phone}</span>
                                        </div>
                                    </div>
                                )}
                                {user.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-full"><Mail className="h-4 w-4 opacity-70" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground uppercase">Email</span>
                                            <span className="font-medium text-foreground">{user.email}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Right Column: Activity Tabs --- */}
                <div className="md:col-span-2">
                    <Tabs defaultValue="reports" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="reports">Price Reports</TabsTrigger>
                            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                            <TabsTrigger value="flags">Flags</TabsTrigger>
                            <TabsTrigger value="gamification">Gamification</TabsTrigger>
                        </TabsList>

                        {/* --- Tab: Price Reports --- */}
                        <TabsContent value="reports">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Price Submission History</CardTitle>
                                    <CardDescription>Detailed log of prices updated by {user.full_name?.split(' ')[0]}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Station Info</TableHead>
                                                <TableHead>Fuel & Price</TableHead>
                                                <TableHead>Details</TableHead>
                                                <TableHead className="text-right">Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reports.length > 0 ? reports.map((report) => (
                                                <TableRow key={report.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{report.station_name}</div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{report.station_address}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit">{report.fuel_type}</Badge>
                                                            <span className="font-bold">₦{report.price ? report.price.toFixed(2) : '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center gap-1 text-yellow-500">
                                                                <Star className="w-3 h-3 fill-current" />
                                                                <span>{report.rating || 0}/5</span>
                                                            </div>
                                                            {report.notes && <span className="text-muted-foreground italic truncate max-w-[150px]">"{report.notes}"</span>}
                                                            {report.photo_url && (
                                                                <div className="flex items-center gap-1 text-blue-500">
                                                                    <ImageIcon className="w-3 h-3" />
                                                                    <span>Photo attached</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground text-xs">
                                                        {formatDistanceToNow(new Date(report.created_at))} ago
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No reports found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Suggestions --- */}
                        <TabsContent value="suggestions">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Suggested Stations</CardTitle>
                                    <CardDescription>Track record of station suggestions.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Station Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {suggestions.length > 0 ? suggestions.map((s) => (
                                                <TableRow key={s.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{s.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.address}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                            {s.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {format(new Date(s.created_at), "MMM d, yyyy")}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No suggestions found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Flags --- */}
                        <TabsContent value="flags">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Flagged Content</CardTitle>
                                    <CardDescription>Content this user identified as problematic.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Station</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead className="text-right">Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {flags.length > 0 ? flags.map((f) => (
                                                <TableRow key={f.id}>
                                                    <TableCell className="font-medium">
                                                        <Link href={`/dashboard/stations/${f.station_id || ''}`} className="hover:underline flex items-center gap-1">
                                                            {f.station_name} <ExternalLink className="h-3 w-3 opacity-50" />
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className="text-destructive border-destructive">{f.reason}</Badge></TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {formatDistanceToNow(new Date(f.created_at))} ago
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No flags found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Gamification --- */}
                        <TabsContent value="gamification">
                            <div className="flex flex-col gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Point History</CardTitle>
                                        <CardDescription>Recent point earnings and deductions</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                    <TableHead className="text-right">Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions.length > 0 ? transactions.map((t) => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="font-medium capitalize">{t.type.replace(/_/g, ' ')}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{t.description}</TableCell>
                                                        <TableCell className={`text-right font-mono ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t.amount > 0 ? '+' : ''}{t.amount}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground text-xs">
                                                            {format(new Date(t.created_at), "MMM d, h:mm a")}
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No transactions found.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Redemption Requests</CardTitle>
                                        <CardDescription>History of cash out requests</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {redemptions.length > 0 ? redemptions.map((r) => (
                                                    <TableRow key={r.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">₦{r.amount_naira.toLocaleString()}</span>
                                                                <span className="text-xs text-muted-foreground">{r.amount_points.toLocaleString()} pts</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                                {r.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground text-xs">
                                                            {format(new Date(r.created_at), "MMM d, yyyy")}
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No redemptions found.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
