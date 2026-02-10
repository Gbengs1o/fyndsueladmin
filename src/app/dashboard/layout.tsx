'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Home, BarChart2, MessageSquare, Settings, LogOut, Fuel, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BottomNav } from '@/components/layout/BottomNav'
import { Logo } from '@/components/icons/Logo'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'

function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="w-9 h-5 bg-muted rounded-full" />

    return (
        <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
    )
}



// ... existing imports

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [profile, setProfile] = useState<any>(null)
    const [station, setStation] = useState<any>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        async function checkUser() {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError || !user) {
                    console.log('No user or auth error, redirecting to login', authError)
                    router.push('/auth/login')
                    return
                }

                // Fetch Manager Profile
                const { data: profileData, error } = await supabase
                    .from('manager_profiles')
                    .select('id, full_name, verification_status, station_id, stations(name, address, state)')
                    .eq('id', user.id)
                    .single()

                if (error) {
                    console.error('Error fetching profile:', error)
                    // If no profile found (PGRST116), redirect to registration
                    if (error.code === 'PGRST116') {
                        router.push('/auth/register-station')
                        return
                    }
                    // For other errors, maybe we should still allow access or redirect?
                    // Let's redirect to login to be safe for now, or just stop loading to show error.
                    // But if we stop loading with no profile, the screen will be blank or error.
                    // Let's force redirect to login on critical error.
                    router.push('/auth/login')
                    return
                }

                if (!profileData) {
                    router.push('/auth/register-station')
                    return
                }

                // Profile Logic
                setProfile(profileData)

                // If station is assigned, set it.
                if (profileData.station_id) {
                    // Logic to handle station data if needed in layout context
                    // For now, we just pass profile down or use it for sidebar context if we had it.
                }

            } catch (err) {
                console.error('Unexpected error in layout:', err)
                router.push('/auth/login')
            }
        }

        checkUser()
    }, [router])

    if (!profile) {
        // Allow pending approval page to render even without full profile if beneficial, 
        // but currently we rely on profile to know status.
        // Actually, pending approval page fetches its own status too.
        // But layout blocks everything.

        // If we are on pending-approval, maybe we should let it through? 
        // But we need to know if they are even a user.
        // The checkUser above handles redirects. 

        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                <p className="text-muted-foreground text-sm animate-pulse">Loading Dashboard...</p>
                <button
                    onClick={() => router.push('/auth/login')}
                    className="text-xs text-primary hover:underline mt-4"
                >
                    Stuck? Click to Login
                </button>
            </div>
        )
    }

    const navItems = [
        { name: 'Prices', href: '/dashboard', icon: Fuel },
        { name: 'Insights', href: '/dashboard/insights', icon: BarChart2 },
        { name: 'Reports', href: '/dashboard/reports', icon: MessageSquare },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    if (!profile) {
        // ... existing loading state
        if (pathname === '/dashboard/pending-approval') {
            return <div className="min-h-screen bg-background">{children}</div>
        }

        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0 transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
            {/* Sidebar - Desktop Only */}
            <aside
                className={`hidden md:flex flex-col bg-card border-r border-border fixed h-full left-0 top-0 z-30 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                <div className={`p-4 ${isCollapsed ? 'flex justify-center' : 'p-6'}`}>
                    <div className={`flex items-center gap-3 mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
                        <Logo className="w-10 h-10 text-primary flex-shrink-0" />
                        {!isCollapsed && <span className="font-bold text-xl tracking-tight transition-opacity duration-300">FyndFuel</span>}
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    pathname === item.href
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-12 bg-card border border-border rounded-full p-1 shadow-md hover:bg-accent text-muted-foreground hover:text-primary z-50 hidden md:flex"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className="mt-auto p-4 border-t border-border/50 space-y-2">
                    <div className={`bg-muted/50 rounded-lg p-3 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
                        {!isCollapsed && (
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Moon className="w-4 h-4" />
                                Dark Mode
                            </span>
                        )}
                        {isCollapsed && <Moon className="w-4 h-4 text-muted-foreground mb-1" />}
                        <ThemeToggle />
                    </div>

                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
                        className={cn(
                            "flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors w-full px-4 py-2 hover:bg-destructive/10 rounded-lg",
                            isCollapsed && "justify-center"
                        )}
                        title={isCollapsed ? "Sign Out" : undefined}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>


            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col min-h-screen relative transition-all duration-300">
                {children}
            </main>

            {/* Bottom Nav - Mobile Only */}
            <BottomNav />
        </div>
    )
}
