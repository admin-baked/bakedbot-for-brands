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
