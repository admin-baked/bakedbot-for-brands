export interface PricePoint {
    price: number;
    quantity: number;
}

/**
 * Estimates Price Elasticity of Demand (PED).
 * PED = % Change in Qty / % Change in Price
 * 
 * Uses simple Linear Regression to find slope (dQ/dP) over the dataset,
 * then multiplies by (Avg Price / Avg Qty) to get Elasticity.
 * 
 * Formula: E = (dQ/dP) * (P_bar / Q_bar)
 */
export function estimateElasticity(data: PricePoint[]): number {
    if (!data || data.length < 2) {
        throw new Error("Insufficient data to estimate elasticity (need at least 2 points)");
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
        // If Price constant, Elasticity is undefined (or 0/Inf depending on Q).
        // Let's return 0 to be safe (Inelastic).
        return 0;
    }

    const slope = numerator / denominator; // dQ / dP

    // 3. Convert Slope to Elasticity
    // E = Slope * (P / Q)
    const elasticity = slope * (avgP / avgQ);

    return elasticity;
}
