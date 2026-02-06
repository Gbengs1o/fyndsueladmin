'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, User, Shield, Loader2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [station, setStation] = useState<any>(null)

    const [toggles, setToggles] = useState({
        flashSale: false,
        outOfStock: false
    })

    useEffect(() => {
        async function fetchSettings() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase
                .from('manager_profiles')
                .select('*, stations(*)')
                .eq('id', user.id)
                .single()

            if (profileData) {
                setProfile(profileData)
                setStation(profileData.stations)
                setToggles({
                    flashSale: false, // Default as we don't have a column yet
                    outOfStock: !profileData.stations?.is_active
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    const handleToggle = async (key: 'flashSale' | 'outOfStock', value: boolean) => {
        setUpdating(true)
        try {
            if (key === 'outOfStock') {
                // Map "Out of Stock" UI to "is_active" database column
                // If Out of Stock is ON, is_active is FALSE
                const { error } = await supabase
                    .from('stations')
                    .update({ is_active: !value })
                    .eq('id', station.id)

                if (error) throw error
            }

            setToggles(prev => ({ ...prev, [key]: value }))
            alert(`${key === 'flashSale' ? 'Flash Sale' : 'Out of Fuel'} status updated!`)
        } catch (error: any) {
            alert(error.message || 'Failed to update status')
        } finally {
            setUpdating(false)
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
                <h1 className="text-3xl font-bold text-foreground">Station Settings</h1>
                <p className="text-muted-foreground">Manage your station&apos;s visibility and status.</p>
            </div>

            {/* Promotional Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-border border-l-4 border-l-primary">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <CardTitle className="text-card-foreground">Flash Sale</CardTitle>
                        </div>
                        <CardDescription className="text-muted-foreground">
                            Highlight your station on the map for 24 hours to drive more traffic.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">Enable Flash Sale</span>
                        <Switch
                            checked={toggles.flashSale}
                            onCheckedChange={(val) => handleToggle('flashSale', val)}
                            disabled={updating}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-card border-border border-l-4 border-l-destructive">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <CardTitle className="text-card-foreground">Out of Fuel</CardTitle>
                        </div>
                        <CardDescription className="text-muted-foreground">
                            Instantly mark your station as out of stock to protect your reputation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">Mark as Out of Fuel</span>
                        <Switch
                            checked={toggles.outOfStock}
                            onCheckedChange={(val) => handleToggle('outOfStock', val)}
                            disabled={updating}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Profile & Account */}
            <h3 className="text-xl font-bold text-foreground mb-4">Account Information</h3>
            <div className="space-y-4">
                <Card className="bg-card border-border">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl border border-border">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Full Name</p>
                                <p className="font-bold text-foreground">{profile?.full_name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl border border-border">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                                <Shield className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Verification Status</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground uppercase">{profile?.verification_status}</span>
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    variant="destructive"
                    className="w-full py-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
                >
                    <LogOut className="w-5 h-5" />
                    Log Out
                </Button>
            </div>
        </div>
    )
}
