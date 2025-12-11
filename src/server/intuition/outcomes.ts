/**
 * Intuition OS - Recommendation Outcomes (Feedback Loop)
 * 
 * Loop 4: Feedback Evolution
 * 
 * Tracks what happened after each recommendation to close the learning loop.
 * This data evolves heuristics and improves future recommendations.
 */

import {
    RecommendationOutcome,
    OutcomeResult,
    Heuristic,
} from './schema';
import { updateHeuristicStats, getHeuristics } from './heuristics';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Path ---

function getOutcomesCollection(tenantId: string) {
    return `tenants/${tenantId}/recommendationOutcomes`;
}

// --- Outcome Tracking ---

/**
 * Records a recommendation outcome.
 */
export async function recordOutcome(
    tenantId: string,
    data: {
        eventId: string;
        sessionId: string;
        customerId?: string;
        recommendedProducts: string[];
        selectedProduct?: string;
        outcome: OutcomeResult;
        heuristicsApplied: string[];
        systemMode: 'fast' | 'slow';
        confidenceScore: number;
        revenueGenerated?: number;
    }
): Promise<RecommendationOutcome> {
    const { firestore } = await createServerClient();

    const outcomeRecord: RecommendationOutcome = {
        id: uuidv4(),
        tenantId,
        ...data,
        createdAt: new Date().toISOString(),
    };

    await firestore
        .collection(getOutcomesCollection(tenantId))
        .doc(outcomeRecord.id)
        .set(outcomeRecord);

    // Update heuristic stats based on outcome
    const wasSuccessful = ['converted'].includes(data.outcome);
    for (const heuristicId of data.heuristicsApplied) {
        await updateHeuristicStats(tenantId, heuristicId, wasSuccessful);
    }

    logger.debug(`[Outcomes] Recorded: ${data.outcome} for session ${data.sessionId}`);
    return outcomeRecord;
}

/**
 * Gets recent outcomes for analysis.
 */
