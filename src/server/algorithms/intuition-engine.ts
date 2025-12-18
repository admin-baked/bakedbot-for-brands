/**
 * Intuition Engine
 * 
 * The brain of BakedBot's algorithmic intelligence.
 * 
 * Orchestrates:
 * - Local learning (per-brand bandits)
 * - Global priors (cross-tenant patterns)
 * - Insight generation (actionable recommendations)
 * - Periodic learning jobs
 * 
 * This is where "Autonomous Cannabis Commerce" comes to life.
 */

import {
    getGlobalWeights,
    getWarmStartWeights,
    getEffectPrior,
    contributeBanditStats,
    contributeWeights,
    generateCrossTenantInsights,
    getTopPatterns,
    CrossTenantInsight,
    GlobalScoringWeights,
} from './global-priors';
import {
    BanditState,
    getBanditStats,
    BanditArm,
} from './bandit';
import {
    ScoringWeights,
    DEFAULT_SCORING_WEIGHTS
} from './schema';
import { logger } from '@/lib/logger';

// --- Types ---

export interface BrandIntuition {
    brand_id: string;
    local_weights: ScoringWeights;
    global_influence: number; // 0-1: how much to blend global vs local
    learning_stage: 'cold_start' | 'warming' | 'learned' | 'mature';
    total_interactions: number;
    insights: CrossTenantInsight[];
    last_updated: string;
}

export interface IntuitionConfig {
    cold_start_threshold: number; // Interactions before leaving cold start
    warming_threshold: number; // Interactions before "learned"
    mature_threshold: number; // Interactions before "mature"
    global_blend_cold: number; // Global weight during cold start
    global_blend_warming: number;
    global_blend_learned: number;
    global_blend_mature: number;
}

// --- Default Config ---

const DEFAULT_INTUITION_CONFIG: IntuitionConfig = {
    cold_start_threshold: 50,
    warming_threshold: 500,
    mature_threshold: 5000,
    global_blend_cold: 0.9, // 90% global during cold start
    global_blend_warming: 0.6,
    global_blend_learned: 0.3,
    global_blend_mature: 0.1, // Only 10% global when mature
};

// --- Brand Intuition State ---

const brandIntuitions: Map<string, BrandIntuition> = new Map();

/**
 * Gets or creates intuition state for a brand.
 */
export function getBrandIntuition(brandId: string): BrandIntuition {
    let intuition = brandIntuitions.get(brandId);

    if (!intuition) {
        // Cold start: use global priors
        intuition = {
            brand_id: brandId,
            local_weights: getWarmStartWeights(),
            global_influence: DEFAULT_INTUITION_CONFIG.global_blend_cold,
            learning_stage: 'cold_start',
            total_interactions: 0,
            insights: [],
            last_updated: new Date().toISOString(),
        };
        brandIntuitions.set(brandId, intuition);

        logger.info(`[Intuition] Initialized cold-start intuition for brand ${brandId.slice(0, 8)}`);
    }

    return intuition;
}

/**
 * Gets blended scoring weights for a brand.
 * Combines local learning with global priors based on learning stage.
 */
export function getBlendedWeights(brandId: string): ScoringWeights {
    const intuition = getBrandIntuition(brandId);
    const global = getGlobalWeights();
    const blend = intuition.global_influence;

    // Weighted average of local and global
    return {
        effect_match: blend * global.effect_match + (1 - blend) * intuition.local_weights.effect_match,
        chemotype_match: blend * global.chemotype_match + (1 - blend) * intuition.local_weights.chemotype_match,
        business_score: blend * global.business_score + (1 - blend) * intuition.local_weights.business_score,
        risk_penalty: blend * global.risk_penalty + (1 - blend) * intuition.local_weights.risk_penalty,
    };
}

/**
 * Records an interaction and updates learning stage.
 */
export function recordInteraction(
    brandId: string,
    interactionType: 'recommendation' | 'campaign' | 'metric',
    wasSuccessful: boolean
): void {
    const intuition = getBrandIntuition(brandId);
    const config = DEFAULT_INTUITION_CONFIG;

    intuition.total_interactions += 1;
    intuition.last_updated = new Date().toISOString();

    // Update learning stage based on interactions
    if (intuition.total_interactions >= config.mature_threshold) {
        if (intuition.learning_stage !== 'mature') {
            intuition.learning_stage = 'mature';
            intuition.global_influence = config.global_blend_mature;
            logger.info(`[Intuition] Brand ${brandId.slice(0, 8)} reached MATURE stage`);
        }
    } else if (intuition.total_interactions >= config.warming_threshold) {
        if (intuition.learning_stage !== 'learned') {
            intuition.learning_stage = 'learned';
            intuition.global_influence = config.global_blend_learned;
            logger.info(`[Intuition] Brand ${brandId.slice(0, 8)} reached LEARNED stage`);
        }
    } else if (intuition.total_interactions >= config.cold_start_threshold) {
        if (intuition.learning_stage !== 'warming') {
            intuition.learning_stage = 'warming';
            intuition.global_influence = config.global_blend_warming;
            logger.info(`[Intuition] Brand ${brandId.slice(0, 8)} reached WARMING stage`);
        }
    }

    brandIntuitions.set(brandId, intuition);
}

/**
 * Updates a brand's local weights based on learning.
 */
