'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, TrendingUp, BarChart4, MoveUpRight, MoveDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PlatformTrafficDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        totalReports: number;
        avgPerDay: number;
        growth: number;
        dailyBreakdown: { date: string, count: number }[];
    };
}

export default function PlatformTrafficDetailsModal({ isOpen, onClose, stats }: PlatformTrafficDetailsModalProps) {
    if (!isOpen) return null;

    const isPositiveGrowth = stats.growth >= 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-[600px] bg-card rounded-[28px] border border-border p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 bg-muted/50 border-none text-foreground p-2 rounded-xl cursor-pointer hover:bg-muted transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-8 relative z-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl">
                                <Activity size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Data Traffic Deep-Dive</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Analysis of crowdsourced price reports and system engagement.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <TrendingUp size={14} /> Weekly Growth Trend
                            </div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-bold">{Math.abs(stats.growth)}%</div>
                                <div className={`flex items-center text-xs font-semibold ${isPositiveGrowth ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPositiveGrowth ? <MoveUpRight size={14} /> : <MoveDownRight size={14} />}
                                    {isPositiveGrowth ? 'Up' : 'Down'}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">vs previous week</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <BarChart4 size={14} /> Daily Average
                            </div>
                            <div className="text-3xl font-bold">{stats.avgPerDay.toLocaleString()}</div>
                            <div className="text-xs text-primary mt-1">Reports generated per day</div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Traffic Distribution (Last 7 Days)</h3>
                    <div className="h-[200px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.dailyBreakdown.slice().reverse()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.5 }}
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return d.toLocaleDateString('en-US', { weekday: 'short' });
                                    }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                    labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={32}>
                                    {stats.dailyBreakdown.slice().reverse().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" opacity={index === stats.dailyBreakdown.length - 1 ? 1 : 0.6} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-green-500/5 p-6 rounded-[20px] border border-green-500/10">
                        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                            <strong>Platform Traffic</strong> is primarily driven by crowdsourced price reports. Consistent daily volume indicates a healthy, active community relying on the platform for fuel pricing.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
