/**
 * Ground Truth QA System - v1.0
 *
 * Structured QA pairs for training and evaluating Smokey (AI Budtender).
 * Each dispensary/brand gets their own ground truth set for accurate, compliant responses.
 *
 * @version 1.0 - Initial release with recommendation strategies
 *
 * Changelog:
 * - 1.0 (2026-01-22): Added recommendation strategies, versioning system
 */

import { z } from 'zod';

// --- Version ---
export const GROUND_TRUTH_VERSION = '1.0';

// ============================================================================
// RECOMMENDATION STRATEGIES (v1.0)
// ============================================================================

/**
 * Strategy types for product recommendations
 *
 * Each strategy defines HOW Smokey prioritizes and filters products
 * when making recommendations.
 */
export type RecommendationStrategyType =
    | 'effect_based'      // Match by desired effects (relaxation, energy, focus)
    | 'price_tier'        // Budget-conscious, mid-range, premium
    | 'experience_level'  // Beginner-friendly vs experienced user
    | 'product_type'      // Prefer flower, edibles, concentrates, etc.
    | 'brand_affinity'    // Recommend based on preferred/featured brands
    | 'occasion'          // Social, sleep, pain relief, creativity
    | 'hybrid';           // Combine multiple strategies with weights

export const STRATEGY_DESCRIPTIONS: Record<RecommendationStrategyType, string> = {
    effect_based: 'Prioritize products by their therapeutic or recreational effects',
    price_tier: 'Filter and rank products by price point and value',
    experience_level: 'Adjust THC/dosage recommendations based on user experience',
    product_type: 'Prefer specific product categories (flower, edibles, etc.)',
    brand_affinity: 'Highlight featured or preferred brand partnerships',
    occasion: 'Match products to specific use cases and occasions',
    hybrid: 'Combine multiple strategies with configurable weights',
};

/**
 * Effect-based strategy configuration
 */
export interface EffectBasedStrategy {
    type: 'effect_based';
    effects: {
        name: string;           // e.g., "relaxation", "energy", "focus"
        weight: number;         // 0-1, how important this effect is
        product_types?: string[]; // Preferred product types for this effect
        thc_range?: { min: number; max: number };
        cbd_range?: { min: number; max: number };
    }[];
    fallback_to_popular?: boolean;
}

/**
 * Price tier strategy configuration
 */
export interface PriceTierStrategy {
    type: 'price_tier';
    tiers: {
        name: string;           // e.g., "budget", "mid-range", "premium"
        min_price?: number;
        max_price?: number;
        default?: boolean;      // Use this tier if user doesn't specify
    }[];
    show_deals_first?: boolean;
    value_scoring?: boolean;    // Factor in quantity/potency per dollar
}

/**
 * Experience level strategy configuration
 */
export interface ExperienceLevelStrategy {
    type: 'experience_level';
    levels: {
        name: string;           // e.g., "beginner", "intermediate", "experienced"
        thc_max?: number;       // Max THC % to recommend
        dosage_guidance?: string;
        avoid_product_types?: string[];
        prefer_product_types?: string[];
        warnings?: string[];
    }[];
    default_level: string;
    ask_if_unknown?: boolean;   // Prompt user about experience if not known
}

/**
 * Product type preference strategy
 */
export interface ProductTypeStrategy {
    type: 'product_type';
    preferences: {
        category: string;       // e.g., "flower", "edibles", "concentrates"
        weight: number;         // 0-1, how much to prefer this category
        subcategories?: string[];
    }[];
    exclude_categories?: string[];
}

/**
 * Brand affinity strategy (featured brands, partnerships)
 */
export interface BrandAffinityStrategy {
    type: 'brand_affinity';
    featured_brands: {
        name: string;
        boost_weight: number;   // How much to boost these products (1.0-2.0)
        message?: string;       // Special mention for this brand
    }[];
    house_brand?: string;       // Store's own brand to prioritize
    exclude_brands?: string[];
}

/**
 * Occasion-based strategy
 */
export interface OccasionStrategy {
    type: 'occasion';
    occasions: {
        name: string;           // e.g., "sleep", "social", "pain_relief", "creativity"
        effects: string[];      // Effects to look for
        product_types?: string[];
        thc_range?: { min: number; max: number };
        cbd_range?: { min: number; max: number };
        time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
    }[];
}

/**
 * Hybrid strategy - combine multiple strategies with weights
 */
export interface HybridStrategy {
    type: 'hybrid';
    strategies: {
        strategy: RecommendationStrategyType;
        weight: number;         // 0-1, relative importance
        config: Partial<RecommendationStrategyConfig>;
    }[];
    combination_mode: 'weighted_average' | 'cascade' | 'filter_then_rank';
}

/**
 * Union type for all strategy configurations
 */
export type RecommendationStrategyConfig =
    | EffectBasedStrategy
    | PriceTierStrategy
    | ExperienceLevelStrategy
    | ProductTypeStrategy
    | BrandAffinityStrategy
    | OccasionStrategy
    | HybridStrategy;

/**
 * Complete recommendation configuration for a brand
 */
export interface RecommendationConfig {
    version: string;                        // Strategy version (for A/B testing)
    default_strategy: RecommendationStrategyType;
    strategies: RecommendationStrategyConfig[];
    constraints: {
        max_recommendations: number;        // Max products to recommend at once
        require_in_stock: boolean;          // Only recommend in-stock items
        min_confidence: number;             // 0-1, minimum match confidence to recommend
    };
    beginner_safety: {
        enabled: boolean;
        max_thc_first_time: number;         // e.g., 10 for 10%
        max_edible_mg_first_time: number;   // e.g., 5 for 5mg
        warning_message: string;
    };
    compliance: {
        require_age_confirmation: boolean;
        medical_disclaimer: string;
        no_health_claims: boolean;
    };
}

