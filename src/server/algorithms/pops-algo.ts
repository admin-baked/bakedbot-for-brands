/**
 * Computes a simple baseline demand forecast using Moving Average.
 * Phase 1 Implementation.
 */
export function forecastDemandBaseline(historicalSales: number[], horizonDays: number): number[] {
    if (historicalSales.length === 0) return Array(horizonDays).fill(0);

    // simple average of last 7 days (or less if not available)
    const window = 7;
    const recent = historicalSales.slice(-window);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Return flat line forecast for horizon
    return Array(horizonDays).fill(avg);
}

/**
 * Detects anomalies if current value deviates significantly from baseline.
 */
export function detectAnomaly(currentValue: number, historicalValues: number[], thresholdStdDev: number = 2): boolean {
    if (historicalValues.length < 5) return false;

    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const variance = historicalValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs(currentValue - mean) / (stdDev || 1); // avoid div by zero

    return zScore > thresholdStdDev;
}
