"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PerformanceData {
    date: string
    trustScore: number
    reports: number
}

interface ManagerAnalyticsChartsProps {
    data: PerformanceData[]
}

export function ManagerAnalyticsCharts({ data }: ManagerAnalyticsChartsProps) {
    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground italic bg-muted/10 rounded-xl border-2 border-dashed">
                No historical analytics data available for this period.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-none bg-muted/5">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Trust Score Trend</CardTitle>
                    <CardDescription>Manager's report reliability over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10 }}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="trustScore"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Trust Score (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-muted/5">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Reporting Volume</CardTitle>
                    <CardDescription>Daily price updates submitted</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10 }}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar
                                dataKey="reports"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                                name="Reports"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.reports > 5 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.2)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
