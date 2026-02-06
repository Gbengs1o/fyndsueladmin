'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Home, BarChart2, MessageSquare, Settings, LogOut, Fuel } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [profile, setProfile] = useState<any>(null)
    const [station, setStation] = useState<any>(null)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: profileData } = await supabase
                .from('manager_profiles')
                .select('*, stations(*)')
                .eq('id', user.id)
                .single()

            if (!profileData) {
                router.push('/auth/signup')
                return
            }

            if (profileData.verification_status !== 'verified') {
                router.push('/auth/verify')
                return
            }

            setProfile(profileData)
            setStation(profileData.stations)
        }
        fetchData()
    }, [router])

    const navItems = [
        { name: 'Prices', href: '/dashboard', icon: Fuel },
        { name: 'Insights', href: '/dashboard/insights', icon: BarChart2 },
        { name: 'Reports', href: '/dashboard/reports', icon: MessageSquare },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    if (!profile) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0 md:pl-64">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full left-0 top-0">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        {/* Logo here, using the new SVG if possible, or just text with primary color */}
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground">F</div>
                        <span className="font-bold text-xl">FyndFuel</span>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                    pathname === item.href
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-border">
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
                        className="flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors w-full px-4"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Header - Mobile & Shared */}
            <header className="p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div>
                    <h2 className="font-bold text-lg leading-tight truncate max-w-[200px]">
                        {station?.name || 'My Station'}
                    </h2>
                    <p className="text-xs text-muted-foreground">{station?.state || 'Manager Dashboard'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                            {profile.full_name?.charAt(0)}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
                {children}
            </main>

            {/* Bottom Nav - Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center p-2 pb-6 z-20">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 min-w-[64px]",
                            pathname === item.href ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                ))}
            </nav>
        </div>
    )
}
