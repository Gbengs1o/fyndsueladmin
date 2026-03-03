'use client';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformEngagementChartProps {
    data: {
        date: string;
        reports: number;
        users: number;
    }[];
}

export default function PlatformEngagementChart({ data }: PlatformEngagementChartProps) {
    const [hoveredData, setHoveredData] = useState<any | null>(null);

    // Filter to last 14 days if too large, or display all
    const displayData = data.slice(-14);

    return (
        <div className="w-full h-full relative font-sans flex flex-col">
            <div className="flex-1 min-h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={displayData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        onMouseMove={(e) => {
                            if (e.activePayload) setHoveredData(e.activePayload[0].payload);
                        }}
                        onMouseLeave={() => setHoveredData(null)}
                    >
                        <defs>
                            <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                            }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />

                        <Area
                            type="monotone"
                            dataKey="reports"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorReports)"
                            activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="users"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorUsers)"
                            activeDot={{ r: 4, fill: '#10b981', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Interactive Stats Panel */}
            <AnimatePresence>
                {hoveredData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-0 right-0 bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-xl p-3 flex gap-4 pointer-events-none"
                    >
                        <div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Date</span>
                            <span className="text-sm font-semibold">{new Date(hoveredData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-primary uppercase tracking-wider block mb-0.5">Reports</span>
                            <span className="text-sm font-bold">{hoveredData.reports}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-emerald-500 uppercase tracking-wider block mb-0.5">New Users</span>
                            <span className="text-sm font-bold">{hoveredData.users}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card border border-border p-3 rounded-xl shadow-xl">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm text-foreground capitalize">{entry.name}:</span>
                        <span className="text-sm font-bold ml-auto">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};
