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

export interface DailySales {
    date: string; // YYYY-MM-DD
    quantity: number;
}

/**
 * Forecasts demand looking at Day-Of-Week seasonality.
 * @param history Historical daily sales data
 * @param horizonDays Number of days to forecast
 * @returns Array of forecasted quantities
 */
export function forecastDemandSeasonality(history: DailySales[], horizonDays: number): number[] {
    if (!history || history.length === 0) {
        return Array(horizonDays).fill(0);
    }

    // 1. Group by Day of Week (0=Sun, 6=Sat)
    const dowSums: { [key: number]: number } = {};
    const dowCounts: { [key: number]: number } = {};

    for (const entry of history) {
        const d = new Date(entry.date);
        const dow = d.getDay(); // 0-6
        dowSums[dow] = (dowSums[dow] || 0) + entry.quantity;
        dowCounts[dow] = (dowCounts[dow] || 0) + 1;
    }

    // 2. Calculate Averages
    const dowAvgs: { [key: number]: number } = {};
    for (let i = 0; i < 7; i++) {
        if (dowCounts[i]) {
            dowAvgs[i] = dowSums[i] / dowCounts[i];
        } else {
            // Fallback: Global Average?
            const totalSum = history.reduce((sum, item) => sum + item.quantity, 0);
            dowAvgs[i] = totalSum / history.length;
        }
    }

    // 3. Forecast Horizon
    // Start from day AFTER last history date
    const lastDate = new Date(history[history.length - 1].date);
    const forecast: number[] = [];

    for (let i = 1; i <= horizonDays; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        const dow = nextDate.getDay();
        forecast.push(Math.round(dowAvgs[dow] || 0));
    }

    return forecast;
}

// --- Phase 4: Experiment Analytics ---

export interface ExperimentStats {
    conversionMetrics: {
        control: { visitors: number; conventions: number; rate: number };
        treatment: { visitors: number; conventions: number; rate: number };
    };
    lift: number; // Percentage lift (e.g. 0.15 for 15%)
    confidence: number; // 0.0 - 1.0 (e.g. 0.95)
    isSignificant: boolean; // true if confidence > 0.95
}

/**
 * Analyzes A/B test results using a simple Z-test for proportions.
 */
export function analyzeExperiment(
    control: { visitors: number; conversions: number },
    treatment: { visitors: number; conversions: number }
): ExperimentStats {
    const p1 = control.conversions / control.visitors;
    const p2 = treatment.conversions / treatment.visitors;

    // Lift: (p2 - p1) / p1
    const lift = p1 === 0 ? 0 : (p2 - p1) / p1;

    // Standard Error
    // SE = sqrt( p_pool * (1 - p_pool) * (1/n1 + 1/n2) )
    const pPool = (control.conversions + treatment.conversions) / (control.visitors + treatment.visitors);
    const se = Math.sqrt(pPool * (1 - pPool) * ((1 / control.visitors) + (1 / treatment.visitors)));

    // Z-Score
    const z = Math.abs(p1 - p2) / se;

    // Convert Z to Confidence (approximate one-tailed or two-tailed)
    // For 95% confidence (two-tailed), Z > 1.96
    // Cumulative normal distribution function approximation could be used, 
    // but distinct threshold is fine for MVP.
    const isSignificant = z > 1.96;

    // Rough confidence approximation from Z
    // Z=1.64 -> 90%, Z=1.96 -> 95%, Z=2.58 -> 99%
    let confidence = 0.5; // baseline
    if (z > 2.58) confidence = 0.99;
    else if (z > 1.96) confidence = 0.95;
    else if (z > 1.64) confidence = 0.90;
    else confidence = 0.5 + (z / 4); // simplistic linear scaling for lower values

    return {
        conversionMetrics: {
            control: { visitors: control.visitors, conventions: control.conversions, rate: p1 },
            treatment: { visitors: treatment.visitors, conventions: treatment.conversions, rate: p2 }
        },
        lift,
        confidence,
        isSignificant
    };
}
