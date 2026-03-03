'use client';

import { MapPin, ArrowRight, Fuel } from 'lucide-react';
import Link from 'next/link';
import styles from './ManagerOverview.module.css';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Competitor {
    id: number;
    name: string;
    brand: string;
    price_pms: number;
    distance: string;
}

interface CompetitorWatchProps {
    competitors: Competitor[];
    yourPrice: number;
}

export default function CompetitorWatch({ competitors, yourPrice }: CompetitorWatchProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    return (
        <div className={styles.chartArea} style={{ border: '2px solid rgba(168, 85, 247, 0.2)', background: 'rgba(168, 85, 247, 0.05)', position: 'relative' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={styles.promoIcon} style={{ background: 'var(--primary)', width: '32px', height: '32px' }}>
                        <Fuel size={16} />
                    </div>
                    <h2 style={{ fontSize: '1.1rem' }}>Competitor Watch</h2>
                </div>
                <p style={{ fontSize: '0.85rem' }}>Prices of the 3 nearest stations.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {competitors.map((comp) => {
                    const priceDiff = comp.price_pms - yourPrice;
                    const isLower = priceDiff < 0;

                    return (
                        <div
                            key={comp.id}
                            onMouseEnter={() => setHoveredId(comp.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={styles.competitorCard}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--card-bg)',
                                borderLeft: isLower ? '3px solid #ef4444' : '3px solid #22c55e',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{comp.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={10} /> {comp.distance}
                                </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>₦{comp.price_pms}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isLower ? '#ef4444' : '#22c55e' }}>
                                    {isLower ? `-${Math.abs(priceDiff)}` : `+${priceDiff}`} vs You
                                </div>
                            </div>

                            <AnimatePresence>
                                {hoveredId === comp.id && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            right: 0,
                                            background: '#1e293b',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(168, 85, 247, 0.3)',
                                            zIndex: 50,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                            width: '200px',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>7-Day Stability</div>
                                        <div style={{ display: 'flex', gap: '4px', height: '30px', alignItems: 'flex-end', marginBottom: '8px' }}>
                                            {[40, 60, 45, 70, 50, 65, 55].map((h, i) => (
                                                <div key={i} style={{ flex: 1, background: 'var(--primary)', height: `${h}%`, borderRadius: '2px', opacity: 0.6 }} />
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                                            Status: <span style={{ color: '#22c55e' }}>Highly Stable</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                                            Last change: 2 days ago
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
