'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MessageSquare, Clock, Gauge, Ban, Loader2, Star } from 'lucide-react'

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<any[]>([])

    useEffect(() => {
        async function fetchReports() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('manager_profiles')
                .select('station_id')
                .eq('id', user.id)
                .single()

            if (profile) {
                const { data } = await supabase
                    .from('price_reports')
                    .select('*')
                    .eq('station_id', profile.station_id)
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (data) setReports(data)
            }
            setLoading(false)
        }
        fetchReports()
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-foreground">Ground Truth</h1>
                <p className="text-muted-foreground">See what customers are saying about your station.</p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-emerald-500/80">Queue Time</span>
                            <Clock className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">Short</div>
                        <p className="text-xs text-emerald-500/60 mt-1">Reported 15m ago</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-500/80">Meter Accuracy</span>
                            <Gauge className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">Excellent</div>
                        <p className="text-xs text-blue-500/60 mt-1">98% customer score</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-amber-500/80">Availability</span>
                            <Ban className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-foreground">Available</div>
                        <p className="text-xs text-amber-500/60 mt-1">All fuel types in stock</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <h3 className="text-xl font-bold text-foreground mb-4">Recent User Activity</h3>
            <div className="space-y-4">
                {reports.map((report) => (
                    <Card key={report.id} className="bg-card border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-muted-foreground">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${i < (report.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">• {new Date(report.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            User reported PMS at <span className="text-foreground font-bold">₦{report.pms_price || '---'}</span>
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                {report.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {reports.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-xl border border-border">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No user reports found for your station yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
