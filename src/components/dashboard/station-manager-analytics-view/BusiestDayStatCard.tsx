'use client';

import React, { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import BusiestDayDetailsModal from './BusiestDayDetailsModal';

interface BusiestDayStatCardProps {
    busiestDayLabel: string;
    peakVisits: number;
    peakHour: string;
    distribution: { period: string, volume: number }[];
}

export default function BusiestDayStatCard({ busiestDayLabel, peakVisits, peakHour, distribution }: BusiestDayStatCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <motion.div
                whileHover={{ scale: 1.02, translateY: -5 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer min-w-[240px] flex-1"
                onClick={() => setIsModalOpen(true)}
            >
                {/* Subtle Peak Glow */}
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(249,115,22,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6 z-10">
                    <Clock size={20} />
                </div>

                <div className="flex justify-between items-start z-10 w-full">
                    <h3 className="text-sm font-semibold text-muted-foreground m-0">Busiest Day</h3>
                    <ChevronRight size={14} className="opacity-30" />
                </div>

                <p className="text-2xl font-bold m-0 my-2 z-10 text-foreground">{busiestDayLabel}</p>

                <div className="flex justify-between items-center mt-1 z-10 w-full">
                    <span className="text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                        {peakVisits.toLocaleString()} visitors
                    </span>
                    <span className="text-[0.7rem] opacity-40 italic">Operational Advice</span>
                </div>
            </motion.div>

            <BusiestDayDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                stats={{
                    busiestDay: busiestDayLabel,
                    peakVisits,
                    peakHour,
                    distribution
                }}
            />
        </>
    );
}
