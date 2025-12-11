/**
 * Unit Tests: Global Priors & Intuition Engine
 */

import {
    getEffectPrior,
    getGlobalWeights,
    getWarmStartWeights,
    generateCrossTenantInsights,
    initializeGlobalPriors,
} from '@/server/algorithms/global-priors';

import {
    getBrandIntuition,
    getBlendedWeights,
    recordInteraction,
    getIntuitionSummary,
    getAgentIntuition,
    getGlobalLearningStats,
} from '@/server/algorithms/intuition-engine';

describe('Global Priors', () => {
    beforeAll(() => {
        initializeGlobalPriors();
    });

    describe('getEffectPrior', () => {
        it('should return patterns for known effects', () => {
            const sleepPrior = getEffectPrior('sleep');

            expect(sleepPrior).toBeDefined();
            expect(sleepPrior['form:gummy']).toBeGreaterThan(0);
        });

        it('should return empty object for unknown effects', () => {
            const unknownPrior = getEffectPrior('unknown_effect_xyz');

            expect(Object.keys(unknownPrior).length).toBe(0);
        });

        it('should handle case insensitivity', () => {
            const prior1 = getEffectPrior('Sleep');
            const prior2 = getEffectPrior('SLEEP');

            expect(prior1).toEqual(prior2);
        });
    });

    describe('getGlobalWeights', () => {
        it('should return valid scoring weights', () => {
            const weights = getGlobalWeights();

            expect(weights.effect_match).toBeGreaterThan(0);
            expect(weights.chemotype_match).toBeGreaterThan(0);
            expect(weights.business_score).toBeGreaterThan(0);
            expect(weights.risk_penalty).toBeGreaterThan(0);
        });

        it('should include confidence score', () => {
            const weights = getGlobalWeights();

            expect(weights.confidence).toBeGreaterThanOrEqual(0);
            expect(weights.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('getWarmStartWeights', () => {
        it('should return weights for new brands', () => {
            const weights = getWarmStartWeights();

            expect(weights.effect_match).toBeDefined();
            expect(weights.chemotype_match).toBeDefined();
        });
    });

    describe('generateCrossTenantInsights', () => {
        it('should generate insights', () => {
            const insights = generateCrossTenantInsights();

            expect(Array.isArray(insights)).toBe(true);
            expect(insights.length).toBeGreaterThan(0);
        });

        it('should include effect-based insights', () => {
            const insights = generateCrossTenantInsights();
            const effectInsight = insights.find(i => i.insight_id.includes('effect'));

            expect(effectInsight).toBeDefined();
            expect(effectInsight?.insight_type).toBe('recommendation');
        });
    });
});

describe('Intuition Engine', () => {
    const testBrandId = 'test_brand_' + Date.now();

    describe('getBrandIntuition', () => {
        it('should create cold-start intuition for new brands', () => {
            const intuition = getBrandIntuition(testBrandId);

            expect(intuition.brand_id).toBe(testBrandId);
            expect(intuition.learning_stage).toBe('cold_start');
            expect(intuition.global_influence).toBeGreaterThan(0.5);
        });

        it('should return same intuition on subsequent calls', () => {
            const intuition1 = getBrandIntuition(testBrandId);
            const intuition2 = getBrandIntuition(testBrandId);

            expect(intuition1.brand_id).toBe(intuition2.brand_id);
        });
    });

    describe('getBlendedWeights', () => {
        it('should return blended weights', () => {
            const weights = getBlendedWeights(testBrandId);

            expect(weights.effect_match).toBeGreaterThan(0);
            expect(weights.effect_match).toBeLessThanOrEqual(1);
        });
    });

    describe('recordInteraction', () => {
        it('should increment interaction count', () => {
            const brandId = 'interaction_test_' + Date.now();
            const before = getBrandIntuition(brandId).total_interactions;

            recordInteraction(brandId, 'recommendation', true);

            const after = getBrandIntuition(brandId).total_interactions;
            expect(after).toBe(before + 1);
        });

        it('should transition learning stages', () => {
            const brandId = 'stage_test_' + Date.now();

            // Simulate many interactions
            for (let i = 0; i < 60; i++) {
                recordInteraction(brandId, 'recommendation', true);
            }

            const intuition = getBrandIntuition(brandId);
            expect(intuition.learning_stage).toBe('warming');
        });
    });

    describe('getIntuitionSummary', () => {
        it('should return summary with all fields', () => {
            const summary = getIntuitionSummary(testBrandId);

            expect(summary.stage).toBeDefined();
            expect(summary.confidence).toBeGreaterThan(0);
            expect(summary.global_blend).toBeGreaterThan(0);
            expect(typeof summary.interactions).toBe('number');
        });
    });

    describe('getAgentIntuition', () => {
        it('should return intuition for smokey agent', () => {
            const result = getAgentIntuition(testBrandId, {
                agent: 'smokey',
                action: 'recommend',
                params: { intent: 'sleep' },
            });

            expect(result.weights).toBeDefined();
            expect(result.boosts).toBeDefined();
            expect(result.learning_stage).toBeDefined();
        });

        it('should provide effect boosts when intent specified', () => {
            const result = getAgentIntuition(testBrandId, {
                agent: 'smokey',
                action: 'recommend',
                params: { intent: 'energy' },
            });

            expect(Object.keys(result.boosts).length).toBeGreaterThan(0);
        });
    });

    describe('getGlobalLearningStats', () => {
        it('should return learning statistics', () => {
            const stats = getGlobalLearningStats();

            expect(stats.total_brands).toBeGreaterThanOrEqual(0);
            expect(stats.brands_by_stage).toBeDefined();
            expect(typeof stats.total_interactions).toBe('number');
        });
    });
});
