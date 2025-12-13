import { GlobalIntelligenceService } from '../intelligence/global-priors';

export interface TransactionPoint {
    price: number;
    quantity: number;
    category?: string; // Phase 3: Needed for Prior lookup
}

export interface ElasticityResult {
    elasticity: number;
    confidence: number;
    is_elastic: boolean;
    source: 'model' | 'prior';
}

/**
 * Estimates price elasticity of demand.
 * Phase 3: Uses Global Priors for cold start/sparse data.
 */
export function estimateElasticity(data: TransactionPoint[], minDataPoints = 30): ElasticityResult {
    // 1. Cold Start Check
    if (data.length < minDataPoints) {
        // Try to find category from available data or default
        const category = data.find(d => d.category)?.category || 'default';
        const prior = GlobalIntelligenceService.getElasticityBaseline(category);

        return {
            elasticity: prior,
            confidence: 0.3, // Low confidence in generic prior
            is_elastic: Math.abs(prior) > 1.0,
            source: 'prior'
        };
    }

    // If we have enough data points, proceed with model estimation
    if (!data || data.length < 2) {
        throw new Error("Insufficient data to estimate elasticity (need at least 2 points for model)");
    }

    // 1. Calculate Averages (Means)
    let sumP = 0;
    let sumQ = 0;
    for (const p of data) {
        sumP += p.price;
        sumQ += p.quantity;
    }
    const avgP = sumP / data.length;
    const avgQ = sumQ / data.length;

    // 2. Linear Regression (Least Squares) to find Slope (dQ/dP)
    // We treat Price as X (Independent), Quantity as Y (Dependent)
    // slope (b) = Sum((x - x_bar)(y - y_bar)) / Sum((x - x_bar)^2)

    let numerator = 0;
    let denominator = 0;

    for (const p of data) {
        const xDiff = p.price - avgP;
        const yDiff = p.quantity - avgQ;

        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
    }

    if (denominator === 0) {
        // Vertical line (Price didn't change but Quantity did? Or single point duplicated?)
        // Inelastic fallback
        return {
            elasticity: 0,
            confidence: 0,
            is_elastic: false,
            source: 'model'
        };
    }

    const slope = numerator / denominator; // dQ / dP

    // 3. Convert Slope to Elasticity
    // E = Slope * (P / Q)
    const elasticity = slope * (avgP / avgQ);

    return {
        elasticity,
        confidence: Math.min(data.length / 100, 1.0), // Simple confidence based on sample size
        is_elastic: Math.abs(elasticity) > 1.0,
        source: 'model'
    };
}
