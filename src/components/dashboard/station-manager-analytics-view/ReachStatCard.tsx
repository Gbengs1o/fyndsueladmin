'use client';

import React, { useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import ReachDetailsModal from './ReachDetailsModal';
import { motion } from 'framer-motion';

interface ReachStatCardProps {
    communityReach: number;
    totalFavourites: number;
    details: {
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

export default function ReachStatCard({ communityReach, totalFavourites, details }: ReachStatCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <motion.div
                whileHover={{ scale: 1.02, translateY: -5 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer min-w-[240px] flex-1"
                onClick={() => setIsModalOpen(true)}
            >
                {/* Glow Effect on Hover */}
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(168,85,247,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6 z-10">
                    <Users size={20} />
                </div>

                <div className="flex justify-between items-start z-10 w-full">
                    <h3 className="text-sm font-semibold text-muted-foreground m-0">Community Reach</h3>
                    <ChevronRight size={14} className="opacity-30" />
                </div>

                <p className="text-3xl font-bold m-0 my-2 z-10 text-foreground">
                    {communityReach >= 1000 ? `${(communityReach / 1000).toFixed(1)}k` : communityReach.toLocaleString()}
                </p>

                <div className="flex justify-between items-center mt-1 z-10 w-full">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {totalFavourites} driver favorites
                    </span>
                    <span className="text-[0.7rem] opacity-40 italic">Click for deep-dive</span>
                </div>
            </motion.div>

            <ReachDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                stats={{
                    totalReach: communityReach,
                    ...details
                }}
            />
        </>
    );
}
