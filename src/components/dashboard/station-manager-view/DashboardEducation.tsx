'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, Target, TrendingUp, BarChart2, Users, Zap } from 'lucide-react';

export default function DashboardEducation() {
    const [isExpanded, setIsExpanded] = useState(false);

    const metrics = [
        {
            title: 'Trust Score',
            icon: <Target size={18} />,
            color: '#3b82f6',
            description: 'A 0-100% reputation metric weighted by: **40% Meter Accuracy** (based on price reports), **40% User Reviews**, and **20% Verification Status**.'
        },
        {
            title: 'Market Average',
            icon: <TrendingUp size={18} />,
            color: '#fbbf24',
            description: 'Real-time average of your **3 nearest competitors**. If neighbors haven\'t updated prices, we fallback to the **Official State Price** to keep insights accurate.'
        },
        {
            title: 'Revenue Projections',
            icon: <BarChart2 size={18} />,
            color: '#a855f7',
            description: 'Estimated earnings based on local pump prices multiplied by your **Weighted Visit Index** (a mix of loyalty and new driver discovery).'
        },
        {
            title: 'Daily Customers',
            icon: <Users size={18} />,
            color: '#22c55e',
            description: 'The number of unique drivers who engaged with your station in the FyndFuel app (views, navigation requests, or check-ins) in the last 24 hours.'
        }
    ];

    const parseDescription = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div
            className="bg-card border border-border/50 rounded-2xl mb-6 backdrop-blur-xl w-full relative z-10 overflow-hidden transition-colors duration-300 self-start shadow-sm"
        >
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                whileTap={{ scale: 0.995 }}
                className="w-full bg-transparent border-none p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer text-foreground outline-none text-left gap-4"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="bg-primary/10 text-primary p-3 rounded-2xl flex items-center justify-center shadow-sm">
                        <Info size={24} />
                    </div>
                    <div>
                        <h3 className="m-0 text-[1.1rem] font-bold tracking-tight text-foreground">Understanding Your Data</h3>
                        <p className="m-0 mt-1 text-[0.85rem] text-muted-foreground font-medium">
                            Learn how we calculate your station&apos;s performance metrics.
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.span
                        animate={{ opacity: isExpanded ? 0.6 : 1 }}
                        className="text-xs font-bold text-muted-foreground tracking-wider"
                    >
                        {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                    </motion.span>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="p-1.5 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground"
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </div>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                {metrics.map((metric, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        whileHover={{ translateY: -4 }}
                                        className="bg-muted/30 border border-border/50 p-6 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:bg-muted/50"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{
                                                color: metric.color,
                                                background: `${metric.color}15`,
                                                padding: '10px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {metric.icon}
                                            </div>
                                            <strong className="text-base text-foreground font-bold">{metric.title}</strong>
                                        </div>
                                        <p className="m-0 text-[0.9rem] text-muted-foreground leading-relaxed">
                                            {parseDescription(metric.description)}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="p-5 bg-primary/5 border border-dashed border-primary/30 rounded-2xl flex gap-4 items-center"
                            >
                                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                                    <Zap size={20} />
                                </div>
                                <p className="m-0 text-[0.9rem] text-foreground/80 leading-relaxed">
                                    <strong className="text-foreground">Pro Tip:</strong> Price updates daily increase accuracy by up to <span className="text-emerald-500 font-black">35%</span>. Keeping your data fresh builds driver trust instantly.
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
