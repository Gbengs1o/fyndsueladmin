'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Users, BarChart3, Calendar } from 'lucide-react';

interface VisitorsDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        totalVisits: number;
        avgPerDay: number;
        growth: number; // Percentage growth vs previous period
        dailyBreakdown: { date: string, visits: number }[];
    };
}

export default function VisitorsDetailsModal({ isOpen, onClose, stats }: VisitorsDetailsModalProps) {
    if (!isOpen) return null;

    const isPositive = stats.growth >= 0;

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
                        className="absolute top-6 right-6 bg-muted/50 border-none text-foreground p-2 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl">
                                <BarChart3 size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Traffic Intelligence</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Understanding your station's physical visitor volume.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Calendar size={14} /> Weekly Growth
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPositive ? '+' : ''}{stats.growth}%
                                </div>
                                {isPositive ? <TrendingUp size={20} className="text-green-500" /> : <TrendingDown size={20} className="text-red-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">vs. previous 7 days</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Users size={14} /> Daily Average
                            </div>
                            <div className="text-3xl font-bold">{stats.avgPerDay}</div>
                            <div className="text-xs text-muted-foreground mt-1">Visitors per day</div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Daily Traffic Distribution</h3>
                    <div className="flex items-end justify-between h-[120px] gap-2 mb-8 px-2.5">
                        {stats.dailyBreakdown.map((day, i) => {
                            const max = Math.max(...stats.dailyBreakdown.map(d => d.visits), 1);
                            const height = `${(day.visits / max) * 100}%`;
                            const isLast = i === stats.dailyBreakdown.length - 1;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <div className="text-[10px] text-muted-foreground">{day.visits}</div>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height }}
                                        className="w-full rounded-sm"
                                        style={{ background: isLast ? 'hsl(var(--primary))' : '#22c55e' }}
                                    />
                                    <div className="text-[10px] font-semibold text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-green-500/5 p-6 rounded-[24px] border border-green-500/10 flex gap-4">
                        <div className="text-green-500 pt-1"><TrendingUp size={24} /></div>
                        <div>
                            <h4 className="m-0 mb-2 text-base font-semibold">Growth Insight</h4>
                            <p className="m-0 text-sm text-muted-foreground leading-relaxed">
                                Your traffic is <strong className="text-foreground">{isPositive ? 'trending upwards' : 'stabilizing'}</strong>. {isPositive ? 'Consider optimizing your pump staff during busiest days to maintain high conversion.' : 'Focus on refreshing your prices in the app to boost visitor interest.'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
