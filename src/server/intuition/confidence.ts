/**
 * Intuition OS - Confidence Scoring
 * 
 * Determines System 1 (fast) vs System 2 (slow) routing.
 * 
 * High confidence → Fast path (heuristics + cached memories)
 * Low confidence → Slow path (full LLM reasoning)
 */

import { ConfidenceScore, ConfidenceFactors } from './schema';
import { logger } from '@/lib/logger';

// --- Weights ---

const CONFIDENCE_WEIGHTS = {
    dataRecency: 0.15,
    dataDensity: 0.25,
    heuristicCoverage: 0.20,
    patternMatch: 0.25,
    anomalyScore: 0.15,
};

// Threshold for System 1 vs System 2
const FAST_PATH_THRESHOLD = 0.6;

// --- Factor Calculations ---

/**
 * Calculates data recency score based on last interaction.
 */
export function calculateDataRecency(lastInteractionDate?: Date): number {
    if (!lastInteractionDate) return 0;

    const hoursSince = (Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60);

    // Score degrades over time
    if (hoursSince < 1) return 1;
    if (hoursSince < 24) return 0.9;
    if (hoursSince < 168) return 0.7; // 1 week
    if (hoursSince < 720) return 0.5; // 30 days
    return 0.3;
}

/**
 * Calculates data density score based on interaction count.
 */
export function calculateDataDensity(interactionCount: number): number {
    // More interactions = higher confidence
    if (interactionCount >= 50) return 1;
    if (interactionCount >= 20) return 0.8;
    if (interactionCount >= 10) return 0.6;
    if (interactionCount >= 3) return 0.4;
    return 0.2;
}

/**
 * Calculates heuristic coverage score.
 */
export function calculateHeuristicCoverage(
    heuristicsMatched: number,
    totalHeuristics: number
): number {
    if (totalHeuristics === 0) return 0.5; // Neutral if no heuristics
    return Math.min(1, heuristicsMatched / totalHeuristics);
}

/**
 * Calculates pattern match score.
 */
export function calculatePatternMatch(
    clusterConfidence: number | null,
    similarCustomerCount: number
): number {
    if (clusterConfidence === null) return 0.3;

    // Blend cluster confidence with similar customer count
    const similarityBonus = Math.min(0.2, similarCustomerCount / 50);
    return Math.min(1, clusterConfidence + similarityBonus);
}

/**
 * Calculates anomaly score (inverse of anomaly detection).
 */
export function calculateAnomalyScore(
    isAnomalous: boolean,
    anomalyDeviation?: number
): number {
    if (!isAnomalous) return 1;
    if (!anomalyDeviation) return 0.5;

    // Higher deviation = lower confidence
    return Math.max(0, 1 - (anomalyDeviation / 100));
}

// --- Main Confidence Calculation ---

export interface ConfidenceInput {
    lastInteractionDate?: Date;
    interactionCount: number;
    heuristicsMatched: number;
    totalHeuristics: number;
    clusterConfidence: number | null;
    similarCustomerCount: number;
    isAnomalous: boolean;
    anomalyDeviation?: number;
}

/**
 * Calculates the full confidence score.
 */
export function calculateConfidenceScore(input: ConfidenceInput): ConfidenceScore {
    const factors: ConfidenceFactors = {
        dataRecency: calculateDataRecency(input.lastInteractionDate),
        dataDensity: calculateDataDensity(input.interactionCount),
        heuristicCoverage: calculateHeuristicCoverage(
            input.heuristicsMatched,
            input.totalHeuristics
        ),
        patternMatch: calculatePatternMatch(
            input.clusterConfidence,
            input.similarCustomerCount
        ),
        anomalyScore: calculateAnomalyScore(
            input.isAnomalous,
            input.anomalyDeviation
        ),
    };

    // Weighted sum
    const score =
        factors.dataRecency * CONFIDENCE_WEIGHTS.dataRecency +
        factors.dataDensity * CONFIDENCE_WEIGHTS.dataDensity +
        factors.heuristicCoverage * CONFIDENCE_WEIGHTS.heuristicCoverage +
        factors.patternMatch * CONFIDENCE_WEIGHTS.patternMatch +
        factors.anomalyScore * CONFIDENCE_WEIGHTS.anomalyScore;

    const systemMode = score >= FAST_PATH_THRESHOLD ? 'fast' : 'slow';

    logger.debug(`[Confidence] Score: ${score.toFixed(2)}, Mode: ${systemMode}`);

    return {
        score: Math.round(score * 100) / 100,
        factors,
        systemMode,
    };
}

/**
 * Quick check if we should use fast path.
 */
export function shouldUseFastPath(score: ConfidenceScore): boolean {
    return score.systemMode === 'fast';
}

/**
 * Gets confidence explanation for debugging.
 */
export function explainConfidence(score: ConfidenceScore): string {
    const { factors } = score;

    const explanations: string[] = [];

    if (factors.dataRecency < 0.5) {
        explanations.push('Data is stale');
    }
    if (factors.dataDensity < 0.5) {
        explanations.push('Limited interaction history');
    }
    if (factors.heuristicCoverage < 0.3) {
        explanations.push('Few heuristics matched');
    }
    if (factors.patternMatch < 0.5) {
        explanations.push('Weak pattern match');
    }
    if (factors.anomalyScore < 0.5) {
        explanations.push('Anomalous request detected');
    }

    if (explanations.length === 0) {
        return 'High confidence - all factors strong';
    }

    return `Low confidence due to: ${explanations.join(', ')}`;
}
