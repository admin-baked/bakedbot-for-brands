/**
 * Retention Score Service
 *
 * Pure rule-based (no LLM) 0-100 composite score stored on each customer.
 * Runs as a weekly batch cron (Monday 3 AM), never blocks a user request.
 *
 * Scoring model:
 *   Recency             30% — how recently did the customer visit?
 *   Frequency+Monetary  30% — how often and how much do they spend?
 *   Churn Inverse       25% — wraps churnProbability (already computed)
 *   Engagement          15% — loyalty points, streak, tier progress
 *
 * Tiers:
 *   champion  80-100  — top customers, protect at all costs
 *   engaged   55-79   — healthy, prime for upsell
 *   at_risk   30-54   — needs attention, Craig win-back territory
 *   dormant   0-29    — likely gone, long-shot campaigns only
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile, RetentionTier, RetentionScoreBreakdown } from '@/types/customers';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// Scoring helpers
// =============================================================================

/** Clamp value to [0, max] */
function clamp(val: number, max: number): number {
    return Math.max(0, Math.min(max, val));
}

/**
 * Recency component — 0 to 30 points.
 * Full marks for visited ≤7 days ago, zero for ≥180 days.
 */
function scoreRecency(daysSinceLast: number): number {
    if (daysSinceLast <= 7)   return 30;
    if (daysSinceLast <= 14)  return 28;
    if (daysSinceLast <= 30)  return 22;
    if (daysSinceLast <= 45)  return 16;
    if (daysSinceLast <= 60)  return 10;
    if (daysSinceLast <= 90)  return 5;
    if (daysSinceLast <= 180) return 2;
    return 0;
}

/**
 * Frequency + Monetary component — 0 to 30 points.
 * 15 points each, combined.
 */
function scoreFrequencyMonetary(orderCount: number, lifetimeValue: number): number {
    // Frequency: 15 pts max
    let freqScore: number;
    if (orderCount >= 20) freqScore = 15;
    else if (orderCount >= 12) freqScore = 13;
    else if (orderCount >= 8)  freqScore = 11;
    else if (orderCount >= 5)  freqScore = 9;
    else if (orderCount >= 3)  freqScore = 7;
    else if (orderCount >= 2)  freqScore = 5;
    else if (orderCount === 1) freqScore = 3;
    else freqScore = 0;

    // Monetary: 15 pts max
    let monoScore: number;
    if (lifetimeValue >= 2000) monoScore = 15;
    else if (lifetimeValue >= 1000) monoScore = 13;
    else if (lifetimeValue >= 500)  monoScore = 11;
    else if (lifetimeValue >= 250)  monoScore = 8;
    else if (lifetimeValue >= 100)  monoScore = 5;
    else if (lifetimeValue >= 50)   monoScore = 3;
    else monoScore = 1;

    return clamp(freqScore + monoScore, 30);
}

/**
 * Churn inverse component — 0 to 25 points.
 * If churnProbability is known: score = (100 - churnProbability) * 0.25
 * If not known: estimate from segment.
 */
function scoreChurnInverse(
    churnProbability: number | undefined,
    segment: string,
): number {
    if (churnProbability !== undefined) {
        return clamp(Math.round((100 - churnProbability) * 0.25), 25);
    }
    // Fallback: rough churn estimate from segment
    const defaultBySegment: Record<string, number> = {
        vip:        22,
        loyal:      20,
        frequent:   18,
        high_value: 18,
        new:        16,
        slipping:   10,
        at_risk:    5,
        churned:    0,
    };
    return defaultBySegment[segment] ?? 12;
}

/**
 * Engagement component — 0 to 15 points.
 * Points balance, purchase streak, and tier progress.
 */
function scoreEngagement(profile: Pick<CustomerProfile,
    'points' | 'purchaseStreak' | 'tierProgress' | 'tier'
>): number {
    // Points: 6 pts max
    const pts = profile.points ?? 0;
    let ptScore: number;
    if (pts >= 1000) ptScore = 6;
    else if (pts >= 500) ptScore = 5;
    else if (pts >= 200) ptScore = 4;
    else if (pts >= 100) ptScore = 3;
    else if (pts >= 50)  ptScore = 2;
    else if (pts >= 10)  ptScore = 1;
    else ptScore = 0;

    // Streak: 5 pts max
    const streak = profile.purchaseStreak ?? 0;
    let streakScore: number;
    if (streak >= 10) streakScore = 5;
    else if (streak >= 6) streakScore = 4;
    else if (streak >= 4) streakScore = 3;
    else if (streak >= 2) streakScore = 2;
    else if (streak >= 1) streakScore = 1;
    else streakScore = 0;

    // Tier: 4 pts max
    const tierScores: Record<string, number> = {
        platinum: 4, gold: 3, silver: 2, bronze: 1,
    };
    const tierScore = tierScores[profile.tier ?? 'bronze'] ?? 0;

    return clamp(ptScore + streakScore + tierScore, 15);
}

/**
 * Map composite score to retention tier.
 */
