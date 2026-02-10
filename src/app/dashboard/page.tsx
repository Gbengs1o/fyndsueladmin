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
}
