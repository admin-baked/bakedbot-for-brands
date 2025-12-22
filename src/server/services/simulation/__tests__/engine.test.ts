/**
 * Unit tests for Simulation Engine
 */
import { generatePopulation, SeededRandom, getPopulationStats } from '../population';
import { simulateDay } from '../simulate-day';
import {
    SimInputs,
    SimProduct,
    SimScenario,
    SimAssumptions,
    SimProfile,
    SyntheticCustomer,
    SimIntervention,
    PriceChangeIntervention,
    PromotionIntervention
} from '@/types/simulation';
import { DISPENSARY_PROFILE } from '@/types/simulation-profiles';

// ==========================================
// Test Data Fixtures
// ==========================================

const MOCK_PRODUCTS: SimProduct[] = [
    { id: 'p1', name: 'Vape A', brandId: 'b1', category: 'vapes', price: 40, cogs: 20, inStock: true },
    { id: 'p2', name: 'Edible B', brandId: 'b2', category: 'edibles', price: 20, cogs: 10, inStock: true },
    { id: 'p3', name: 'Flower C', brandId: 'b1', category: 'flower', price: 50, cogs: 25, inStock: true },
];

const MOCK_SCENARIO: SimScenario = {
    id: 's1',
    tenantId: 't1',
    profile: 'DISPENSARY',
    name: 'Test Scenario',
    horizonDays: 30,
    interventions: [],
    assumptions: DISPENSARY_PROFILE.defaultAssumptions,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const MOCK_INPUTS: SimInputs = {
    tenantId: 't1',
    profile: 'DISPENSARY',
    scenario: MOCK_SCENARIO,
    products: MOCK_PRODUCTS,
    inventory: { 'p1': 100, 'p2': 100, 'p3': 100 },
    competitorSnapshots: [],
    historicalStats: {
        avgOrdersPerDay: 10,
        avgAov: 40,
        segmentMix: { new: 0.2, returning: 0.4, vip: 0.1, deal_seeker: 0.2, connoisseur: 0.1 },
        categoryMix: { vapes: 0.3, edibles: 0.3, flower: 0.4 },
    },
};

// ==========================================
// Tests
// ==========================================

describe('Simulation Engine', () => {

    describe('SeededRandom', () => {
        it('should be deterministic', () => {
            const rng1 = new SeededRandom(12345);
            const rng2 = new SeededRandom(12345);

            expect(rng1.next()).toBe(rng2.next());
            expect(rng1.next()).toBe(rng2.next());
            expect(rng1.next()).toBe(rng2.next());
        });

        it('should produce different sequences for different seeds', () => {
            const rng1 = new SeededRandom(12345);
            const rng2 = new SeededRandom(67890);

            expect(rng1.next()).not.toBe(rng2.next());
        });

        it('should generate consistent IDs', () => {
            const rng = new SeededRandom(123);
            const id1 = rng.generateId('test', 1);

            const rng2 = new SeededRandom(123);
            const id2 = rng2.generateId('test', 1);

            expect(id1).toBe(id2);
            expect(id1).toMatch(/^test_[0-9a-f]+$/);
        });
    });

    describe('Population Generator', () => {
        it('should generate requested number of customers', () => {
            const customers = generatePopulation(MOCK_INPUTS, 123, { size: 50 });
            expect(customers.length).toBe(50);
        });

        it('should generate deterministic population given same seed', () => {
            const run1 = generatePopulation(MOCK_INPUTS, 999, { size: 20 });
            const run2 = generatePopulation(MOCK_INPUTS, 999, { size: 20 });

            expect(run1).toEqual(run2);
            expect(run1[0].id).toBe(run2[0].id);
        });

        it('should respect segment distributions roughly', () => {
            // Large sample for statistical significance
            const customers = generatePopulation(MOCK_INPUTS, 123, { size: 1000 });
            const stats = getPopulationStats(customers);

            // Expected ~400 returning (0.4)
            const returningRatio = stats.segmentCounts.returning / 1000;
            expect(returningRatio).toBeGreaterThan(0.35);
            expect(returningRatio).toBeLessThan(0.45);
        });

        it('should assign valid price sensitivities', () => {
            const customers = generatePopulation(MOCK_INPUTS, 123, { size: 10 });
            customers.forEach(c => {
                expect(['low', 'mid', 'high']).toContain(c.priceSensitivity);
                expect(c.categoryAffinity).toBeDefined();
            });
        });
    });

    describe('Simulate Day', () => {
        let customers: SyntheticCustomer[];

        beforeAll(() => {
            customers = generatePopulation(MOCK_INPUTS, 123, { size: 50 });
        });

        it('should generate orders and summary', () => {
            const result = simulateDay(MOCK_INPUTS, customers, 123, {
                date: new Date('2025-06-01'),
                runId: 'run1',
                dayIndex: 0
            });

            expect(result.orders.length).toBeGreaterThan(0);
            expect(result.summary.netRevenue).toBeGreaterThan(0);
            expect(result.summary.orders).toBe(result.orders.length);
        });

        it('should be deterministic for same day/seed', () => {
            const config = { date: new Date('2025-06-01'), runId: 'run1', dayIndex: 0 };

            const result1 = simulateDay(MOCK_INPUTS, customers, 123, config);
            const result2 = simulateDay(MOCK_INPUTS, customers, 123, config);

            expect(result1.orders.length).toBe(result2.orders.length);
            expect(result1.summary.netRevenue).toBe(result2.summary.netRevenue);
            expect(result1.orders[0].orderId).toBe(result2.orders[0].orderId);
        });

        it('should apply price change interventions', () => {
            // Price drop on Vapes (-50%)
            const intervention: PriceChangeIntervention = {
                type: 'PriceChange',
                scope: { kind: 'category', category: 'vapes' },
                mode: 'percent',
                value: -50,
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            };

            const inputsWithIntervention = {
                ...MOCK_INPUTS,
                scenario: {
                    ...MOCK_SCENARIO,
                    interventions: [intervention]
                }
            };

            const result = simulateDay(inputsWithIntervention, customers, 123, {
                date: new Date('2025-06-01'),
                runId: 'run1',
                dayIndex: 0
            });

            // Check vapes are $20 instead of $40
            const vapeOrders = result.orders.flatMap(o => o.lineItems)
                .filter(li => li.category === 'vapes');

            if (vapeOrders.length > 0) {
                expect(vapeOrders[0].unitPrice).toBe(20);
            }
        });

        it('should apply promotion interventions', () => {
            // 10% Off Vapes
            const intervention: PromotionIntervention = {
                type: 'Promotion',
                promoType: '%off',
                eligibility: { categories: ['vapes'] },
                value: 10,
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            };

            const inputsWithPromo = {
                ...MOCK_INPUTS,
                scenario: {
                    ...MOCK_SCENARIO,
                    interventions: [intervention]
                }
            };

            const result = simulateDay(inputsWithPromo, customers, 123, {
                date: new Date('2025-06-01'),
                runId: 'run1',
                dayIndex: 0
            });

            // Check signals for vapes
            const vapeOrders = result.orders.filter(o =>
                o.lineItems.some(li => li.category === 'vapes')
            );

            if (vapeOrders.length > 0) {
                // Ensure at least some applied the promo
                const promoApplied = vapeOrders.some(o =>
                    o.signals.promoIdsApplied?.includes('promo_%off')
                );
                expect(promoApplied).toBe(true);
            }
        });

        it('should calculate gross margin correctly', () => {
            const result = simulateDay(MOCK_INPUTS, customers, 123, {
                date: new Date('2025-06-01'),
                runId: 'run1',
                dayIndex: 0
            });

            const summary = result.summary;
            if (summary.netRevenue > 0) {
                expect(summary.grossMargin).toBeDefined();
                expect(summary.grossMargin).toBeLessThan(summary.netRevenue);
            }
        });
    });
});
