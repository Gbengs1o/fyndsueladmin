'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, ShieldAlert, BarChart3 } from 'lucide-react';

interface GlobalBusiestDayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        busiestDayLabel: string;
        peakReports: number;
    };
}

export default function GlobalBusiestDayDetailsModal({ isOpen, onClose, stats }: GlobalBusiestDayDetailsModalProps) {
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
                        className="absolute top-6 right-6 bg-muted/50 border-none text-foreground p-2 rounded-xl cursor-pointer hover:bg-muted transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-8 relative z-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl">
                                <Calendar size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Peak Engagement Analysis</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Understanding days with the highest traffic volume.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Calendar size={14} /> Highest Traffic Day
                            </div>
                            <div className="text-3xl font-bold truncate">{stats.busiestDayLabel}</div>
                            <div className="text-xs text-orange-500 mt-1">Historically consistent</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <BarChart3 size={14} /> Peak Volume
                            </div>
                            <div className="text-3xl font-bold">{stats.peakReports.toLocaleString()}</div>
                            <div className="text-xs text-primary mt-1">Maximum reports in a day</div>
                        </div>
                    </div>

                    <div className="bg-orange-500/5 p-6 rounded-[20px] border border-orange-500/10 mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="m-0 font-semibold flex items-center gap-2">
                                <ShieldAlert size={16} className="text-orange-500" />
                                Moderation Strategy
                            </h4>
                        </div>
                        <div className="text-sm text-foreground/80 space-y-4 leading-relaxed">
                            <p className="m-0">
                                Peak days often correlate with national fuel price shifts or holidays.
                                Ensure increased vigilance on <strong>{stats.busiestDayLabel}s</strong>.
                            </p>
                            <ul className="m-0 pl-5 space-y-2">
                                <li>Monitor the Moderator Dashboard closely for flagged spikes.</li>
                                <li>Review automated system logs to ensure API limits are holding up.</li>
                                <li>Be ready to issue broadcast alerts if rapid price gouging is detected.</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
