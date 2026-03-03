'use client';

import { motion } from 'framer-motion';
import { Activity, AlertTriangle } from 'lucide-react';
import styles from './ManagerOverview.module.css';

interface SmartRecommendationsProps {
    priceDiff: number;
    activePromotion: any;
    isOutOfStock: boolean;
    peakHourLabel: string;
}

export default function SmartRecommendations({
    priceDiff,
    activePromotion,
    isOutOfStock,
    peakHourLabel
}: SmartRecommendationsProps) {
    const itemVars = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className={styles.recentReports} style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            boxShadow: 'none'
        }}>
            <div className={styles.sectionHeader} style={{ marginBottom: '20px' }}>
                <motion.h2
                    animate={{
                        color: priceDiff > 0 ? ['#fbbf24', '#fff'] : '#fff'
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <Activity size={20} className={styles.pulseIcon} />
                    Smart Recommendations
                </motion.h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 3. STATUS */}
                <motion.div
                    variants={itemVars}
                    className="flex items-center gap-3 p-4 rounded-2xl border"
                    style={{
                        background: isOutOfStock ? 'rgba(239, 68, 68, 0.05)' : 'hsl(var(--card))',
                        borderColor: isOutOfStock ? 'rgba(239, 68, 68, 0.2)' : 'hsl(var(--border))'
                    }}
                >
                    {isOutOfStock ? (
                        <AlertTriangle size={18} color="#ef4444" />
                    ) : (
                        <Activity size={18} color="#22c55e" />
                    )}
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground">Status</div>
                        <div className={`text-sm font-bold ${isOutOfStock ? 'text-red-500' : 'text-foreground'}`}>
                            {isOutOfStock ? 'Offline' : 'Live on Map'}
                        </div>
                    </div>
                </motion.div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .pulseIcon {
                    animation: pulse 2s infinite ease-in-out;
                    color: var(--primary);
                }
            `}</style>
        </div>
    );
}
