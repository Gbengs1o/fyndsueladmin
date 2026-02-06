'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Fuel, Zap, Flame, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [station, setStation] = useState<any>(null)
    const [groundTruth, setGroundTruth] = useState<any>(null)
    const [prices, setPrices] = useState({
        pms: 0,
        ago: 0,
        dpk: 0,
        lpg: 0
    })

    useEffect(() => {
        async function fetchStationData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('manager_profiles')
                .select('*, stations(*)')
                .eq('id', user.id)
                .single()

            if (profile && profile.stations) {
                setStation(profile.stations)
                setPrices({
                    pms: profile.stations.official_price_pms || 0,
                    ago: profile.stations.official_price_ago || 0,
                    dpk: profile.stations.official_price_dpk || 0,
                    lpg: profile.stations.official_price_lpg || 0,
                })

                // Fetch latest ground truth
                const { data: reports } = await supabase
                    .from('price_reports')
                    .select('queue_length, meter_accuracy, availability_status, created_at')
                    .eq('station_id', profile.stations.id)
                    .order('created_at', { ascending: false })
                    .limit(1)

                if (reports && reports.length > 0) {
                    setGroundTruth(reports[0])
                }
            }
            setLoading(false)
        }
        fetchStationData()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            // According to instructions, we UPSERT to official_prices
            // and it syncs to stations.
            // We need to know the brand and state of the station to target the right official price.

            const { error } = await supabase
                .from('official_prices')
                .upsert({
                    state: station.state,
                    brand: station.brand || 'all',
                    pms_price: prices.pms,
                    ago_price: prices.ago,
                    dpk_price: prices.dpk,
                    lpg_price: prices.lpg,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'state,brand' // Assuming these are the unique keys for official prices
                })

            if (error) throw error

            alert('Prices updated successfully!')
        } catch (error: any) {
            alert(error.message || 'Failed to update prices')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-foreground">Price Updater</h1>
                <p className="text-muted-foreground">Update your station's prices in real-time.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PMS Card */}
                <Card className="bg-card border-border overflow-hidden hover:border-emerald-500/50 transition-colors">
                    <CardHeader className="bg-emerald-500/10 border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 rounded-lg">
                                <Fuel className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-card-foreground text-lg">PMS (Petrol)</CardTitle>
                                <CardDescription className="text-emerald-500 font-medium">Active Price</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                            <Input
                                type="number"
                                value={prices.pms}
                                onChange={(e) => setPrices({ ...prices, pms: parseFloat(e.target.value) })}
                                className="bg-secondary/50 border-input h-20 pl-12 text-3xl font-bold text-foreground focus:ring-emerald-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* AGO Card */}
                <Card className="bg-card border-border overflow-hidden hover:border-amber-500/50 transition-colors">
                    <CardHeader className="bg-amber-500/10 border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-card-foreground text-lg">AGO (Diesel)</CardTitle>
                                <CardDescription className="text-amber-500 font-medium">Active Price</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                            <Input
                                type="number"
                                value={prices.ago}
                                onChange={(e) => setPrices({ ...prices, ago: parseFloat(e.target.value) })}
                                className="bg-secondary/50 border-input h-20 pl-12 text-3xl font-bold text-foreground focus:ring-amber-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* LPG Card */}
                <Card className="bg-card border-border overflow-hidden hover:border-blue-500/50 transition-colors">
                    <CardHeader className="bg-blue-500/10 border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Flame className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-card-foreground text-lg">LPG (Gas)</CardTitle>
                                <CardDescription className="text-blue-500 font-medium">Active Price</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                            <Input
                                type="number"
                                value={prices.lpg}
                                onChange={(e) => setPrices({ ...prices, lpg: parseFloat(e.target.value) })}
                                className="bg-secondary/50 border-input h-20 pl-12 text-3xl font-bold text-foreground focus:ring-blue-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* DPK Card */}
                <Card className="bg-card border-border overflow-hidden hover:border-purple-500/50 transition-colors">
                    <CardHeader className="bg-purple-500/10 border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <Fuel className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-card-foreground text-lg">DPK (Kerosene)</CardTitle>
                                <CardDescription className="text-purple-500 font-medium">Active Price</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                            <Input
                                type="number"
                                value={prices.dpk}
                                onChange={(e) => setPrices({ ...prices, dpk: parseFloat(e.target.value) })}
                                className="bg-secondary/50 border-input h-20 pl-12 text-3xl font-bold text-foreground focus:ring-purple-500"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ground Truth Section */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-foreground">Ground Truth</h2>
                <p className="text-muted-foreground">Live feedback from your customers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Queue Length</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-card-foreground capitalize">{groundTruth?.queue_length || 'No Data'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {groundTruth ? `Reported ${new Date(groundTruth.created_at).toLocaleTimeString()}` : 'Waiting for reports'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Meter Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-card-foreground">
                            {groundTruth?.meter_accuracy ? `${groundTruth.meter_accuracy}/5` : 'No Data'}
                        </div>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <div
                                    key={star}
                                    className={`w-1.5 h-1.5 rounded-full ${star <= (groundTruth?.meter_accuracy || 0) ? 'bg-primary' : 'bg-muted'}`}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Availability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold capitalize ${groundTruth?.availability_status === 'available' ? 'text-primary' : 'text-destructive'}`}>
                            {groundTruth?.availability_status?.replace('_', ' ') || 'Unknown'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Promotional Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={`bg-card border-border transition-colors ${station?.is_flash_sale ? 'border-primary bg-primary/10' : ''}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-card-foreground text-lg flex items-center justify-between">
                            Flash Sale
                            <div className={`w-3 h-3 rounded-full ${station?.is_flash_sale ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-muted'}`} />
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Boost visibility on the map</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant={station?.is_flash_sale ? "secondary" : "outline"}
                            className="w-full font-bold"
                            onClick={async () => {
                                const newVal = !station?.is_flash_sale
                                const { error } = await supabase.from('stations').update({ is_flash_sale: newVal }).eq('id', station.id)
                                if (!error) setStation({ ...station, is_flash_sale: newVal })
                            }}
                        >
                            {station?.is_flash_sale ? 'Active' : 'Enable Flash Sale'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className={`bg-card border-border transition-colors ${station?.is_out_of_stock ? 'border-destructive bg-destructive/10' : ''}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-card-foreground text-lg flex items-center justify-between">
                            Out of Fuel
                            <div className={`w-3 h-3 rounded-full ${station?.is_out_of_stock ? 'bg-destructive shadow-[0_0_10px_var(--destructive)]' : 'bg-muted'}`} />
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Mark station as empty</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant={station?.is_out_of_stock ? "destructive" : "outline"}
                            className="w-full font-bold hover:bg-red-900 border-red-900 text-red-500 hover:text-red-100"
                            onClick={async () => {
                                const newVal = !station?.is_out_of_stock
                                const { error } = await supabase.from('stations').update({ is_out_of_stock: newVal }).eq('id', station.id)
                                if (!error) setStation({ ...station, is_out_of_stock: newVal })
                            }}
                        >
                            {station?.is_out_of_stock ? 'Marked as Out of Stock' : 'Mark Out of Stock'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-24 left-0 right-0 p-4 md:static md:p-0 z-30">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    {saving ? 'Saving Changes...' : 'Save Price Changes'}
                </Button>
            </div>
        </div>
    )
}
