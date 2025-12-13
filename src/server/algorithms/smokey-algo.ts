import { GlobalIntelligenceService } from '../intelligence/global-priors';
import { logger } from '@/lib/logger';

export interface SkuScoreContext {
    user_segments: string[];
    requested_effects: string[]; // e.g., ['sleep', 'pain']
    intent?: string; // e.g., 'sleep', 'energy'
    tolerance_level: 'low' | 'med' | 'high';
}

export interface CandidateSku {
    id: string;
    name: string;
    effects: string[]; // e.g. ['sleep', 'relax']
    tags: string[]; // General metadata tags
    category: string;
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

    // 1. Context Relevance (Effect Match)
    // Phase 3: Mix in Global Priors
    let effectScore = 0;

    // Check local keyword match (basic)
    if (context.intent && sku.tags.includes(context.intent)) {
        effectScore += 0.5;
    }

    // Check Global Priors (Semantic Match)
    if (context.intent) {
        const priors = GlobalIntelligenceService.getEffectPriors(context.intent);
        for (const prior of priors) {
            if (sku.tags.includes(prior.tag) || sku.category.toLowerCase().includes(prior.tag)) {
                effectScore += (prior.weight * 0.5); // Weighted boost
            }
        }
    }

    // Normalize effect score
    effectScore = Math.min(effectScore, 1.0);

    // Fallback: Use requested_effects overlap if intent logic didn't yield high score
    if (effectScore < 0.3 && context.requested_effects.length > 0) {
        const intersection = sku.effects.filter(e => context.requested_effects.includes(e));
        effectScore = Math.max(effectScore, intersection.length / context.requested_effects.length);
    }


    if (effectScore > 0.8) explanations.push('Perfect match for requested effects.');

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

/**
 * Updates scoring weights based on user feedback.
 * Simple feedback loop: If user likes result, boost weights of high-scoring components.
 */
export function updateRecWeights(
    currentConfig: BrandConfig,
    feedback: 'thumbs_up' | 'thumbs_down',
    attribution: { effectScore: number; marginScore?: number; availabilityScore?: number }
): BrandConfig {
    const newConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep copy
    const delta = 0.05;

    // Helper to adjust weight
    const adjust = (key: keyof BrandConfig['weights'], direction: 1 | -1) => {
        let w = newConfig.weights[key];
        w += delta * direction;
        newConfig.weights[key] = Math.min(Math.max(w, 0.1), 1.0); // Clamp 0.1 - 1.0
    };

    // Logic: Look for "Drivers" (> 0.7 score)
    // If Thumbs Up: Increase Driver weights (Trust these signals more)
    // If Thumbs Down: Decrease Driver weights (These signals misled us)

    if (attribution.effectScore > 0.7) {
        adjust('effect_match', feedback === 'thumbs_up' ? 1 : -1);
    }

    if ((attribution.marginScore || 0) > 0.7) {
        adjust('margin', feedback === 'thumbs_up' ? 1 : -1);
    }

    return newConfig;
}
