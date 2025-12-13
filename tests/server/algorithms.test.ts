import { computeSkuScore } from '@/server/algorithms/smokey-algo';
import { calculateCampaignPriority } from '@/server/algorithms/craig-algo';
import { calculateGapScore } from '@/server/algorithms/ezal-algo';
import { detectAnomaly } from '@/server/algorithms/pops-algo';

describe('Agent Algorithms Phase 1', () => {

    describe('Smokey - SKU Scoring', () => {
        const context = {
            user_segments: ['new_consumer'],
            requested_effects: ['sleep'],
            tolerance_level: 'low' as const
        };
        const config = {
            weights: { effect_match: 0.5, margin: 0.3, availability: 0.1, risk: 0.5 },
            risk_params: { new_user_max_dose_mg: 10 }
        };

        test('should score perfect match highly', () => {
            const result = computeSkuScore({
                id: 'good_sku',
                name: 'Good SKU',
                effects: ['sleep'],
                margin_pct: 40,
                inventory_level: 50,
                thc_mg_per_serving: 5,
                is_new: false
            }, context, config);

            // 0.5*1.0 + 0.3*0.8 + 0.1*1.0 - 0.5*0 = 0.5 + 0.24 + 0.1 = 0.84
            expect(result.score).toBeCloseTo(0.84, 1);
        });

        test('should penalize high dose for low tolerance', () => {
            const result = computeSkuScore({
                id: 'risky_sku',
                name: 'Risky SKU',
                effects: ['sleep'],
                margin_pct: 40,
                inventory_level: 50,
                thc_mg_per_serving: 50, // High dose
                is_new: false
            }, context, config);

            // Risk penalty should be applied
            expect(result.explanations).toContain('Risk: Dosage too high for low tolerance.');
            expect(result.score).toBeLessThan(0.5);
        });
    });

    describe('Craig - Campaign Priority', () => {
        test('should prioritize urgent high impact campaigns', () => {
            const score = calculateCampaignPriority({
                id: 'c1',
                objective: 'test',
                impact_score: 10,
                urgency_score: 10,
                fatigue_score: 0,
                status: 'queued'
            });
            // (10 * 10) / 1 = 100
            expect(score).toBe(100);
        });

        test('should deprioritize fatigued segments', () => {
            const score = calculateCampaignPriority({
                id: 'c2',
                objective: 'test',
                impact_score: 10,
                urgency_score: 10,
                fatigue_score: 9 // High fatigue
            });
            // (10 * 10) / 10 = 10
            expect(score).toBe(10);
        });
    });

    describe('Ezal - Gap Scoring', () => {
        test('should calculate gap score', () => {
            const score = calculateGapScore({
                missing_price_tiers: 1,
                missing_forms: 1,
                underrepresented_effects: 0
            });
            // 1*10 + 1*5 = 15
            expect(score).toBe(15);
        });
    });

    describe('Pops - Anomaly Detection', () => {
        test('should detect anomaly', () => {
            const history = [10, 10, 10, 10, 10]; // Mean 10, StdDev 0
            // Current 20 is huge deviation
            // Note: stddev 0 implementation might assume min 1 divisor
            expect(detectAnomaly(20, history)).toBe(true);
        });

        test('should ignore normal variance', () => {
            const history = [10, 12, 8, 11, 9];
            expect(detectAnomaly(11, history)).toBe(false);
        });
    });

});
