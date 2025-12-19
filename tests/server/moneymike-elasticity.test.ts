
import { estimateElasticity, TransactionPoint, ElasticityResult } from '../../src/server/algorithms/moneymike-algo';

describe('Money Mike Elasticity Algorithms', () => {

    describe('estimateElasticity with sufficient data (model path)', () => {
        // Need 30+ data points to trigger model estimation
        const generateLinearData = (basePrice: number, baseQty: number, slope: number, count: number): TransactionPoint[] => {
            const data: TransactionPoint[] = [];
            for (let i = 0; i < count; i++) {
                const price = basePrice + i;
                const quantity = baseQty + slope * i;
                data.push({ price, quantity });
            }
            return data;
        };

        test('should return ElasticityResult object', () => {
            const data = generateLinearData(10, 100, -5, 35); // 35 points
            const result = estimateElasticity(data);

            expect(result).toHaveProperty('elasticity');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('is_elastic');
            expect(result).toHaveProperty('source');
            expect(result.source).toBe('model');
        });

        test('should detect negative elasticity (price up, quantity down)', () => {
            // Generate 35 points with negative slope (quantity decreases as price increases)
            const data = generateLinearData(10, 100, -2, 35);
            const result = estimateElasticity(data);

            expect(result.elasticity).toBeLessThan(0);
            expect(result.source).toBe('model');
        });

        test('should calculate confidence based on sample size', () => {
            const data = generateLinearData(10, 100, -2, 50);
            const result = estimateElasticity(data);

            expect(result.confidence).toBe(0.5); // 50/100 = 0.5
        });

        test('should cap confidence at 1.0', () => {
            const data = generateLinearData(10, 1000, -5, 150);
            const result = estimateElasticity(data);

            expect(result.confidence).toBe(1.0);
        });

        test('should detect elastic demand (|e| > 1)', () => {
            // Large quantity responses to price changes
            const data = generateLinearData(10, 500, -30, 35);
            const result = estimateElasticity(data);

            expect(result.is_elastic).toBe(Math.abs(result.elasticity) > 1.0);
        });
    });

    describe('estimateElasticity with insufficient data (prior path)', () => {
        test('should use prior for less than minDataPoints', () => {
            const data: TransactionPoint[] = [
                { price: 10, quantity: 100 },
                { price: 11, quantity: 90 }
            ];

            const result = estimateElasticity(data);

            expect(result.source).toBe('prior');
            expect(result.confidence).toBe(0.3);
        });

        test('should use category-specific prior when available', () => {
            const data: TransactionPoint[] = [
                { price: 10, quantity: 100, category: 'flower' }
            ];

            const result = estimateElasticity(data);

            expect(result.source).toBe('prior');
            // Prior elasticity returned, value depends on GlobalIntelligenceService
            expect(typeof result.elasticity).toBe('number');
        });

        test('should use default prior for empty category', () => {
            const data: TransactionPoint[] = [
                { price: 10, quantity: 100 }
            ];

            const result = estimateElasticity(data);

            expect(result.source).toBe('prior');
            expect(result.elasticity).toBe(-1); // Default prior is -1
        });

        test('should handle empty array with prior fallback', () => {
            const result = estimateElasticity([]);

            expect(result.source).toBe('prior');
            expect(result.confidence).toBe(0.3);
        });
    });

    describe('estimateElasticity edge cases', () => {
        test('should handle constant price (denominator = 0)', () => {
            // 35 points with same price
            const data: TransactionPoint[] = Array(35).fill(null).map((_, i) => ({
                price: 10,
                quantity: 100 + i
            }));

            const result = estimateElasticity(data);

            expect(result.elasticity).toBe(0);
            expect(result.confidence).toBe(0);
            expect(result.source).toBe('model');
        });

        test('should respect custom minDataPoints parameter', () => {
            const data: TransactionPoint[] = [
                { price: 10, quantity: 100 },
                { price: 11, quantity: 90 },
                { price: 12, quantity: 80 }
            ];

            // With minDataPoints = 2, should use model
            const result = estimateElasticity(data, 2);

            expect(result.source).toBe('model');
        });
    });
});
