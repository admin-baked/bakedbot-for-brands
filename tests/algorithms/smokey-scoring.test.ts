/**
 * Unit Tests: Smokey Scoring Algorithm
 */

import {
    computeSkuScore,
    rankSkus,
    UserContext,
    SkuData,
    DEFAULT_BRAND_CONFIG
} from '@/server/algorithms/smokey-scoring';

describe('Smokey Scoring Algorithm', () => {
    const mockUserContext: UserContext = {
        intent: 'relaxation',
        tolerance_level: 'medium',
        preferred_effects: ['calm'],
        price_preference: 'mid',
        is_new_user: false,
    };

    const mockSkus: SkuData[] = [
        {
            sku_id: 'sku_1',
            name: 'Chill Gummies',
            category: 'edibles',
            effects: ['relaxing', 'calm', 'mellow'],
            thc_pct: 15,
            cbd_pct: 5,
            price: 25,
            margin_pct: 40,
            inventory_depth: 50,
            is_promoted: true,
            form_factor: 'edible',
        },
        {
            sku_id: 'sku_2',
            name: 'Energy Sativa',
            category: 'flower',
            effects: ['energetic', 'uplifting', 'focused'],
            thc_pct: 22,
            cbd_pct: 0,
            price: 35,
            margin_pct: 30,
            inventory_depth: 20,
            is_promoted: false,
            form_factor: 'flower',
        },
        {
            sku_id: 'sku_3',
            name: 'Super Concentrate',
            category: 'concentrate',
            effects: ['intense', 'relaxing'],
            thc_pct: 80,
            cbd_pct: 0,
            price: 60,
            margin_pct: 50,
            inventory_depth: 10,
            is_promoted: false,
            form_factor: 'concentrate',
        },
    ];

    describe('computeSkuScore', () => {
        it('should return a score between 0 and 1', () => {
            const { score } = computeSkuScore(mockUserContext, mockSkus[0]);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });

        it('should score effect-matching SKUs higher', () => {
            // Chill Gummies matches "relaxation" intent
            const { score: relaxScore } = computeSkuScore(mockUserContext, mockSkus[0]);
            // Energy Sativa does NOT match "relaxation"
            const { score: energyScore } = computeSkuScore(mockUserContext, mockSkus[1]);

            expect(relaxScore).toBeGreaterThan(energyScore);
        });

        it('should penalize high-THC SKUs for new users', () => {
            const newUserContext: UserContext = {
                ...mockUserContext,
                is_new_user: true,
                tolerance_level: 'low',
            };

            // High THC concentrate should be penalized
            const { score: concentrateScore } = computeSkuScore(newUserContext, mockSkus[2]);
            // Lower THC gummy should score higher
            const { score: gummyScore } = computeSkuScore(newUserContext, mockSkus[0]);

            expect(gummyScore).toBeGreaterThan(concentrateScore);
        });

        it('should include score breakdown', () => {
            const result = computeSkuScore(mockUserContext, mockSkus[0]);

            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.effect_match).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.chemotype_match).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.business_score).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.risk_penalty).toBeGreaterThanOrEqual(0);
        });
    });

    describe('rankSkus', () => {
        it('should return top K SKUs sorted by score', () => {
            const ranked = rankSkus(mockUserContext, mockSkus, DEFAULT_BRAND_CONFIG, 2);

            expect(ranked).toHaveLength(2);
            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
            expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
        });

        it('should assign correct ranks', () => {
            const ranked = rankSkus(mockUserContext, mockSkus, DEFAULT_BRAND_CONFIG, 3);

            expect(ranked[0].rank).toBe(1);
            expect(ranked[1].rank).toBe(2);
            expect(ranked[2].rank).toBe(3);
        });

        it('should include SKU details in results', () => {
            const ranked = rankSkus(mockUserContext, mockSkus, DEFAULT_BRAND_CONFIG, 1);

            expect(ranked[0].sku_id).toBeDefined();
            expect(ranked[0].name).toBeDefined();
            expect(ranked[0].score_breakdown).toBeDefined();
        });
    });
});
