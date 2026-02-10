'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Bell, Minus, MapPin, Fuel } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Header } from '@/components/layout/Header' // Reuse header if appropriate, or simplified version

export default function SavedPage() {
    // Mock data for tracked stations
    const trackedStations = [
        { id: 1, name: "ARCO", location: "Monatan, Iwo Road", status: "Active", type: "PMS" },
        { id: 2, name: "Bravo", location: "Iwo Road", status: "Out of Stock", type: "AGO" },
    ]

    return (
        <div className="min-h-screen bg-background pb-32 pt- safe-top">
            <div className="px-4 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">Track Activities</h1>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tracked stations..."
                        className="pl-9 h-12 rounded-xl bg-card border-border/50 shadow-sm text-foreground placeholder:text-muted-foreground"
                    />
                </div>

                {/* List */}
                <div className="space-y-4">
                    {trackedStations.map((station) => (
                        <Card key={station.id} className="bg-card border-border/50 shadow-sm overflow-hidden group">
                            <CardContent className="p-0 flex items-center">
                                {/* Left Icon/Avatar */}
                                <div className="w-16 h-20 bg-muted/30 flex items-center justify-center border-r border-border/50">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Fuel className="w-5 h-5 text-primary" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-4 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-foreground truncate">{station.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${station.status === 'Active'
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : 'bg-destructive/10 text-destructive'
                                            }`}>
                                            {station.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {station.location}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 pr-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                                        <Bell className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
