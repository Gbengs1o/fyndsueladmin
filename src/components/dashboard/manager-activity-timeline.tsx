"use client"

import { formatDistanceToNow } from "date-fns"
import {
    Activity,
    Zap,
    MessageSquare,
    Star,
    CheckCircle2,
    AlertTriangle,
    Clock,
    User,
    ArrowUpCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ActivityEvent {
    id: string | number
    type: 'price_update' | 'review_response' | 'points_earned' | 'verification' | 'assignment' | 'ban' | 'unban'
    title: string
    description: string
    timestamp: string
    metadata?: any
}

interface ManagerActivityTimelineProps {
    activities: ActivityEvent[]
}

export function ManagerActivityTimeline({ activities }: ManagerActivityTimelineProps) {
    const getIcon = (type: ActivityEvent['type']) => {
        switch (type) {
            case 'price_update':
                return <Zap className="h-4 w-4 text-amber-500" />
            case 'review_response':
                return <MessageSquare className="h-4 w-4 text-blue-500" />
            case 'points_earned':
                return <Star className="h-4 w-4 text-emerald-500" />
            case 'verification':
                return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            case 'assignment':
                return <ArrowUpCircle className="h-4 w-4 text-purple-500" />
            case 'ban':
                return <AlertTriangle className="h-4 w-4 text-red-500" />
            case 'unban':
                return <CheckCircle2 className="h-4 w-4 text-blue-600" />
            default:
                return <Activity className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getBadge = (type: ActivityEvent['type']) => {
        switch (type) {
            case 'price_update':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Price</Badge>
            case 'review_response':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Response</Badge>
            case 'points_earned':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Points</Badge>
            default:
                return <Badge variant="outline">System</Badge>
        }
    }

    if (!activities.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground italic">No recent activity recorded for this manager.</p>
            </div>
        )
    }

    return (
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-muted-foreground/10">
            {activities.map((item, idx) => (
                <div key={item.id} className="relative flex items-start gap-6 group">
                    <div className="flex-none flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-sm z-10 group-hover:scale-110 transition-transform">
                        {getIcon(item.type)}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 pt-1.5 text-left">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">{item.title}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(item.timestamp))} ago
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.description}
                        </p>
                        <div className="mt-2">
                            {getBadge(item.type)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
