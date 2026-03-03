'use client';

import { useState } from 'react';
import { MessageSquare, Calendar, Send, CheckCircle, User } from 'lucide-react';
import { respondToReview, respondToReport, getScoutProfile } from './actions';
import ScoutProfileModal from './ScoutProfileModal';
import styles from '../station-manager-view/ManagerOverview.module.css';

interface Review {
    id: string;
    rating: number;
    comment: string;
    sentiment: string;
    created_at: string;
    response: string | null;
    responded_at: string | null;
    user_email?: string;
    type?: 'review' | 'report';
    user_id?: string;
    price?: number;
    fuel_type?: string;
    meter_accuracy?: number;
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
}

interface ReviewListProps {
    reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [responseValue, setResponseValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Scout Profile Modal State
    const [isScoutModalOpen, setIsScoutModalOpen] = useState(false);
    const [scoutData, setScoutData] = useState<any>(null);
    const [isScoutLoading, setIsScoutLoading] = useState(false);

    async function handleOpenScoutProfile(userId: string) {
        if (!userId) return;
        setIsScoutModalOpen(true);
        setIsScoutLoading(true);
        try {
            const data = await getScoutProfile(userId);
            setScoutData(data);
        } catch (error) {
            console.error('Failed to fetch scout profile:', error);
        } finally {
            setIsScoutLoading(false);
        }
    }

    async function handleResponse(reviewId: string, type?: string) {
        if (!responseValue.trim()) return;
        setIsSubmitting(true);
        try {
            if (type === 'report') {
                await respondToReport(reviewId, responseValue);
            } else {
                await respondToReview(reviewId, responseValue);
            }
            setRespondingId(null);
            setResponseValue('');
        } catch (error) {
            console.error('Failed to respond:', error);
            alert('Failed to send response.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className={styles.chartArea} style={{ background: 'hsl(var(--surface))' }}>
            <div className={styles.sectionHeader}>
                <h2>Customer Feedback</h2>
                <p>Recent reviews and reports from Fynd Fuel users.</p>
            </div>

            <div className={styles.competitorList}>
                {reviews.map((review) => (
                    <div key={review.id} className={styles.competitorCard} style={{ flexDirection: 'column', gap: '12px', alignItems: 'stretch', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: (review as any).user_id ? 'pointer' : 'default' }}
                                onClick={() => (review as any).user_id && handleOpenScoutProfile((review as any).user_id)}
                                title={(review as any).user_id ? "View Scout Profile" : ""}
                            >
                                <div className={styles.avatar} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                                    {(review as any).profiles?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                    {(review as any).profiles?.full_name || 'Anonymous Driver'}
                                </div>
                                <div className={styles.sentimentBadge} data-sentiment={review.sentiment}>
                                    {review.sentiment}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> {new Date(review.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>
                                {review.type === 'report'
                                    ? (review.price ? 'Price Update' : 'Service Report')
                                    : `${review.rating} ⭐`}
                            </div>
                        </div>

                        {review.type === 'report' && review.price && (
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                <div style={{
                                    background: 'hsl(var(--primary) / 0.1)',
                                    color: 'hsl(var(--primary))',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: '1px solid hsl(var(--primary) / 0.2)'
                                }}>
                                    {review.fuel_type || 'PMS'}: ₦{review.price}
                                </div>
                                {review.meter_accuracy === 100 && (
                                    <div style={{
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        color: '#22c55e',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        border: '1px solid rgba(34, 197, 94, 0.2)'
                                    }}>
                                        ✓ Accurate Pump
                                    </div>
                                )}
                            </div>
                        )}

                        <p style={{ fontSize: '0.95rem', lineHeight: '1.4', color: 'hsl(var(--foreground))' }}>
                            {review.comment ? (
                                <>"{review.comment}"</>
                            ) : (
                                <span style={{ color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>Verified station activity & quality.</span>
                            )}
                        </p>

                        {review.response ? (
                            <div style={{ background: 'hsl(var(--muted))', padding: '12px', borderRadius: '12px', border: '1px solid hsl(var(--border))', marginTop: '8px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                    <CheckCircle size={12} /> Your Response
                                </p>
                                <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'hsl(var(--foreground))' }}>{review.response}</p>
                            </div>
                        ) : (
                            <div style={{ marginTop: '8px' }}>
                                {respondingId === review.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <textarea
                                            placeholder="Type your apology or response..."
                                            className={styles.input}
                                            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', height: '80px', padding: '12px', color: 'hsl(var(--foreground))' }}
                                            value={responseValue}
                                            onChange={(e) => setResponseValue(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow"
                                                style={{ padding: '6px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                disabled={isSubmitting}
                                                onClick={() => handleResponse(review.id, review.type)}
                                            >
                                                <Send size={14} style={{ marginRight: '6px' }} /> {isSubmitting ? 'Sending...' : 'Send Response'}
                                            </button>
                                            <button
                                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md shadow"
                                                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                                                onClick={() => setRespondingId(null)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md shadow"
                                        style={{ padding: '6px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => setRespondingId(review.id)}
                                    >
                                        <MessageSquare size={14} style={{ marginRight: '6px' }} /> Respond to Customer
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {reviews.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '40px' }}>No reviews yet for this station.</p>
                )}
            </div>

            <ScoutProfileModal
                isOpen={isScoutModalOpen}
                onClose={() => setIsScoutModalOpen(false)}
                data={scoutData}
                isLoading={isScoutLoading}
            />
        </div>
    );
}
