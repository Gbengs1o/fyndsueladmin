'use client'

import { StationMap } from '@/components/features/StationMap'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, SlidersHorizontal, MapPin, Bell, Minus, Navigation } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function MapPage() {
    const [showSheet, setShowSheet] = useState(true)

    return (
        <div className="relative w-full h-screen bg-background pb-20 md:pb-0">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <StationMap />
            </div>

            {/* Top Search Bar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search within Ibadan"
                        className="pl-9 h-12 rounded-xl bg-card/90 backdrop-blur-sm border-none shadow-lg text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <Button size="icon" className="h-12 w-12 rounded-xl bg-card/90 backdrop-blur-sm shadow-lg hover:bg-accent text-foreground">
                    <SlidersHorizontal className="w-5 h-5" />
                </Button>
            </div>

            {/* Bottom Sheet / Card */}
            {showSheet && (
                <div className="absolute bottom-24 left-4 right-4 z-10 md:bottom-8 md:w-96 md:left-auto md:right-8">
                    <Card className="bg-card/95 backdrop-blur-md border-none shadow-2xl rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            {/* Header Image Placeholder */}
                            <div className="h-32 bg-muted relative">
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                    <MapPin className="w-8 h-8 opacity-20" />
                                </div>
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowSheet(false)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">ARCO</h3>
                                        <p className="text-sm text-muted-foreground">Monatan, Iwo Road</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="secondary" className="rounded-full w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary">
                                            <Bell className="w-5 h-5" />
                                        </Button>
                                        <Button size="icon" className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                                            <Navigation className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-background/50 rounded-xl p-3 border border-border/50">
                                        <p className="text-xs text-muted-foreground mb-1">PMS</p>
                                        <p className="text-lg font-bold text-foreground">₦ ---<span className="text-xs font-normal text-muted-foreground">/L</span></p>
                                    </div>
                                    <div className="bg-background/50 rounded-xl p-3 border border-border/50">
                                        <p className="text-xs text-muted-foreground mb-1">AGO</p>
                                        <p className="text-lg font-bold text-foreground">₦ ---<span className="text-xs font-normal text-muted-foreground">/L</span></p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