export function updateLocalWeights(
    brandId: string,
    newWeights: ScoringWeights,
    sampleSize: number
): void {
    const intuition = getBrandIntuition(brandId);

    // Exponential moving average with existing weights
    const alpha = Math.min(0.3, sampleSize / 1000); // Learning rate based on sample size

    intuition.local_weights = {
        effect_match: alpha * newWeights.effect_match + (1 - alpha) * intuition.local_weights.effect_match,
        chemotype_match: alpha * newWeights.chemotype_match + (1 - alpha) * intuition.local_weights.chemotype_match,
        business_score: alpha * newWeights.business_score + (1 - alpha) * intuition.local_weights.business_score,
        risk_penalty: alpha * newWeights.risk_penalty + (1 - alpha) * intuition.local_weights.risk_penalty,
    };

    intuition.last_updated = new Date().toISOString();
    brandIntuitions.set(brandId, intuition);

    // Contribute to global pool
    contributeWeights(brandId, newWeights, sampleSize);
}

// --- Effect-Based Recommendations ---

/**
 * Gets effect-based product scoring boosts.
 * Uses global priors blended with any local learning.
 */
export function getEffectBoosts(
    brandId: string,
    intent: string
): Record<string, number> {
    const intuition = getBrandIntuition(brandId);
    const globalPrior = getEffectPrior(intent);

    // In cold start, just use global
    if (intuition.learning_stage === 'cold_start') {
        return globalPrior;
    }

    // Could blend with local effect learning here
    // For V1, just return global with confidence adjustment
    const confidenceMultiplier = 1 - (intuition.global_influence * 0.2);

    const adjusted: Record<string, number> = {};
    for (const [key, value] of Object.entries(globalPrior)) {
        adjusted[key] = value * confidenceMultiplier;
    }

    return adjusted;
}

// --- Insight Generation ---

/**
 * Gets relevant insights for a brand.
 * Filters global insights by relevance.
 */
export function getBrandInsights(brandId: string): CrossTenantInsight[] {
    const intuition = getBrandIntuition(brandId);

    // Get fresh global insights
    const globalInsights = generateCrossTenantInsights();

    // Filter/rank by relevance to this brand
    // V1: Just return top 5 by confidence
    return globalInsights
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
}

/**
 * Generates a summary of the intuition state for a brand.
 */
export function getIntuitionSummary(brandId: string): {
    stage: string;
    confidence: number;
    global_blend: number;
    interactions: number;
    top_insight: string | null;
    topEffects: string[];
    topFormats: string[];
} {
    const intuition = getBrandIntuition(brandId);
    const insights = getBrandInsights(brandId);

    // Confidence based on learning stage
    const confidenceMap = {
        cold_start: 0.3,
        warming: 0.5,
        learned: 0.75,
        mature: 0.9,
    };

    return {
        stage: intuition.learning_stage,
        confidence: confidenceMap[intuition.learning_stage],
        global_blend: intuition.global_influence * 100,
        interactions: intuition.total_interactions,
        top_insight: insights[0]?.title || null,
        topEffects: ['Relaxed', 'Happy', 'Euphoric'], // Bootstrap defaults
        topFormats: ['Flower', 'Vape', 'Gummy'], // Bootstrap defaults
    };
}

// --- Periodic Learning Jobs ---

/**
 * Runs periodic aggregation job.
 * Should be called by a cron/scheduler.
 */
export async function runLearningAggregation(): Promise<{
    brands_processed: number;
    insights_generated: number;
}> {
    logger.info('[Intuition] Running learning aggregation job...');

    let brandsProcessed = 0;

    // Process each brand's data
    for (const [brandId, intuition] of Array.from(brandIntuitions.entries())) {
        // In production, we'd aggregate bandit stats here
        // For V1, just log activity
        if (intuition.total_interactions > 0) {
            brandsProcessed++;
        }
    }

    // Generate fresh insights
    const insights = generateCrossTenantInsights();

    logger.info(`[Intuition] Aggregation complete: ${brandsProcessed} brands, ${insights.length} insights`);

    return {
        brands_processed: brandsProcessed,
        insights_generated: insights.length,
    };
}

// --- API for Agents ---

/**
 * Main entry point for agents to get intuition-powered recommendations.
 */
export function getAgentIntuition(
    brandId: string,
    context: {
        agent: 'smokey' | 'craig' | 'pops' | 'ezal' | 'money_mike';
        action: string;
        params?: Record<string, any>;
    }
): {
    weights: ScoringWeights;
    boosts: Record<string, number>;
    insights: CrossTenantInsight[];
    learning_stage: string;
} {
    const intuition = getBrandIntuition(brandId);
    const weights = getBlendedWeights(brandId);
    const insights = getBrandInsights(brandId);

    // Get effect boosts if relevant
    let boosts: Record<string, number> = {};
    if (context.agent === 'smokey' && context.params?.intent) {
        boosts = getEffectBoosts(brandId, context.params.intent);
    }

    // Record that we served an intuition request
    recordInteraction(brandId, 'recommendation', true);

    return {
        weights,
        boosts,
        insights,
        learning_stage: intuition.learning_stage,
    };
}

// --- Stats & Monitoring ---

/**
 * Gets global learning statistics.
 */
export function getGlobalLearningStats(): {
    total_brands: number;
    brands_by_stage: Record<string, number>;
    total_interactions: number;
    top_patterns: string[];
} {
    const stageCount: Record<string, number> = {
        cold_start: 0,
        warming: 0,
        learned: 0,
        mature: 0,
    };

    let totalInteractions = 0;

    for (const intuition of Array.from(brandIntuitions.values())) {
        stageCount[intuition.learning_stage]++;
        totalInteractions += intuition.total_interactions;
    }

    const topPatterns = getTopPatterns(5).map(p => p.arm_pattern);

    return {
        total_brands: brandIntuitions.size,
        brands_by_stage: stageCount,
        total_interactions: totalInteractions,
        top_patterns: topPatterns,
    };
}
