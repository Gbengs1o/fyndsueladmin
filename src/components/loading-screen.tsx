"use client"

import React from "react"
import { LoadingLogo } from "./loading-logo"

export function LoadingScreen() {
    return (
        <div className="fixed inset-0 min-h-screen bg-background flex items-center justify-center z-[9999]">
            <div className="flex flex-col items-center gap-6">
                <LoadingLogo size={140} />
                <p className="text-muted-foreground animate-pulse font-medium tracking-wide">
                    Initializing FYND FUEL...
                </p>
            </div>
        </div>
    )
}
