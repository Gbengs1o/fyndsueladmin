'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, MapPin, Settings, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Saved', href: '/dashboard/saved', icon: Heart },
        { name: 'Find Gas', href: '/dashboard/map', icon: MapPin, isFab: true },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        { name: 'Ranks', href: '/dashboard/ranks', icon: Trophy },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-end pb-4 pt-2 z-50 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {navItems.map((item) => {
                const isActive = pathname === item.href

                if (item.isFab) {
                    return (
                        <div key={item.name} className="relative -top-5">
                            <Link
                                href={item.href}
                                className="flex flex-col items-center justify-center"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center border-4 border-background transform transition-transform active:scale-95">
                                    <item.icon className="w-6 h-6 text-primary-foreground" />
                                </div>
                                <span className="text-[10px] font-medium text-primary mt-1">{item.name}</span>
                            </Link>
                        </div>
                    )
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                )
            })}
        </nav>
    )
}
