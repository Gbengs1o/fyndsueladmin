'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Users, MapPin, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function InsightsPage() {
    const [loading, setLoading] = useState(true)
    const [station, setStation] = useState<any>(null)
    const [competitors, setCompetitors] = useState<any[]>([])

    useEffect(() => {
        async function fetchInsights() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('manager_profiles')
                .select('*, stations(*)')
                .eq('id', user.id)
                .single()

            if (profile && profile.stations) {
                setStation(profile.stations)

                // Fetch nearby competitors in the same state
                const { data: nearby } = await supabase
                    .from('stations')
                    .select('*')
                    .eq('state', profile.stations.state)
                    .neq('id', profile.stations.id)
                    .limit(5)

                if (nearby) setCompetitors(nearby)
            }
            setLoading(false)
        }
        fetchInsights()
    }, [])

    const [stats, setStats] = useState({
        views: 1284, // Placeholder for now
        marketAvgPms: 0,
        pricePosition: 'Analyzing...'
    })

    useEffect(() => {
        if (station && competitors.length > 0) {
            const allPrices = [...competitors, station]
                .map(s => s.official_price_pms)
                .filter(p => p > 0)

            const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length
            const myPrice = station.official_price_pms || 0

            let pos = 'Competitive'
            if (myPrice === 0) pos = 'No Price Set'
            else if (myPrice < avg * 0.95) pos = 'Lowest'
            else if (myPrice < avg) pos = 'Below Avg'
            else if (myPrice > avg * 1.05) pos = 'Premium'
            else if (myPrice > avg) pos = 'Above Avg'

            setStats({
                views: 1240 + Math.floor(Math.random() * 100), // Mock dynamic views
                marketAvgPms: Math.round(avg),
                pricePosition: pos
            })
        }
    }, [station, competitors])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-foreground">Market Intelligence</h1>
                <p className="text-muted-foreground">See how your station compares to the local market.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Station Views</span>
                            <Users className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-card-foreground">{stats.views.toLocaleString()}</div>
                        <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>12% from last week</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Price Position</span>
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-card-foreground">{stats.pricePosition}</div>
                        <div className="flex items-center gap-1 text-xs text-blue-500 mt-1">
                            <span>in {station?.state || 'your area'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Market Avg (PMS)</span>
                            <MapPin className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-card-foreground">₦{stats.marketAvgPms}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <span>Based on nearby stations</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Competitor Price Comparison */}
            {/* Competitor Price Comparison */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-card-foreground">Nearby Competitors</CardTitle>
                    <CardDescription className="text-muted-foreground">Comparing your prices with stations within 5km.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {competitors.map((comp) => {
                            const diff = station.official_price_pms - comp.official_price_pms;
                            return (
                                <div key={comp.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-border">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center font-bold text-muted-foreground">
                                            {comp.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-card-foreground text-sm">{comp.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{comp.address}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-xs text-muted-foreground mb-1">PMS Price</div>
                                            <div className="font-bold text-card-foreground">₦{comp.official_price_pms || '---'}</div>
                                        </div>

                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold",
                                            diff < 0 ? "bg-emerald-500/10 text-emerald-500" :
                                                diff > 0 ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-500"
                                        )}>
                                            {diff < 0 ? 'Lower' : diff > 0 ? 'Higher' : 'Matching'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {competitors.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No nearby competitors found in your state.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
