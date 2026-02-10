'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function LeaderboardList() {
    // Mock Data for "All Ranks"
    const topUsers = [
        { id: 1, name: "David O.", rank: 1, points: 1250, initial: "D", color: "bg-orange-500", reports: 45 },
        { id: 2, name: "Sarah M.", rank: 2, points: 980, initial: "S", color: "bg-blue-500", reports: 38 },
        { id: 3, name: "James L.", rank: 3, points: 850, initial: "J", color: "bg-green-500", reports: 32 },
        { id: 4, name: "Anita R.", rank: 4, points: 720, initial: "A", color: "bg-purple-500", reports: 29 },
        { id: 5, name: "Michael K.", rank: 5, points: 690, initial: "M", color: "bg-red-500", reports: 25 },
        { id: 6, name: "User 123", rank: 6, points: 500, initial: "U", color: "bg-gray-500", reports: 15 },
    ]

    return (
        <div className="space-y-4">
            {topUsers.map((user) => (
                <Card key={user.id} className="bg-card border-none shadow-sm hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center p-4 gap-4">
                        <span className="font-bold text-muted-foreground w-4 text-center">{user.rank}</span>
                        <Avatar className={`h-10 w-10 ${user.color} border-none`}>
                            <AvatarFallback className={`${user.color} text-white font-bold`}>{user.initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-bold text-foreground text-sm">{user.name}</p>
                        </div>
                        <span className="text-xs font-bold text-purple-400">{user.reports} reports</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