function scoreToTier(score: number): RetentionTier {
    if (score >= 80) return 'champion';
    if (score >= 55) return 'engaged';
    if (score >= 30) return 'at_risk';
    return 'dormant';
}

/**
 * Compute score trend by comparing to previous score.
 */
function computeTrend(
    newScore: number,
    prevScore: number | undefined,
): 'rising' | 'stable' | 'falling' {
    if (prevScore === undefined) return 'stable';
    const delta = newScore - prevScore;
    if (delta >= 5) return 'rising';
    if (delta <= -5) return 'falling';
    return 'stable';
}

// =============================================================================
// Public compute function
// =============================================================================

export interface RetentionScoreResult {
    customerId: string;
    score: number;
    tier: RetentionTier;
    trend: 'rising' | 'stable' | 'falling';
    breakdown: RetentionScoreBreakdown;
}

export function computeRetentionScore(profile: CustomerProfile): RetentionScoreResult {
    const daysSinceLast = profile.daysSinceLastOrder ??
        (profile.lastOrderDate
            ? Math.floor((Date.now() - new Date(profile.lastOrderDate).getTime()) / 86_400_000)
            : 365);

    const breakdown: RetentionScoreBreakdown = {
        recency:           scoreRecency(daysSinceLast),
        frequencyMonetary: scoreFrequencyMonetary(profile.orderCount ?? 0, profile.lifetimeValue ?? 0),
        churnInverse:      scoreChurnInverse(profile.churnProbability, profile.segment),
        engagement:        scoreEngagement(profile),
    };

    const score = Math.round(
        breakdown.recency +
        breakdown.frequencyMonetary +
        breakdown.churnInverse +
        breakdown.engagement,
    );

    return {
        customerId: profile.id,
        score: clamp(score, 100),
        tier: scoreToTier(score),
        trend: computeTrend(score, profile.retentionScore),
        breakdown,
    };
}

// =============================================================================
// Batch service (cron use)
// =============================================================================

export interface BatchRetentionResult {
    success: boolean;
    orgId: string;
    totalCustomers: number;
    scored: number;
    tierBreakdown: Record<RetentionTier, number>;
    durationMs: number;
    error?: string;
}

export class RetentionScoreService {
    /**
     * Score all customers for an org. Writes results to Firestore in batches of 400.
     * Safe to call from cron without holding a transaction.
     */
    async scoreOrg(orgId: string): Promise<BatchRetentionResult> {
        const start = Date.now();
        const db = getAdminFirestore();
        const tierBreakdown: Record<RetentionTier, number> = {
            champion: 0, engaged: 0, at_risk: 0, dormant: 0,
        };

        try {
            const snap = await db.collection('customers')
                .where('orgId', '==', orgId)
                .select(
                    'id', 'orgId', 'segment', 'tier', 'orderCount', 'totalSpent',
                    'avgOrderValue', 'lifetimeValue', 'lastOrderDate', 'firstOrderDate',
                    'daysSinceLastOrder', 'points', 'purchaseStreak', 'tierProgress',
                    'churnProbability', 'retentionScore',
                )
                .get();

            if (snap.empty) {
                return {
                    success: true, orgId,
                    totalCustomers: 0, scored: 0,
                    tierBreakdown, durationMs: Date.now() - start,
                };
            }

            const BATCH_SIZE = 400;
            let batch = db.batch();
            let opsInBatch = 0;
            let scored = 0;

            for (const doc of snap.docs) {
                const raw = doc.data() as CustomerProfile;
                const profile: CustomerProfile = {
                    ...raw,
                    id: doc.id,
                    // Firestore Timestamps → Date
                    lastOrderDate: raw.lastOrderDate
                        ? (raw.lastOrderDate as unknown as Timestamp).toDate?.() ?? new Date(raw.lastOrderDate as unknown as string)
                        : undefined,
                    firstOrderDate: raw.firstOrderDate
                        ? (raw.firstOrderDate as unknown as Timestamp).toDate?.() ?? new Date(raw.firstOrderDate as unknown as string)
                        : undefined,
                };

                const result = computeRetentionScore(profile);
                tierBreakdown[result.tier]++;

                batch.update(doc.ref, {
                    retentionScore: result.score,
                    retentionTier: result.tier,
                    scoreTrend: result.trend,
                    scoreBreakdown: result.breakdown,
                    retentionScoredAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                opsInBatch++;
                scored++;

                if (opsInBatch >= BATCH_SIZE) {
                    await batch.commit();
                    batch = db.batch();
                    opsInBatch = 0;
                }
            }

            if (opsInBatch > 0) {
                await batch.commit();
            }

            logger.info(`[RetentionScore] ${orgId} scored ${scored}/${snap.size} customers`, { tierBreakdown });

            return {
                success: true, orgId,
                totalCustomers: snap.size, scored,
                tierBreakdown, durationMs: Date.now() - start,
            };
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            logger.error(`[RetentionScore] Failed for ${orgId}`, { error });
            return {
                success: false, orgId,
                totalCustomers: 0, scored: 0,
                tierBreakdown, durationMs: Date.now() - start, error,
            };
        }
    }
}
