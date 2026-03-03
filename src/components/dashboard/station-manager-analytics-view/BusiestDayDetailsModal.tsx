'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Sun, Moon, Zap, Lightbulb, Coffee } from 'lucide-react';

interface BusiestDayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        busiestDay: string;
        peakVisits: number;
        peakHour: string; // e.g., "08:00 AM"
        distribution: { period: string, volume: number }[]; // Morning, Afternoon, Evening
    };
}

export default function BusiestDayDetailsModal({ isOpen, onClose, stats }: BusiestDayDetailsModalProps) {
    if (!isOpen) return null;

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
                            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Peak Demand Analysis</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Operational insights for your busiest windows.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Zap size={14} /> Peak Hour
                            </div>
                            <div className="text-3xl font-bold text-foreground">{stats.peakHour}</div>
                            <div className="text-xs text-muted-foreground mt-1">Highest traffic intensity</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Coffee size={14} /> Peak Volume
                            </div>
                            <div className="text-3xl font-bold text-foreground">{stats.peakVisits}</div>
                            <div className="text-xs text-muted-foreground mt-1">Visitors on {stats.busiestDay}</div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Time of Day Distribution</h3>
                    <div className="flex flex-col gap-4 mb-8">
                        {stats.distribution.map((item, i) => {
                            const max = Math.max(...stats.distribution.map(d => d.volume), 1);
                            const width = `${(item.volume / max) * 100}%`;
                            const icons = [<Sun size={16} key="m" />, <Sun size={16} color="#f97316" key="a" />, <Moon size={16} key="e" />];
                            const labels = ["Morning (06:00 - 12:00)", "Afternoon (12:00 - 18:00)", "Evening (18:00 - 00:00)"];

                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                            {icons[i]}
                                            <span>{labels[i]}</span>
                                        </div>
                                        <span className="font-semibold text-sm">{item.volume} visits</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width }}
                                            className="h-full"
                                            style={{ background: i === 1 ? '#f97316' : 'hsl(var(--muted-foreground))', opacity: 0.8 }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-orange-500/5 p-6 rounded-[24px] border border-orange-500/10 flex gap-4">
                        <div className="text-orange-500 pt-1"><Lightbulb size={24} /></div>
                        <div>
                            <h4 className="m-0 mb-2 text-base font-semibold">Operational Strategy</h4>
                            <p className="m-0 text-sm text-muted-foreground leading-relaxed">
                                Your station peaks during <strong className="text-foreground">{stats.peakHour.includes('AM') ? 'morning commutes' : 'evening rushes'}</strong>. Ensuring all pumps are active and staff is fully deployed between <strong className="text-foreground">{stats.peakHour}</strong> can reduce wait times and improve your conversion efficiency.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
