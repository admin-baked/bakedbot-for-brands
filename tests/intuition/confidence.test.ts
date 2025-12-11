/**
 * Unit Tests: Intuition OS - Confidence Scoring
 */

import {
    calculateConfidenceScore,
    shouldUseFastPath,
    explainConfidence,
    calculateDataRecency,
    calculateDataDensity,
    calculateHeuristicCoverage,
    calculatePatternMatch,
    calculateAnomalyScore,
    ConfidenceInput,
} from '@/server/intuition/confidence';

describe('Confidence Scoring', () => {
    describe('calculateDataRecency', () => {
        it('should return 1 for very recent data', () => {
            const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
            expect(calculateDataRecency(recentDate)).toBe(1);
        });

        it('should return lower score for older data', () => {
            const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
            const score = calculateDataRecency(oldDate);
            expect(score).toBeLessThan(1);
            expect(score).toBeGreaterThan(0.5);
        });

        it('should return 0 for undefined date', () => {
            expect(calculateDataRecency(undefined)).toBe(0);
        });
    });

    describe('calculateDataDensity', () => {
        it('should return 1 for high interaction count', () => {
            expect(calculateDataDensity(100)).toBe(1);
        });

        it('should return lower score for fewer interactions', () => {
            expect(calculateDataDensity(5)).toBeLessThan(0.6);
        });

        it('should return minimum for very few interactions', () => {
            expect(calculateDataDensity(1)).toBe(0.2);
        });
    });

    describe('calculateHeuristicCoverage', () => {
        it('should return 1 when all heuristics match', () => {
            expect(calculateHeuristicCoverage(10, 10)).toBe(1);
        });

        it('should return 0.5 for neutral when no heuristics', () => {
            expect(calculateHeuristicCoverage(0, 0)).toBe(0.5);
        });

        it('should calculate ratio correctly', () => {
            expect(calculateHeuristicCoverage(3, 10)).toBe(0.3);
        });
    });

    describe('calculatePatternMatch', () => {
        it('should return high score for confident cluster match', () => {
            const score = calculatePatternMatch(0.8, 20);
            expect(score).toBeGreaterThan(0.8);
        });

        it('should return low score for null cluster', () => {
            expect(calculatePatternMatch(null, 0)).toBe(0.3);
        });
    });

    describe('calculateAnomalyScore', () => {
        it('should return 1 for non-anomalous', () => {
            expect(calculateAnomalyScore(false)).toBe(1);
        });

        it('should return lower score for anomalous', () => {
            expect(calculateAnomalyScore(true, 50)).toBe(0.5);
        });
    });

    describe('calculateConfidenceScore', () => {
        it('should return fast path for high confidence input', () => {
            const input: ConfidenceInput = {
                lastInteractionDate: new Date(),
                interactionCount: 100,
                heuristicsMatched: 5,
                totalHeuristics: 5,
                clusterConfidence: 0.9,
                similarCustomerCount: 30,
                isAnomalous: false,
            };

            const score = calculateConfidenceScore(input);

            expect(score.systemMode).toBe('fast');
            expect(score.score).toBeGreaterThan(0.6);
        });

        it('should return slow path for low confidence input', () => {
            const input: ConfidenceInput = {
                lastInteractionDate: undefined,
                interactionCount: 1,
                heuristicsMatched: 0,
                totalHeuristics: 10,
                clusterConfidence: null,
                similarCustomerCount: 0,
                isAnomalous: true,
                anomalyDeviation: 80,
            };

            const score = calculateConfidenceScore(input);

            expect(score.systemMode).toBe('slow');
            expect(score.score).toBeLessThan(0.6);
        });

        it('should include all factors in result', () => {
            const input: ConfidenceInput = {
                lastInteractionDate: new Date(),
                interactionCount: 50,
                heuristicsMatched: 3,
                totalHeuristics: 5,
                clusterConfidence: 0.7,
                similarCustomerCount: 10,
                isAnomalous: false,
            };

            const score = calculateConfidenceScore(input);

            expect(score.factors.dataRecency).toBeDefined();
            expect(score.factors.dataDensity).toBeDefined();
            expect(score.factors.heuristicCoverage).toBeDefined();
            expect(score.factors.patternMatch).toBeDefined();
            expect(score.factors.anomalyScore).toBeDefined();
        });
    });

    describe('shouldUseFastPath', () => {
        it('should return true for fast mode', () => {
            const score = { score: 0.8, systemMode: 'fast' as const, factors: {} as any };
            expect(shouldUseFastPath(score)).toBe(true);
        });

        it('should return false for slow mode', () => {
            const score = { score: 0.4, systemMode: 'slow' as const, factors: {} as any };
            expect(shouldUseFastPath(score)).toBe(false);
        });
    });

    describe('explainConfidence', () => {
        it('should explain low recency', () => {
            const score = {
                score: 0.4,
                systemMode: 'slow' as const,
                factors: {
                    dataRecency: 0.3,
                    dataDensity: 0.8,
                    heuristicCoverage: 0.8,
                    patternMatch: 0.8,
                    anomalyScore: 0.8,
                },
            };

            const explanation = explainConfidence(score);
            expect(explanation).toContain('stale');
        });

        it('should return positive message for high confidence', () => {
            const score = {
                score: 0.9,
                systemMode: 'fast' as const,
                factors: {
                    dataRecency: 0.9,
                    dataDensity: 0.9,
                    heuristicCoverage: 0.9,
                    patternMatch: 0.9,
                    anomalyScore: 0.9,
                },
            };

            const explanation = explainConfidence(score);
            expect(explanation).toContain('High confidence');
        });
    });
});
