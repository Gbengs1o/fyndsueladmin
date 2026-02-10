'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, History } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface PriceUpdaterProps {
    stationId: string
    initialPrices: {
        pms: number
        ago: number
        dpk: number
    }
}

export function PriceUpdater({ stationId, initialPrices }: PriceUpdaterProps) {
    const [prices, setPrices] = useState(initialPrices)
    const [loading, setLoading] = useState(false)

    const handleUpdate = async () => {
        setLoading(true)
        try {
            // 1. Update Station Prices
            const { error: updateError } = await supabase
                .from('stations')
                .update({
                    price_pms: prices.pms,
                    price_ago: prices.ago,
                    price_dpk: prices.dpk
                })
                .eq('id', stationId)

            if (updateError) throw updateError

            // 2. Log Changes (Optional: could be a trigger, but doing client-side for now for simplicity if trigger isn't set)
            // We can iterate and log only changes, but for now let's just log verification.
            // Actually, best practice is to log each change.
            const updates = []
            if (prices.pms !== initialPrices.pms) updates.push({ type: 'pms', old: initialPrices.pms, new: prices.pms })
            if (prices.ago !== initialPrices.ago) updates.push({ type: 'ago', old: initialPrices.ago, new: prices.ago })
            if (prices.dpk !== initialPrices.dpk) updates.push({ type: 'dpk', old: initialPrices.dpk, new: prices.dpk })

            if (updates.length > 0) {
                const { data: { user } } = await supabase.auth.getUser()

                const logPromises = updates.map(update =>
                    supabase.from('price_logs').insert({
                        station_id: stationId,
                        fuel_type: update.type,
                        old_price: update.old,
                        new_price: update.new,
                        updated_by: user?.id
                    })
                )
                await Promise.all(logPromises)
            }

            toast.success('Prices updated successfully')
        } catch (error: any) {
            console.error('Error updating prices:', error)
            toast.error('Failed to update prices')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Active Price Board
                </CardTitle>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                    <History className="w-4 h-4 mr-2" />
                    View History
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    {/* PMS (Petrol) */}
                    <div className="space-y-2">
                        <Label htmlFor="pms" className="text-muted-foreground font-medium">PMS (Petrol)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                            <Input
                                id="pms"
                                type="number"
                                value={prices.pms}
                                onChange={(e) => setPrices({ ...prices, pms: Number(e.target.value) })}
                                className="pl-8 text-2xl font-bold h-14 bg-background/50 border-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* AGO (Diesel) */}
                    <div className="space-y-2">
                        <Label htmlFor="ago" className="text-muted-foreground font-medium">AGO (Diesel)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                            <Input
                                id="ago"
                                type="number"
                                value={prices.ago}
                                onChange={(e) => setPrices({ ...prices, ago: Number(e.target.value) })}
                                className="pl-8 text-2xl font-bold h-14 bg-background/50 border-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* DPK (Kerosene/Gas) */}
                    <div className="space-y-2">
                        <Label htmlFor="dpk" className="text-muted-foreground font-medium">DPK (Gas)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₦</span>
                            <Input
                                id="dpk"
                                type="number"
                                value={prices.dpk}
                                onChange={(e) => setPrices({ ...prices, dpk: Number(e.target.value) })}
                                className="pl-8 text-2xl font-bold h-14 bg-background/50 border-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        size="lg"
                        onClick={handleUpdate}
                        disabled={loading}
                        className="w-full md:w-auto font-bold text-lg px-8"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        Update All Prices
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
