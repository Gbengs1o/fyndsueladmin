'use client'

import { useState, useEffect } from 'react'
import { useTheme } from "next-themes"
import { supabase } from '@/lib/supabase'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ChevronRight, Moon, User, Lock, Bell, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

export default function SettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        async function fetchSettings() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profileData } = await supabase
                .from('manager_profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileData) {
                setProfile(profileData)
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    return (
        <div className="min-h-screen bg-background pb-32 pt-10 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            </div>

            {/* Profile Card */}
            <Card className="bg-card border-border/50 shadow-sm hover:bg-accent/50 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-400 p-[2px]">
                            <Avatar className="w-full h-full border-2 border-background">
                                <AvatarFallback className="bg-card text-primary font-bold text-xl">
                                    {profile?.full_name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="text-xl font-bold text-foreground truncate">{profile?.full_name || 'User'}</h2>
                        <p className="text-sm text-muted-foreground truncate">{profile?.email || 'email@example.com'}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
            </Card>

            {/* Appearance Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Appearance</h3>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Moon className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="font-medium text-foreground">Dark Mode</span>
                        </div>
                        {mounted && (
                            <Switch
                                checked={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Account</h3>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
                    <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <User className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="font-medium text-foreground">Edit Profile</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            {/* Mocking the android icon in the screenshot */}
                            <ChevronRight className="w-5 h-5 text-emerald-500" />
                        </div>
                    </button>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="font-medium text-foreground">Change Password</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* App Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">App</h3>
                <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                    <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-foreground" />
                            </div>
                            <span className="font-medium text-foreground">Notifications</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <Button
                variant="destructive"
                className="w-full py-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-8"
                onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            >
                <LogOut className="w-5 h-5" />
                Log Out
            </Button>
        </div>
    )
}
