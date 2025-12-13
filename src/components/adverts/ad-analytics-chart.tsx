"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AdAnalyticsChartProps {
    data: {
        name: string
        clicks: number
        impressions: number
    }[]
}

export function AdAnalyticsChart({ data }: AdAnalyticsChartProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Ad Performance</CardTitle>
                <CardDescription>
                    Clicks vs Impressions for active campaigns
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar
                            dataKey="impressions"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary/20"
                            name="Impressions"
                        />
                        <Bar
                            dataKey="clicks"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                            name="Clicks"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
