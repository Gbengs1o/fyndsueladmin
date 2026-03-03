'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Zap, ShieldCheck, Award } from 'lucide-react';
import styles from '../station-manager-view/ManagerOverview.module.css';

export default function ReputationHelp() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ marginBottom: '24px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    background: 'hsl(var(--primary) / 0.05)',
                    border: '1px solid hsl(var(--primary) / 0.2)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'hsl(var(--foreground))' }}>How do these metrics work?</h3>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--foreground))', opacity: 0.8, margin: 0 }}>Understand your star ratings and Gold Status progress.</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-foreground" /> : <ChevronDown size={20} className="text-foreground" />}
            </button>

            {isOpen && (
                <div style={{
                    marginTop: '12px',
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                            <Zap size={18} />
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Trust Score (100%)</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.5' }}>
                            This is your overall prestige on the app. It's a weighted average:
                            <strong> 40% Meter Accuracy</strong>, <strong>40% Reviews</strong>, and <strong>20% Verification Status</strong>.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--primary))' }}>
                            <Info size={18} />
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Meter & Quality</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.5' }}>
                            <strong>Meter Accuracy</strong> counts every price report and review.
                            Both start at <strong>5.0</strong> by default to give you an optimistic baseline!
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                            <Award size={18} />
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Gold Status</h4>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.5' }}>
                            Become "Gold Verified" by hitting 3 milestones: Maintain <strong>90%+ Trust</strong>, collect <strong>10+ reviews</strong>, and keep a <strong>90%+ Response Rate</strong>.
                        </p>
                    </div>

                    <style jsx>{`
                        @keyframes slideDown {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
