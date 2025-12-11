/**
 * Smokey SKU Scoring Algorithm
 * 
 * Computes a score for each SKU based on:
 * - Effect match (user intent vs product effects)
 * - Chemotype match (THC/CBD profile vs user tolerance)
 * - Business score (margin, inventory, promos)
 * - Risk penalty (dose safety, compliance)
 * 
 * LLM's job is to EXPLAIN the picks, not decide them.
 */

import { ScoringWeights, DEFAULT_SCORING_WEIGHTS } from './schema';

// --- Types ---

export interface UserContext {
    intent?: string; // "relaxation", "pain relief", "energy", "sleep"
    tolerance_level: 'low' | 'medium' | 'high';
    preferred_effects?: string[];
    price_preference?: 'budget' | 'mid' | 'premium';
    is_new_user?: boolean;
}

export interface SkuData {
    sku_id: string;
    name: string;
    category: string;
    effects: string[]; // ["relaxing", "euphoric", "creative"]
    thc_pct: number;
    cbd_pct: number;
    price: number;
    margin_pct?: number; // Business margin if available
    inventory_depth?: number; // Units in stock
    is_promoted?: boolean;
    form_factor?: string; // "flower", "edible", "vape", "concentrate"
}

export interface BrandScoringConfig {
    weights: ScoringWeights;
    max_thc_new_user: number; // mg THC cap for new users
    promoted_sku_boost: number; // Extra score for promos
    low_inventory_penalty: number; // Penalty threshold
}

export interface RankedSku {
    sku_id: string;
    name: string;
    score: number;
    rank: number;
    score_breakdown: {
        effect_match: number;
        chemotype_match: number;
        business_score: number;
        risk_penalty: number;
    };
}

// --- Default Config ---

export const DEFAULT_BRAND_CONFIG: BrandScoringConfig = {
    weights: DEFAULT_SCORING_WEIGHTS,
    max_thc_new_user: 10, // 10mg max for new users
    promoted_sku_boost: 0.15,
    low_inventory_penalty: 0.10,
};

// --- Scoring Functions ---

/**
 * Computes effect match score (0-1).
 * Higher = better match between user intent and product effects.
 */
function computeEffectMatch(userContext: UserContext, sku: SkuData): number {
    const intentKeywords = getIntentKeywords(userContext.intent);
    const preferredEffects = userContext.preferred_effects || [];

    const allDesired = [...intentKeywords, ...preferredEffects].map(e => e.toLowerCase());
    const skuEffects = sku.effects.map(e => e.toLowerCase());

    if (allDesired.length === 0) return 0.5; // Neutral if no preference

    const matches = allDesired.filter(d =>
        skuEffects.some(e => e.includes(d) || d.includes(e))
    );

    return Math.min(1, matches.length / Math.max(1, allDesired.length));
}

/**
 * Computes chemotype match score (0-1).
 * Matches THC/CBD profile to user tolerance.
 */
function computeChemotypeMatch(userContext: UserContext, sku: SkuData): number {
    const { tolerance_level } = userContext;
    const { thc_pct, cbd_pct } = sku;

    // Define ideal THC ranges per tolerance
    const thcRanges: Record<string, { min: number; max: number }> = {
        low: { min: 0, max: 15 },
        medium: { min: 10, max: 25 },
        high: { min: 20, max: 100 },
    };

    const range = thcRanges[tolerance_level] || thcRanges.medium;

    // Check if THC is in ideal range
    let thcScore = 0;
    if (thc_pct >= range.min && thc_pct <= range.max) {
        thcScore = 1;
    } else if (thc_pct < range.min) {
        thcScore = 0.7; // Slightly low, still okay
    } else {
        // Too high for tolerance
        thcScore = Math.max(0, 1 - (thc_pct - range.max) / 20);
    }

    // CBD bonus (higher CBD can balance THC)
    const cbdBonus = Math.min(0.2, cbd_pct / 50);

    return Math.min(1, thcScore + cbdBonus);
}

/**
 * Computes business score (0-1).
 * Higher margin, good inventory, and promos boost score.
 */
