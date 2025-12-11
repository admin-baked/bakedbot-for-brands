/**
 * Unit Tests: Pops Anomaly Detection Algorithm
 */

import {
    computeEWMA,
    detectAnomaly,
    analyzeMetrics,
    getAnomalies,
    computeExperimentLift,
    DEFAULT_ANOMALY_CONFIG
} from '@/server/algorithms/pops-anomaly';

describe('Pops Anomaly Detection Algorithm', () => {
    describe('computeEWMA', () => {
        it('should return the value for single-element array', () => {
            expect(computeEWMA([100])).toBe(100);
        });

        it('should weight recent values more heavily', () => {
            const values = [100, 100, 100, 200]; // Spike at end
            const ewma = computeEWMA(values, 0.5);

            // Should be between 100 and 200, closer to 200
            expect(ewma).toBeGreaterThan(100);
            expect(ewma).toBeLessThan(200);
        });

        it('should return 0 for empty array', () => {
            expect(computeEWMA([])).toBe(0);
        });
    });

    describe('detectAnomaly', () => {
        const history = [100, 102, 98, 101, 99, 100, 103]; // Stable around 100

        it('should detect upward anomaly', () => {
            const result = detectAnomaly(150, history, DEFAULT_ANOMALY_CONFIG);

            expect(result.is_anomaly).toBe(true);
            expect(result.direction).toBe('up');
            expect(result.deviation_pct).toBeGreaterThan(0);
        });

        it('should detect downward anomaly', () => {
            const result = detectAnomaly(50, history, DEFAULT_ANOMALY_CONFIG);

            expect(result.is_anomaly).toBe(true);
            expect(result.direction).toBe('down');
            expect(result.deviation_pct).toBeLessThan(0);
        });

        it('should NOT flag normal values', () => {
            const result = detectAnomaly(105, history, DEFAULT_ANOMALY_CONFIG);

            expect(result.is_anomaly).toBe(false);
        });

        it('should require minimum data points', () => {
            const shortHistory = [100, 101]; // Less than min
            const result = detectAnomaly(200, shortHistory, DEFAULT_ANOMALY_CONFIG);

            expect(result.is_anomaly).toBe(false);
        });

        it('should include baseline and current values', () => {
            const result = detectAnomaly(150, history);

            expect(result.baseline_value).toBeDefined();
            expect(result.current_value).toBe(150);
            expect(result.threshold_used).toBe(DEFAULT_ANOMALY_CONFIG.deviation_threshold_pct);
        });
    });

    describe('analyzeMetrics', () => {
        it('should analyze multiple metrics', () => {
            const metrics = [
                { name: 'orders', current: 100, history: [90, 95, 92, 98, 100, 95, 97] },
                { name: 'revenue', current: 5000, history: [4800, 4900, 5100, 4950, 5000, 5050, 4900] },
            ];

            const results = analyzeMetrics(metrics);

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('orders');
            expect(results[1].name).toBe('revenue');
        });
    });

    describe('getAnomalies', () => {
        it('should filter to only anomalous metrics', () => {
            const metrics = [
                { name: 'normal_metric', current: 100, history: [98, 99, 100, 101, 102, 100, 99] },
                { name: 'anomaly_metric', current: 200, history: [100, 100, 100, 100, 100, 100, 100] },
            ];

            const anomalies = getAnomalies(metrics);

            expect(anomalies).toHaveLength(1);
            expect(anomalies[0].name).toBe('anomaly_metric');
        });
    });

    describe('computeExperimentLift', () => {
        it('should compute lift percentage', () => {
            // Control: 100/1000 = 10% conversion
            // Treatment: 120/1000 = 12% conversion
            // Lift = (12 - 10) / 10 = 20%
            const result = computeExperimentLift(100, 1000, 120, 1000);

            expect(result.lift_pct).toBeCloseTo(20, 0);
        });

        it('should require minimum sample size', () => {
            const result = computeExperimentLift(10, 50, 12, 50, 100);

            expect(result.status).toBe('needs_more_data');
        });

        it('should detect significance for large effects', () => {
            // Very large effect with sufficient samples
            const result = computeExperimentLift(50, 1000, 100, 1000);

            expect(result.lift_pct).toBe(100);
            expect(result.is_significant).toBe(true);
            expect(result.status).toBe('validated');
        });

        it('should include sample sizes in result', () => {
            const result = computeExperimentLift(100, 1000, 120, 1000);

            expect(result.sample_size_control).toBe(1000);
            expect(result.sample_size_treatment).toBe(1000);
        });
    });
});
