'use client';

import { Award, CheckCircle2 } from 'lucide-react';
import styles from '../station-manager-view/ManagerOverview.module.css';

interface VerificationProgressProps {
    isVerified: boolean;
    milestones: {
        trustScoreGte90: boolean;
        reviewsGte10: boolean;
        responseRateGte90: boolean;
    };
}

export default function VerificationProgress({ isVerified, milestones }: VerificationProgressProps) {
    const milestonesMetCount = [
        milestones.trustScoreGte90,
        milestones.reviewsGte10,
        milestones.responseRateGte90
    ].filter(Boolean).length;

    const percentage = (milestonesMetCount / 3) * 100;

    return (
        <div className={styles.recentReports}>
            <div className={styles.sectionHeader}>
                <h2>Badge Status</h2>
                <p>Manager's journey to FyndFuel Gold Verified status.</p>
            </div>

            <div className={styles.statCard} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className={styles.promoIcon} style={{
                        width: '60px',
                        height: '60px',
                        background: isVerified ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'hsl(var(--muted))',
                        boxShadow: isVerified ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
                        color: isVerified ? '#fff' : 'hsl(var(--muted-foreground))'
                    }}>
                        <Award size={32} />
                    </div>
                    <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--foreground))' }}>
                            FyndFuel Gold {isVerified && <CheckCircle2 size={16} color="#22c55e" />}
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                            {isVerified ? 'You are a top-rated station' : 'Complete milestones to verify'}
                        </span>
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'hsl(var(--foreground))' }}>
                        <span>Progress: {milestonesMetCount} / 3 milestones</span>
                        <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'hsl(var(--border))', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                            transition: 'width 1s ease-out'
                        }}></div>
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '12px' }}>Next Milestones:</p>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={16} color={milestones.trustScoreGte90 ? '#22c55e' : 'hsl(var(--muted-foreground))'} opacity={milestones.trustScoreGte90 ? 1 : 0.3} />
                            <span style={{ color: milestones.trustScoreGte90 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                                Trust Score ≥ 90%
                            </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={16} color={milestones.reviewsGte10 ? '#22c55e' : 'hsl(var(--muted-foreground))'} opacity={milestones.reviewsGte10 ? 1 : 0.3} />
                            <span style={{ color: milestones.reviewsGte10 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                                10+ Driver Reports/Reviews
                            </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={16} color={milestones.responseRateGte90 ? '#22c55e' : 'hsl(var(--muted-foreground))'} opacity={milestones.responseRateGte90 ? 1 : 0.3} />
                            <span style={{ color: milestones.responseRateGte90 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                                &gt; 90% Response Rate
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