function computeBusinessScore(sku: SkuData, config: BrandScoringConfig): number {
    let score = 0.5; // Baseline

    // Margin contribution (if available)
    if (sku.margin_pct !== undefined) {
        score += Math.min(0.25, sku.margin_pct / 100);
    }

    // Inventory depth (penalize low stock)
    if (sku.inventory_depth !== undefined) {
        if (sku.inventory_depth < 5) {
            score -= config.low_inventory_penalty;
        } else if (sku.inventory_depth > 50) {
            score += 0.1; // Boost high inventory to move it
        }
    }

    // Promoted SKU boost
    if (sku.is_promoted) {
        score += config.promoted_sku_boost;
    }

    return Math.max(0, Math.min(1, score));
}

/**
 * Computes risk penalty (0-1).
 * Higher = more risky (should be subtracted from score).
 */
function computeRiskPenalty(userContext: UserContext, sku: SkuData, config: BrandScoringConfig): number {
    let penalty = 0;

    // New user THC check
    if (userContext.is_new_user) {
        if (sku.thc_pct > config.max_thc_new_user) {
            penalty += 0.3;
        }
        // Edibles require more caution for new users
        if (sku.form_factor === 'edible') {
            penalty += 0.15;
        }
    }

    // High THC for low tolerance
    if (userContext.tolerance_level === 'low' && sku.thc_pct > 20) {
        penalty += 0.2;
    }

    // Concentrates are generally higher risk
    if (sku.form_factor === 'concentrate' && userContext.tolerance_level !== 'high') {
        penalty += 0.15;
    }

    return Math.min(1, penalty);
}

/**
 * Main scoring function.
 * Combines all factors with configurable weights.
 */
export function computeSkuScore(
    userContext: UserContext,
    sku: SkuData,
    config: BrandScoringConfig = DEFAULT_BRAND_CONFIG
): { score: number; breakdown: RankedSku['score_breakdown'] } {
    const effectMatch = computeEffectMatch(userContext, sku);
    const chemotypeMatch = computeChemotypeMatch(userContext, sku);
    const businessScore = computeBusinessScore(sku, config);
    const riskPenalty = computeRiskPenalty(userContext, sku, config);

    const { weights } = config;

    const score =
        (weights.effect_match * effectMatch) +
        (weights.chemotype_match * chemotypeMatch) +
        (weights.business_score * businessScore) -
        (weights.risk_penalty * riskPenalty);

    return {
        score: Math.max(0, Math.min(1, score)),
        breakdown: {
            effect_match: effectMatch,
            chemotype_match: chemotypeMatch,
            business_score: businessScore,
            risk_penalty: riskPenalty,
        },
    };
}

/**
 * Ranks a list of SKUs and returns top K.
 */
export function rankSkus(
    userContext: UserContext,
    skus: SkuData[],
    config: BrandScoringConfig = DEFAULT_BRAND_CONFIG,
    topK: number = 5
): RankedSku[] {
    const scored = skus.map(sku => {
        const { score, breakdown } = computeSkuScore(userContext, sku, config);
        return {
            sku_id: sku.sku_id,
            name: sku.name,
            score,
            rank: 0, // Will be assigned after sort
            score_breakdown: breakdown,
        };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Assign ranks and return top K
    return scored.slice(0, topK).map((item, index) => ({
        ...item,
        rank: index + 1,
    }));
}

// --- Helpers ---

function getIntentKeywords(intent?: string): string[] {
    if (!intent) return [];

    const intentMap: Record<string, string[]> = {
        relaxation: ['relaxing', 'calm', 'chill', 'mellow'],
        'pain relief': ['pain', 'relief', 'soothing', 'body'],
        energy: ['energetic', 'uplifting', 'focused', 'creative'],
        sleep: ['sleepy', 'sedating', 'relaxing', 'indica'],
        social: ['euphoric', 'happy', 'giggly', 'social'],
        creative: ['creative', 'focused', 'inspired', 'uplifting'],
    };

    const normalized = intent.toLowerCase();
    for (const [key, keywords] of Object.entries(intentMap)) {
        if (normalized.includes(key)) {
            return keywords;
        }
    }

    // Return intent itself as a keyword
    return [normalized];
}