export async function getRecentOutcomes(
    tenantId: string,
    options: {
        startDate?: Date;
        endDate?: Date;
        outcome?: OutcomeResult;
        systemMode?: 'fast' | 'slow';
        limit?: number;
    } = {}
): Promise<RecommendationOutcome[]> {
    const { startDate, endDate, outcome, systemMode, limit = 1000 } = options;

    try {
        const { firestore } = await createServerClient();
        let query = firestore
            .collection(getOutcomesCollection(tenantId))
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (startDate) {
            query = query.where('createdAt', '>=', startDate.toISOString());
        }
        if (endDate) {
            query = query.where('createdAt', '<=', endDate.toISOString());
        }
        if (outcome) {
            query = query.where('outcome', '==', outcome);
        }
        if (systemMode) {
            query = query.where('systemMode', '==', systemMode);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data() as RecommendationOutcome);
    } catch (error) {
        logger.error('[Outcomes] Failed to fetch',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

// --- Heuristic Evolution ---

export interface HeuristicPerformance {
    heuristicId: string;
    heuristicName: string;
    appliedCount: number;
    successCount: number;
    successRate: number;
    revenueGenerated: number;
    recommendation: 'keep' | 'review' | 'disable';
}

/**
 * Analyzes heuristic performance from outcomes.
 */
export async function analyzeHeuristicPerformance(
    tenantId: string,
    lookbackHours: number = 24
): Promise<HeuristicPerformance[]> {
    const startDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const outcomes = await getRecentOutcomes(tenantId, { startDate });

    // Group by heuristic
    const heuristicStats: Map<string, {
        appliedCount: number;
        successCount: number;
        revenueGenerated: number;
    }> = new Map();

    for (const outcome of outcomes) {
        const wasSuccess = outcome.outcome === 'converted';

        for (const heuristicId of outcome.heuristicsApplied) {
            const current = heuristicStats.get(heuristicId) || {
                appliedCount: 0,
                successCount: 0,
                revenueGenerated: 0,
            };

            heuristicStats.set(heuristicId, {
                appliedCount: current.appliedCount + 1,
                successCount: current.successCount + (wasSuccess ? 1 : 0),
                revenueGenerated: current.revenueGenerated + (outcome.revenueGenerated || 0),
            });
        }
    }

    // Get heuristic names
    const heuristics = await getHeuristics(tenantId);
    const heuristicNameMap = new Map(heuristics.map(h => [h.id, h.name]));

    // Build performance report
    const performances: HeuristicPerformance[] = [];

    for (const [heuristicId, stats] of Array.from(heuristicStats.entries())) {
        const successRate = stats.appliedCount > 0
            ? stats.successCount / stats.appliedCount
            : 0;

        // Determine recommendation
        let recommendation: HeuristicPerformance['recommendation'] = 'keep';
        if (stats.appliedCount >= 50 && successRate < 0.2) {
            recommendation = 'disable';
        } else if (stats.appliedCount >= 20 && successRate < 0.3) {
            recommendation = 'review';
        }

        performances.push({
            heuristicId,
            heuristicName: heuristicNameMap.get(heuristicId) || 'Unknown',
            appliedCount: stats.appliedCount,
            successCount: stats.successCount,
            successRate: Math.round(successRate * 100) / 100,
            revenueGenerated: stats.revenueGenerated,
            recommendation,
        });
    }

    return performances.sort((a, b) => b.appliedCount - a.appliedCount);
}

/**
 * Runs the heuristic evolution job.
 * Should be scheduled every 6 hours.
 */
export async function runHeuristicEvolutionJob(
    tenantId: string
): Promise<{
    analyzed: number;
    flaggedForReview: number;
    autoDisabled: number;
}> {
    logger.info(`[Outcomes] Running heuristic evolution for tenant ${tenantId}`);

    const performances = await analyzeHeuristicPerformance(tenantId, 24);

    let flaggedForReview = 0;
    let autoDisabled = 0;

    for (const perf of performances) {
        if (perf.recommendation === 'review') {
            flaggedForReview++;
            logger.warn(`[Outcomes] Heuristic needs review: ${perf.heuristicName} (${perf.successRate * 100}% success)`);
        } else if (perf.recommendation === 'disable') {
            autoDisabled++;
            // In a real implementation, we'd disable the heuristic here
            // For V1, just log a warning
            logger.warn(`[Outcomes] Heuristic should be disabled: ${perf.heuristicName} (${perf.successRate * 100}% success)`);
        }
    }

    logger.info(`[Outcomes] Evolution complete: ${performances.length} analyzed, ${flaggedForReview} flagged, ${autoDisabled} should disable`);

    return {
        analyzed: performances.length,
        flaggedForReview,
        autoDisabled,
    };
}

// --- System Performance Analytics ---

export interface SystemPerformance {
    fastPathUsage: number;
    slowPathUsage: number;
    fastPathConversionRate: number;
    slowPathConversionRate: number;
    avgConfidenceScore: number;
    totalRevenue: number;
}

/**
 * Analyzes fast vs slow path performance.
 */
export async function analyzeSystemPerformance(
    tenantId: string,
    lookbackHours: number = 24
): Promise<SystemPerformance> {
    const startDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const outcomes = await getRecentOutcomes(tenantId, { startDate });

    let fastCount = 0, fastSuccess = 0;
    let slowCount = 0, slowSuccess = 0;
    let totalConfidence = 0;
    let totalRevenue = 0;

    for (const outcome of outcomes) {
        const wasSuccess = outcome.outcome === 'converted';
        totalConfidence += outcome.confidenceScore;
        totalRevenue += outcome.revenueGenerated || 0;

        if (outcome.systemMode === 'fast') {
            fastCount++;
            if (wasSuccess) fastSuccess++;
        } else {
            slowCount++;
            if (wasSuccess) slowSuccess++;
        }
    }

    const total = fastCount + slowCount;

    return {
        fastPathUsage: total > 0 ? fastCount / total : 0,
        slowPathUsage: total > 0 ? slowCount / total : 0,
        fastPathConversionRate: fastCount > 0 ? fastSuccess / fastCount : 0,
        slowPathConversionRate: slowCount > 0 ? slowSuccess / slowCount : 0,
        avgConfidenceScore: total > 0 ? totalConfidence / total : 0,
        totalRevenue,
    };
}
