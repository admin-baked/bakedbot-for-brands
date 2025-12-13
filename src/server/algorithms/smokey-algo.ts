export interface SkuScoreContext {
    user_segments: string[];
    requested_effects: string[]; // e.g., ['sleep', 'pain']
    tolerance_level: 'low' | 'med' | 'high';
}

export interface CandidateSku {
    id: string;
    name: string;
    effects: string[]; // e.g. ['sleep', 'relax']
    margin_pct: number; // 0-100
    inventory_level: number;
    thc_mg_per_serving: number;
    is_new: boolean;
}

export interface BrandConfig {
    weights: {
        effect_match: number;
        margin: number;
        availability: number;
        risk: number;
    };
    risk_params: {
        new_user_max_dose_mg: number;
    };
}

const DEFAULT_CONFIG: BrandConfig = {
    weights: {
        effect_match: 0.5,
        margin: 0.3,
        availability: 0.1,
        risk: 0.5 // Penalty weight
    },
    risk_params: {
        new_user_max_dose_mg: 10
    }
};

/**
 * Computes a score for a SKU based on user context and business rules.
 * Formula: score = w1*effect + w2*margin + w3*availability - w4*risk
 */
export function computeSkuScore(
    sku: CandidateSku,
    context: SkuScoreContext,
    config: BrandConfig = DEFAULT_CONFIG
): { score: number; explanations: string[] } {
    const { weights } = config;
    const explanations: string[] = [];

    // 1. Effect Match (0.0 - 1.0)
    // Simple Jaccard index or overlap for now
    const intersection = sku.effects.filter(e => context.requested_effects.includes(e));
    let effectScore = 0;
    if (context.requested_effects.length > 0) {
        effectScore = intersection.length / context.requested_effects.length;
    } else {
        // If no specific effects requested, neutral score
        effectScore = 0.5;
    }

    if (effectScore > 0.8) explanations.push('Perfect match for requested effects.');

    // 2. Margin Score (0.0 - 1.0)
    // Normalize margin: assume 50% is max "good", 20% is low
    const marginScore = Math.min(Math.max(sku.margin_pct / 50, 0), 1);
    if (sku.margin_pct > 40) explanations.push('High margin product.');

    // 3. Availability Score (0.0 - 1.0)
    // Sigmoid or simple threshold. Low stock (< 10) gets penalized.
    const availabilityScore = sku.inventory_level > 20 ? 1.0 : sku.inventory_level / 20;

    // 4. Risk Penalty (0.0 - 1.0)
    let riskScore = 0;

    // Dosage risk for low tolerance
    if (context.tolerance_level === 'low') {
        if (sku.thc_mg_per_serving > config.risk_params.new_user_max_dose_mg) {
            riskScore += 0.8; // Heavy penalty
            explanations.push('Risk: Dosage too high for low tolerance.');
        }
    }

    // New User "Edible First" heuristic (Risk if strictly Inhalable for new user? Optional)
    // For now, simple dose check.

    // Calculate Final Score
    const totalScore =
        (weights.effect_match * effectScore) +
        (weights.margin * marginScore) +
        (weights.availability * availabilityScore) -
        (weights.risk * riskScore);

    return {
        score: totalScore,
        explanations
    };
}
