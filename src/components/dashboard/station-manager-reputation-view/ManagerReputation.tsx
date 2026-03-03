'use client';

import { useEffect, useState } from 'react';
import { getReputationData } from './actions';
import styles from '../station-manager-view/ManagerOverview.module.css';
import TrustScoreCards from './TrustScoreCards';
import ReviewList from './ReviewList';
import VerificationProgress from './VerificationProgress';
import ReputationHelp from './ReputationHelp';
import { LoadingLogo } from '@/components/loading-logo';

interface ManagerReputationProps {
    stationId: number;
    managerId: string;
}

export default function ManagerReputation({ stationId, managerId }: ManagerReputationProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchReputationData() {
            setLoading(true);

            try {
                const {
                    station,
                    reviews,
                    pReports,
                    reportsCount,
                    verificationsCount
                } = await getReputationData(stationId);

                // 3. Unify into a single activity feed
                const unifiedFeed = [
                    ...(reviews || []).map((r: any) => ({ ...r, type: 'review' })),
                    ...(pReports || []).map((p: any) => ({
                        ...p,
                        type: 'report',
                        rating: p.rating || 5,
                        comment: p.notes
                    }))
                ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // 4. Calculate Aggregate Scores
                const totalReviews = reviews?.length || 0;
                const reviewsWithMeter = reviews?.filter(r => r.rating_meter !== undefined && r.rating_meter !== null) || [];

                // Meter Accuracy Aggregation: (RatingMeter from Reviews + MeterAccuracy from Reports)
                const reportMeterScores = (pReports || []).map(p => p.meter_accuracy === 100 || p.meter_accuracy === null ? 5 : 1);
                const combinedMeterScores = [
                    ...reviewsWithMeter.map(r => r.rating_meter),
                    ...reportMeterScores
                ];

                const meterRating = combinedMeterScores.length
                    ? combinedMeterScores.reduce((acc, val) => acc + (val || 0), 0) / combinedMeterScores.length
                    : 5.0; // Optimistic Baseline (Sync with Mobile App)

                // Trust Points Calculation (Gamified)
                const verificationPoints = station?.is_verified ? 300 : 0;
                const accuracyCountFromReviews = reviewsWithMeter.filter(r => (r.rating_meter || 0) >= 4).length;
                const accuracyFailureFromReports = (pReports || []).filter(p => p.meter_accuracy !== null && p.meter_accuracy !== 100).length;
                const totalChecks = combinedMeterScores.length;

                const accuracyRatio = totalChecks
                    ? (combinedMeterScores.filter(s => (s || 0) >= 4).length / totalChecks)
                    : 1.0; // Optimistic Baseline
                const accuracyPoints = Math.round(accuracyRatio * 300);

                const responseCount = reviews?.filter(r => r.response).length || 0;
                const engagementPoints = Math.min(responseCount * 50, 200);

                const activityCount = (reportsCount || 0) + (verificationsCount || 0);
                const consistencypoints = Math.min(activityCount * 10, 200);

                // Calculate Star Rating (Weighted)
                // 40% Meter Accuracy, 40% User Reviews, 20% Verification Status
                const reviewAvg = reviews?.reduce((acc, r) => acc + r.rating, 0) || 0;
                const avgReviewScore = totalReviews ? reviewAvg / totalReviews : 5.0; // Optimistic Baseline

                const weightedRating = (
                    (accuracyRatio * 5 * 0.4) +
                    (avgReviewScore * 0.4) +
                    ((station?.is_verified ? 5 : 0) * 0.2)
                );

                // Every station baselines at 5.0 (100% in app terms)
                const displayRating = (totalReviews > 0 || (reportsCount || 0) > 0) ? weightedRating.toFixed(1) : '5.0';

                // MOBILE APP SYNC: Trust Score as Percentage
                const trustScorePercent = Math.round((Number(displayRating) / 5) * 100);

                // GOLD STATUS MILESTONES (Sync with Mobile App)
                const milestones = {
                    trustScoreGte90: trustScorePercent >= 90,
                    reviewsGte10: (totalReviews + (reportsCount || 0)) >= 10,
                    responseRateGte90: totalReviews > 0 ? (responseCount / totalReviews) >= 0.9 : true
                };

                setData({
                    station,
                    unifiedFeed,
                    totalReviews,
                    reportsCount,
                    meterRating,
                    trustScorePercent,
                    milestones
                });

            } catch (error) {
                console.error("Error fetching reputation data:", error);
                setLoading(false);
            }
        }

        fetchReputationData();
    }, [stationId]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoadingLogo size={80} />
                <p className="mt-4 text-muted-foreground animate-pulse font-medium tracking-wide">Evaluating Reputation Pulse...</p>
            </div>
        );
    }

    const { station, unifiedFeed, totalReviews, reportsCount, meterRating, trustScorePercent, milestones } = data;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={styles.mainContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <ReputationHelp />
                    <TrustScoreCards
                        meterRating={meterRating}
                        totalReviews={totalReviews}
                        totalReports={reportsCount || 0}
                        overallRating={trustScorePercent.toString() + '%'} // Show as %
                        isVerified={station?.is_verified || false}
                    />

                    <ReviewList reviews={unifiedFeed} />
                </div>

                <div>
                    <VerificationProgress
                        isVerified={station?.is_verified || false}
                        milestones={milestones}
                    />
                </div>
            </div>
        </div>
    );
}
