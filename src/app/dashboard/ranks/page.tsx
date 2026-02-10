'use client'

import { LeaderboardList } from '@/components/features/LeaderboardList'

export default function RanksPage() {
    return (
        <div className="min-h-screen bg-background pb-32 pt-10 px-4 space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-muted-foreground">Top contributors in your area.</p>

            <LeaderboardList />
        </div>
    )
}
