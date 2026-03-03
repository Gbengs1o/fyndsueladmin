'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, Heart, Zap, MousePointer2, PieChart } from 'lucide-react';

interface ReachDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        totalReach: number;
        uniqueDrivers: number;
        newcomers: number;
        breakdown: {
            views: number;
            reports: number;
            favorites: number;
            reviews: number;
        };
    };
}

export default function ReachDetailsModal({ isOpen, onClose, stats }: ReachDetailsModalProps) {
    if (!isOpen) return null;

    const loyaltyRate = stats.uniqueDrivers > 0
        ? Math.round(((stats.totalReach - stats.breakdown.views) / stats.uniqueDrivers) * 10) / 10
        : 0;

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
                            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                                <PieChart size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Community Deep-Dive</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Detailed breakdown of driver interaction patterns over the last 7 days.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Users size={14} /> Unique Drivers
                            </div>
                            <div className="text-3xl font-bold">{stats.uniqueDrivers}</div>
                            <div className="text-xs text-green-500 mt-1">Verified individuals</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <UserPlus size={14} /> New Commuters
                            </div>
                            <div className="text-3xl font-bold">{stats.newcomers}</div>
                            <div className="text-xs text-primary mt-1">First time this week</div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Interaction Component Analysis</h3>
                    <div className="flex flex-col gap-4 mb-8">
                        <BreakdownRow
                            label="App Profile Views"
                            count={stats.breakdown.views}
                            total={stats.totalReach}
                            icon={<MousePointer2 size={16} />}
                            color="hsl(var(--muted-foreground))"
                        />
                        <BreakdownRow
                            label="Driver Price Reports"
                            count={stats.breakdown.reports}
                            total={stats.totalReach}
                            icon={<Zap size={16} />}
                            color="#f97316"
                        />
                        <BreakdownRow
                            label="Station Favorites"
                            count={stats.breakdown.favorites}
                            total={stats.totalReach}
                            icon={<Heart size={16} />}
                            color="#ef4444"
                        />
                        <BreakdownRow
                            label="User Feedback/Reviews"
                            count={stats.breakdown.reviews}
                            total={stats.totalReach}
                            icon={<Users size={16} />}
                            color="#a855f7"
                        />
                    </div>

                    <div className="bg-purple-500/5 p-6 rounded-[20px] border border-purple-500/10">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-foreground">Driver Loyalty Ratio</span>
                            <span className="text-xl font-bold text-primary">{loyaltyRate}x</span>
                        </div>
                        <p className="m-0 text-sm text-muted-foreground leading-relaxed">
                            On average, each verified driver interacts with your station <strong>{loyaltyRate} times</strong> per week. This indicates strong repeat visits and trust in your price reporting.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function BreakdownRow({ label, count, total, icon, color }: any) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2.5 text-sm text-foreground">
                    <div style={{ color }}>{icon}</div>
                    <span>{label}</span>
                </div>
                <span className="font-semibold text-sm">{count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full rounded-full"
                    style={{ background: color || 'hsl(var(--primary))' }}
                />
            </div>
        </div>
    );
}