// --- Priority Levels ---
export type QAPriority = 'critical' | 'high' | 'medium';

export const PRIORITY_DESCRIPTIONS: Record<QAPriority, string> = {
    critical: 'Must be 100% accurate - regulatory and safety content',
    high: 'Target 95% accuracy - frequently asked questions',
    medium: 'Target 85% accuracy - supplementary information',
};

// --- QA Pair Structure ---
export interface GroundTruthQAPair {
    id: string;                    // Unique ID (e.g., "SI-001", "CS-003")
    question: string;              // Customer question
    ideal_answer: string;          // Expected response
    context: string;               // Additional context for the answer
    intent: string;                // What the customer is trying to accomplish
    keywords: string[];            // Required keywords for response validation
    priority: QAPriority;          // Accuracy requirement level
}

// --- Category Structure ---
export interface GroundTruthCategory {
    description: string;
    qa_pairs: GroundTruthQAPair[];
}

// --- Evaluation Configuration ---
export interface EvaluationScoringWeights {
    keyword_coverage: number;      // Weight for keyword presence (0-1)
    intent_match: number;          // Weight for addressing intent (0-1)
    factual_accuracy: number;      // Weight for correct information (0-1)
    tone_appropriateness: number;  // Weight for professional tone (0-1)
}

export interface EvaluationTargetMetrics {
    overall_accuracy: number;      // Target for all questions (0-1)
    compliance_accuracy: number;   // Target for critical questions (0-1)
    product_recommendations: number; // Target for product questions (0-1)
    store_information: number;     // Target for store info questions (0-1)
}

export interface EvaluationConfig {
    scoring_weights: EvaluationScoringWeights;
    target_metrics: EvaluationTargetMetrics;
    priority_levels: Record<QAPriority, string>;
}

// --- Maintenance Schedule ---
export interface MaintenanceSchedule {
    weekly: string[];
    monthly: string[];
    quarterly: string[];
}

// --- Metadata ---
export interface GroundTruthMetadata {
    dispensary: string;            // Display name
    brandId?: string;              // BakedBot brand ID
    address: string;
    version: string;
    created: string;               // ISO date
    last_updated: string;          // ISO date
    total_qa_pairs: number;
    author: string;
}

// --- Complete Ground Truth Set ---
export interface GroundTruthQASet {
    metadata: GroundTruthMetadata;
    categories: Record<string, GroundTruthCategory>;
    evaluation_config: EvaluationConfig;
    maintenance_schedule: MaintenanceSchedule;
    recommendation_config?: RecommendationConfig;  // v1.0: Optional recommendation strategies
}

// --- Category Keys (Standard) ---
export type StandardCategoryKey =
    | 'store_information'
    | 'age_and_id'
    | 'product_categories'
    | 'effect_based_recommendations'
    | 'brands_and_products'
    | 'pricing_and_deals'
    | 'compliance_and_safety'
    | 'ordering_and_delivery';

// --- Zod Schemas for Validation ---

export const QAPairSchema = z.object({
    id: z.string(),
    question: z.string(),
    ideal_answer: z.string(),
    context: z.string(),
    intent: z.string(),
    keywords: z.array(z.string()),
    priority: z.enum(['critical', 'high', 'medium']),
});

export const CategorySchema = z.object({
    description: z.string(),
    qa_pairs: z.array(QAPairSchema),
});

export const EvaluationConfigSchema = z.object({
    scoring_weights: z.object({
        keyword_coverage: z.number().min(0).max(1),
        intent_match: z.number().min(0).max(1),
        factual_accuracy: z.number().min(0).max(1),
        tone_appropriateness: z.number().min(0).max(1),
    }),
    target_metrics: z.object({
        overall_accuracy: z.number().min(0).max(1),
        compliance_accuracy: z.number().min(0).max(1),
        product_recommendations: z.number().min(0).max(1),
        store_information: z.number().min(0).max(1),
    }),
    priority_levels: z.record(z.string()),
});

export const GroundTruthQASetSchema = z.object({
    metadata: z.object({
        dispensary: z.string(),
        brandId: z.string().optional(),
        address: z.string(),
        version: z.string(),
        created: z.string(),
        last_updated: z.string(),
        total_qa_pairs: z.number(),
        author: z.string(),
    }),
    categories: z.record(CategorySchema),
    evaluation_config: EvaluationConfigSchema,
    maintenance_schedule: z.object({
        weekly: z.array(z.string()),
        monthly: z.array(z.string()),
        quarterly: z.array(z.string()),
    }),
});

// --- Helper Functions ---

/**
 * Get all QA pairs from a ground truth set
 */
export function getAllQAPairs(groundTruth: GroundTruthQASet): GroundTruthQAPair[] {
    return Object.values(groundTruth.categories).flatMap(cat => cat.qa_pairs);
}

/**
 * Get QA pairs by priority level
 */
export function getQAPairsByPriority(
    groundTruth: GroundTruthQASet,
    priority: QAPriority
): GroundTruthQAPair[] {
    return getAllQAPairs(groundTruth).filter(qa => qa.priority === priority);
}

/**
 * Get critical compliance QA pairs (must be 100% accurate)
 */
export function getCriticalQAPairs(groundTruth: GroundTruthQASet): GroundTruthQAPair[] {
    return getQAPairsByPriority(groundTruth, 'critical');
}

/**
 * Count QA pairs by category
 */
export function countByCategory(groundTruth: GroundTruthQASet): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [key, category] of Object.entries(groundTruth.categories)) {
        counts[key] = category.qa_pairs.length;
    }
    return counts;
}
