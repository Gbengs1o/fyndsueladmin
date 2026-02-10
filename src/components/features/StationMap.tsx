'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const StationMapLeaflet = dynamic(() => import('./StationMapLeaflet'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading Map...</span>
        </div>
    ),
})

export function StationMap() {
    return <StationMapLeaflet />
}
