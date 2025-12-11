/**
 * Pops Anomaly Detection Algorithm
 * 
 * Detects anomalies in metrics using baseline comparison.
 * Phase 1: Simple threshold-based detection
 * Phase 2: Will add EWMA baselines and forecast-based detection
 */

import { AnomalyResult } from './schema';

// --- Types ---

export interface MetricDataPoint {
    timestamp: string;
    value: number;
}

export interface AnomalyConfig {
    deviation_threshold_pct: number; // e.g., 20 = 20% deviation triggers alert
    min_data_points: number; // Minimum history needed
    ewma_alpha: number; // Smoothing factor (0-1)
}

// --- Default Config ---

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
    deviation_threshold_pct: 25,
    min_data_points: 7,
    ewma_alpha: 0.3,
};

// --- Core Functions ---

/**
 * Computes EWMA (Exponentially Weighted Moving Average) baseline.
 */
export function computeEWMA(values: number[], alpha: number = 0.3): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let ewma = values[0];
    for (let i = 1; i < values.length; i++) {
        ewma = alpha * values[i] + (1 - alpha) * ewma;
    }

    return ewma;
}

/**
 * Detects if a metric value is anomalous relative to baseline.
 */
export function detectAnomaly(
    currentValue: number,
    historicalValues: number[],
    config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): AnomalyResult {
    // Need minimum history
    if (historicalValues.length < config.min_data_points) {
        return {
            is_anomaly: false,
            deviation_pct: 0,
            direction: 'stable',
            baseline_value: currentValue,
            current_value: currentValue,
            threshold_used: config.deviation_threshold_pct,
        };
    }

    // Compute baseline using EWMA
    const baseline = computeEWMA(historicalValues, config.ewma_alpha);

    // Avoid division by zero
    if (baseline === 0) {
        return {
            is_anomaly: currentValue !== 0,
            deviation_pct: currentValue !== 0 ? 100 : 0,
            direction: currentValue > 0 ? 'up' : 'stable',
            baseline_value: 0,
            current_value: currentValue,
            threshold_used: config.deviation_threshold_pct,
        };
    }

    // Calculate deviation
    const deviation = ((currentValue - baseline) / baseline) * 100;
    const absDeviation = Math.abs(deviation);

    // Determine direction
    let direction: AnomalyResult['direction'] = 'stable';
    if (deviation > 5) direction = 'up';
    if (deviation < -5) direction = 'down';

    // Check threshold
    const isAnomaly = absDeviation > config.deviation_threshold_pct;

    return {
        is_anomaly: isAnomaly,
        deviation_pct: Math.round(deviation * 100) / 100,
        direction,
        baseline_value: Math.round(baseline * 100) / 100,
        current_value: currentValue,
        threshold_used: config.deviation_threshold_pct,
    };
}

/**
 * Analyzes multiple metrics and returns anomalies.
 */
export function analyzeMetrics(
    metrics: Array<{
        name: string;
        current: number;
        history: number[];
    }>,
    config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Array<{ name: string; result: AnomalyResult }> {
    return metrics.map(metric => ({
        name: metric.name,
        result: detectAnomaly(metric.current, metric.history, config),
    }));
}

/**
 * Filters to only anomalous metrics.
 */
export function getAnomalies(
    metrics: Array<{
        name: string;
        current: number;
        history: number[];
    }>,
    config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Array<{ name: string; result: AnomalyResult }> {
    return analyzeMetrics(metrics, config).filter(m => m.result.is_anomaly);
}

// --- Experiment Analytics (Phase 1 - Simple) ---

export interface ExperimentStats {
    lift_pct: number;
    p_value: number;
    is_significant: boolean;
    sample_size_control: number;
    sample_size_treatment: number;
    status: 'running' | 'validated' | 'needs_more_data' | 'invalidated';
}

/**
 * Simple lift calculation for A/B experiments.
 * Phase 2 will add proper statistical tests.
 */
export function computeExperimentLift(
    controlConversions: number,
    controlSamples: number,
    treatmentConversions: number,
    treatmentSamples: number,
    minSampleSize: number = 100
): ExperimentStats {
    // Check sample size
    if (controlSamples < minSampleSize || treatmentSamples < minSampleSize) {
        return {
            lift_pct: 0,
            p_value: 1,
            is_significant: false,
            sample_size_control: controlSamples,
            sample_size_treatment: treatmentSamples,
            status: 'needs_more_data',
        };
    }

    const controlRate = controlConversions / controlSamples;
    const treatmentRate = treatmentConversions / treatmentSamples;

    // Avoid division by zero
    if (controlRate === 0) {
        return {
            lift_pct: treatmentRate > 0 ? 100 : 0,
            p_value: 0.5, // Undefined without proper test
            is_significant: false,
            sample_size_control: controlSamples,
            sample_size_treatment: treatmentSamples,
            status: 'running',
        };
    }

    const lift = ((treatmentRate - controlRate) / controlRate) * 100;

    // Simple significance check (placeholder - Phase 2 will use proper z-test)
    // This is a very rough heuristic
    const pooledRate = (controlConversions + treatmentConversions) / (controlSamples + treatmentSamples);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlSamples + 1 / treatmentSamples));
    const z = se > 0 ? (treatmentRate - controlRate) / se : 0;

    // Approximate p-value (very rough)
    const pValue = Math.max(0.001, Math.min(1, 2 * (1 - normalCDF(Math.abs(z)))));
    const isSignificant = pValue < 0.05;

    return {
        lift_pct: Math.round(lift * 100) / 100,
        p_value: Math.round(pValue * 1000) / 1000,
        is_significant: isSignificant,
        sample_size_control: controlSamples,
        sample_size_treatment: treatmentSamples,
        status: isSignificant ? 'validated' : 'running',
    };
}

// --- Helpers ---

function normalCDF(z: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
}
