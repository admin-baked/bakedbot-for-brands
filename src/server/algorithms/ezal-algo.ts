export interface MarketGapCandidate {
    missing_price_tiers: number; // count
    missing_forms: number;       // count
    underrepresented_effects: number; // count
}

/**
 * Computes a score representing the magnitude of a competitive gap.
 * A higher score means a more significant gap (opportunity).
 */
export function calculateGapScore(inputs: MarketGapCandidate): number {
    // Weighted sum of missing elements
    const w_price = 10;
    const w_form = 5;
    const w_effect = 2;

    return (
        (inputs.missing_price_tiers * w_price) +
        (inputs.missing_forms * w_form) +
        (inputs.underrepresented_effects * w_effect)
    );
}
