
import { computeSkuScore, CandidateSku, SkuScoreContext } from '@/server/algorithms/smokey-algo';
import { estimateElasticity, TransactionPoint } from '@/server/algorithms/moneymike-algo';
import { GlobalIntelligenceService } from '@/server/intelligence/global-priors';

// Mock dependencies if needed, but here we want to test the actual integration with priors
// We might mock GlobalIntelligenceService if we wanted to isolate it, but using the real one verifies the file read/data structure too
// ensuring priors.json is actually available and valid.

describe('Phase 3: Cross-Tenant Intuition', () => {

    describe('Global Intelligence Service', () => {
        it('should load effect priors correctly', () => {
            const sleepPriors = GlobalIntelligenceService.getEffectPriors('sleep');
            expect(sleepPriors.length).toBeGreaterThan(0);
            expect(sleepPriors.some(p => p.tag === 'indica')).toBe(true);
        });

        it('should return baseline elasticity for categories', () => {
            expect(GlobalIntelligenceService.getElasticityBaseline('flower')).toBe(-1.2);
            expect(GlobalIntelligenceService.getElasticityBaseline('edibles')).toBe(-0.5);
        });
    });

    describe('Smokey: Recommendation Priors', () => {
        it('should boost score for matching global prior even without direct user segment match', () => {
            const context: SkuScoreContext = {
                user_segments: ['new_user'],
                requested_effects: [],
                intent: 'sleep',
                tolerance_level: 'low'
            };

            const sku: CandidateSku = {
                id: '123',
                name: 'Dreamy Gummy',
                effects: [],
                tags: ['indica', 'edible'], // Matches 'sleep' prior (indica + edible)
                category: 'edibles',
                margin_pct: 50,
                inventory_level: 100,
                thc_mg_per_serving: 5,
                is_new: false
            };

            const result = computeSkuScore(sku, context);
            // Expect boost from Global Prior:
            // Sleep -> Indica (0.8) -> +0.4 boost
            // Sleep -> Edible (0.6) -> +0.3 boost
            // Total effect match should be significant
            expect(result.score).toBeGreaterThan(0.5);
        });
    });

    describe('Money Mike: Elasticity Priors', () => {
        it('should use prior for cold start (sparse data)', () => {
            const sparseData: TransactionPoint[] = [
                { price: 10, quantity: 1, category: 'flower' },
                { price: 12, quantity: 0, category: 'flower' }
            ];

            const result = estimateElasticity(sparseData);
            expect(result.source).toBe('prior');
            expect(result.elasticity).toBe(-1.2); // Flower baseline
            expect(result.confidence).toBe(0.3);
        });

        it('should use model for sufficient data', () => {
            const richData: TransactionPoint[] = [];
            for (let i = 0; i < 40; i++) {
                richData.push({
                    price: 10 + (Math.random() * 5),
                    quantity: 100 - (Math.random() * 20),
                    category: 'flower'
                });
            }

            const result = estimateElasticity(richData);
            expect(result.source).toBe('model');
            // Confidence should be based on sample size (40/100 = 0.4)
            expect(result.confidence).toBeCloseTo(0.4, 1);
        });
    });
});
