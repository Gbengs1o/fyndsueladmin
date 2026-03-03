'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, Zap, Building2, MapPin } from 'lucide-react';

interface PlatformReachDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: {
        totalUsers: number;
        newUsers30d: number;
        activeUsers: number;
        totalStations: number;
        verifiedStations: number;
        coverageBreakdown: { region: string; users: number }[];
    };
}

export default function PlatformReachDetailsModal({ isOpen, onClose, stats }: PlatformReachDetailsModalProps) {
    if (!isOpen) return null;

    const activationRate = stats.totalUsers > 0
        ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
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
                                <Users size={24} />
                            </div>
                            <h2 className="m-0 text-2xl font-bold">Platform Audience Deep-Dive</h2>
                        </div>
                        <p className="m-0 text-muted-foreground text-sm">Detailed breakdown of total user base and regional coverage.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <UserPlus size={14} /> 30-Day Growth
                            </div>
                            <div className="text-3xl font-bold">{stats.newUsers30d.toLocaleString()}</div>
                            <div className="text-xs text-green-500 mt-1">New registrations</div>
                        </div>
                        <div className="bg-white/5 p-5 rounded-2xl border border-border">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                                <Zap size={14} /> Active Accounts
                            </div>
                            <div className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</div>
                            <div className="text-xs text-primary mt-1">Interacted recently</div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Network Coverage</h3>
                    <div className="flex flex-col gap-4 mb-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2.5 text-sm text-foreground">
                                    <div className="text-muted-foreground"><Building2 size={16} /></div>
                                    <span>Total Mapped Stations</span>
                                </div>
                                <span className="font-semibold text-sm">{stats.totalStations.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 mt-4">
                                <div className="flex items-center gap-2.5 text-sm text-foreground">
                                    <div className="text-emerald-500"><Building2 size={16} /></div>
                                    <span>Manager Assigned Stations</span>
                                </div>
                                <span className="font-semibold text-sm">{stats.verifiedStations.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-base font-semibold mb-5 opacity-80">Top Regional User Clusters</h3>
                    <div className="flex flex-col gap-4 mb-8">
                        {stats.coverageBreakdown.map((r, i) => {
                            const max = stats.coverageBreakdown[0]?.users || 1;
                            const percentage = (r.users / max) * 100;
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                                            <div className="text-purple-500"><MapPin size={16} /></div>
                                            <span>{r.region}</span>
                                        </div>
                                        <span className="font-semibold text-sm">{r.users.toLocaleString()} users</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            className="h-full rounded-full"
                                            style={{ background: 'hsl(var(--primary))' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-purple-500/5 p-6 rounded-[20px] border border-purple-500/10">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-foreground">Global Activation Rate</span>
                            <span className="text-xl font-bold text-primary">{activationRate}%</span>
                        </div>
                        <p className="m-0 text-sm text-muted-foreground leading-relaxed">
                            <strong>{activationRate}%</strong> of your entire userbase has actively contributed data or interacted with the platform recently. Target local gamification campaigns in underperforming regions.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
