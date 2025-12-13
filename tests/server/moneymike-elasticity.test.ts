
import { estimateElasticity, PricePoint } from '../../src/server/algorithms/moneymike-algo';

describe('Money Mike Elasticity Algorithms', () => {

    test('estimateElasticity should detect unitary elasticity (-1.0)', () => {
        // Price goes up 10%, Quantity goes down 10%
        // P: 10 -> 11 (+10%)
        // Q: 100 -> 90 (-10%)
        const data: PricePoint[] = [
            { price: 10, quantity: 100 },
            { price: 11, quantity: 90 }
        ];

        // Midpoint formula or log-log regression is ideal, but let's see what the algo gives.
        // Approx -1.1
        const e = estimateElasticity(data);
        expect(e).toBeLessThan(-0.9);
        expect(e).toBeGreaterThan(-1.2);
    });

    test('estimateElasticity should detect inelastic demand (> -1.0)', () => {
        // Price goes up, Quantity stays almost same
        // P: 10 -> 20 (+100%)
        // Q: 100 -> 95 (-5%)
        const data: PricePoint[] = [
            { price: 10, quantity: 100 },
            { price: 20, quantity: 95 }
        ];

        const e = estimateElasticity(data);
        // Should be close to 0 (very inelastic)
        expect(e).toBeGreaterThan(-0.2); // -0.05 / 1.0 = -0.05
    });

    test('estimateElasticity should handle noisy data using regression', () => {
        const data: PricePoint[] = [
            { price: 10, quantity: 100 },
            { price: 12, quantity: 90 },
            { price: 14, quantity: 80 }, // Linear drop
            { price: 15, quantity: 70 }  // Steeper drop
        ];

        const e = estimateElasticity(data);
        // Trend is downward.
        expect(e).toBeLessThan(0);
    });

    test('throws on insufficient data', () => {
        expect(() => estimateElasticity([])).toThrow();
        expect(() => estimateElasticity([{ price: 10, quantity: 10 }])).toThrow();
    });
});
