'use client'

import { Bell, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar' // Assuming shadcn Avatar exists or needs to be mocked
import { Button } from '@/components/ui/button'

interface HeaderProps {
    user?: {
        full_name?: string
        avatar_url?: string
    }
}

export function Header({ user }: HeaderProps) {
    const [greeting, setGreeting] = useState('')
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Fallback to avoid hydration mismatch
    if (!mounted) {
        return null
    }

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    return (
        <header className="px-4 py-4 pt-10 flex items-center justify-between bg-background sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-primary to-purple-400">
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center overflow-hidden border-2 border-background">
                        {/* Fallback to initial if no avatar */}
                        <span className="font-bold text-lg text-primary">{user?.full_name?.[0] || 'U'}</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{greeting},</p>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                        {user?.full_name?.split(' ')[0] || 'User'}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted" onClick={toggleTheme}>
                    {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background"></span>
                </Button>
            </div>
        </header>
    )
}
