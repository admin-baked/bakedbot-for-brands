/**
 * Ground Truth QA System - v2.0
 *
 * Structured QA pairs for training and evaluating AI agents across all roles.
 * Originally for Smokey (AI Budtender), now extended for role-based fine-tuning.
 *
 * @version 2.0 - Role-based ground truth with preset prompts and workflows
 *
 * Changelog:
 * - 2.0 (2026-01-29): Added role-based ground truth, preset prompts, workflow guides
 * - 1.0 (2026-01-22): Added recommendation strategies, versioning system
 */

import { z } from 'zod';
import type { InboxThreadType, InboxAgentPersona } from './inbox';

// --- Version ---
export const GROUND_TRUTH_VERSION = '2.0';

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

// --- Recommendation Strategy Schemas (v1.0) ---

const ThcCbdRangeSchema = z.object({
    min: z.number(),
    max: z.number(),
}).optional();

export const EffectBasedStrategySchema = z.object({
    type: z.literal('effect_based'),
    effects: z.array(z.object({
        name: z.string(),
        weight: z.number().min(0).max(1),
        product_types: z.array(z.string()).optional(),
        thc_range: ThcCbdRangeSchema,
        cbd_range: ThcCbdRangeSchema,
    })),
    fallback_to_popular: z.boolean().optional(),
});

export const PriceTierStrategySchema = z.object({
    type: z.literal('price_tier'),
    tiers: z.array(z.object({
        name: z.string(),
        min_price: z.number().optional(),
        max_price: z.number().optional(),
        default: z.boolean().optional(),
    })),
    show_deals_first: z.boolean().optional(),
    value_scoring: z.boolean().optional(),
});

export const ExperienceLevelStrategySchema = z.object({
    type: z.literal('experience_level'),
    levels: z.array(z.object({
        name: z.string(),
        thc_max: z.number().optional(),
        dosage_guidance: z.string().optional(),
        avoid_product_types: z.array(z.string()).optional(),
        prefer_product_types: z.array(z.string()).optional(),
        warnings: z.array(z.string()).optional(),
    })),
    default_level: z.string(),
    ask_if_unknown: z.boolean().optional(),
});

export const ProductTypeStrategySchema = z.object({
    type: z.literal('product_type'),
    preferences: z.array(z.object({
        category: z.string(),
        weight: z.number().min(0).max(1),
        subcategories: z.array(z.string()).optional(),
    })),
    exclude_categories: z.array(z.string()).optional(),
});

export const BrandAffinityStrategySchema = z.object({
    type: z.literal('brand_affinity'),
    featured_brands: z.array(z.object({
        name: z.string(),
        boost_weight: z.number().min(1).max(2),
        message: z.string().optional(),
    })),
    house_brand: z.string().optional(),
    exclude_brands: z.array(z.string()).optional(),
});

export const OccasionStrategySchema = z.object({
    type: z.literal('occasion'),
    occasions: z.array(z.object({
        name: z.string(),
        effects: z.array(z.string()),
        product_types: z.array(z.string()).optional(),
        thc_range: ThcCbdRangeSchema,
        cbd_range: ThcCbdRangeSchema,
        time_of_day: z.enum(['morning', 'afternoon', 'evening', 'night', 'any']).optional(),
    })),
});

export const HybridStrategySchema = z.object({
    type: z.literal('hybrid'),
    strategies: z.array(z.object({
        strategy: z.enum(['effect_based', 'price_tier', 'experience_level', 'product_type', 'brand_affinity', 'occasion', 'hybrid']),
        weight: z.number().min(0).max(1),
        config: z.record(z.unknown()),
    })),
    combination_mode: z.enum(['weighted_average', 'cascade', 'filter_then_rank']),
});

export const RecommendationStrategyConfigSchema = z.discriminatedUnion('type', [
    EffectBasedStrategySchema,
    PriceTierStrategySchema,
    ExperienceLevelStrategySchema,
    ProductTypeStrategySchema,
    BrandAffinityStrategySchema,
    OccasionStrategySchema,
    HybridStrategySchema,
]);

export const RecommendationConfigSchema = z.object({
    version: z.string(),
    default_strategy: z.enum(['effect_based', 'price_tier', 'experience_level', 'product_type', 'brand_affinity', 'occasion', 'hybrid']),
    strategies: z.array(RecommendationStrategyConfigSchema),
    constraints: z.object({
        max_recommendations: z.number().int().positive(),
        require_in_stock: z.boolean(),
        min_confidence: z.number().min(0).max(1),
    }),
    beginner_safety: z.object({
        enabled: z.boolean(),
        max_thc_first_time: z.number(),
        max_edible_mg_first_time: z.number(),
        warning_message: z.string(),
    }),
    compliance: z.object({
        require_age_confirmation: z.boolean(),
        medical_disclaimer: z.string(),
        no_health_claims: z.boolean(),
    }),
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
    recommendation_config: RecommendationConfigSchema.optional(),  // v1.0
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

// ============================================================================
// RECOMMENDATION STRATEGY HELPERS (v1.0)
// ============================================================================

/**
 * Get the default recommendation strategy for a ground truth set
 */
export function getDefaultStrategy(groundTruth: GroundTruthQASet): RecommendationStrategyConfig | null {
    if (!groundTruth.recommendation_config) return null;

    const defaultType = groundTruth.recommendation_config.default_strategy;
    return groundTruth.recommendation_config.strategies.find(s => s.type === defaultType) || null;
}

/**
 * Get a specific strategy by type
 */
export function getStrategyByType(
    groundTruth: GroundTruthQASet,
    type: RecommendationStrategyType
): RecommendationStrategyConfig | null {
    if (!groundTruth.recommendation_config) return null;
    return groundTruth.recommendation_config.strategies.find(s => s.type === type) || null;
}

/**
 * Check if a ground truth set has recommendation strategies configured
 */
export function hasRecommendationStrategies(groundTruth: GroundTruthQASet): boolean {
    return !!(
        groundTruth.recommendation_config &&
        groundTruth.recommendation_config.strategies.length > 0
    );
}

/**
 * Get beginner safety settings
 */
export function getBeginnerSafety(groundTruth: GroundTruthQASet): RecommendationConfig['beginner_safety'] | null {
    return groundTruth.recommendation_config?.beginner_safety || null;
}

/**
 * Check if beginner safety is enabled
 */
export function isBeginnerSafetyEnabled(groundTruth: GroundTruthQASet): boolean {
    return groundTruth.recommendation_config?.beginner_safety?.enabled ?? false;
}

/**
 * Get compliance settings
 */
export function getComplianceSettings(groundTruth: GroundTruthQASet): RecommendationConfig['compliance'] | null {
    return groundTruth.recommendation_config?.compliance || null;
}

/**
 * Create a default recommendation config (starter template)
 */
export function createDefaultRecommendationConfig(): RecommendationConfig {
    return {
        version: GROUND_TRUTH_VERSION,
        default_strategy: 'effect_based',
        strategies: [
            {
                type: 'effect_based',
                effects: [
                    { name: 'relaxation', weight: 0.8 },
                    { name: 'energy', weight: 0.7 },
                    { name: 'focus', weight: 0.6 },
                    { name: 'sleep', weight: 0.8 },
                    { name: 'pain_relief', weight: 0.7 },
                ],
                fallback_to_popular: true,
            },
            {
                type: 'experience_level',
                levels: [
                    {
                        name: 'beginner',
                        thc_max: 15,
                        dosage_guidance: 'Start with 2.5-5mg THC for edibles, or 1-2 puffs for flower',
                        prefer_product_types: ['edibles', 'tinctures', 'flower'],
                        avoid_product_types: ['concentrates', 'dabs'],
                        warnings: ['Start low and go slow', 'Wait 2 hours before redosing edibles'],
                    },
                    {
                        name: 'intermediate',
                        thc_max: 25,
                        dosage_guidance: '5-15mg THC for edibles',
                        prefer_product_types: ['flower', 'edibles', 'vapes'],
                    },
                    {
                        name: 'experienced',
                        dosage_guidance: 'Adjust based on personal tolerance',
                    },
                ],
                default_level: 'beginner',
                ask_if_unknown: true,
            },
            {
                type: 'price_tier',
                tiers: [
                    { name: 'budget', max_price: 30, default: false },
                    { name: 'mid-range', min_price: 30, max_price: 60, default: true },
                    { name: 'premium', min_price: 60 },
                ],
                show_deals_first: true,
                value_scoring: true,
            },
        ],
        constraints: {
            max_recommendations: 5,
            require_in_stock: true,
            min_confidence: 0.6,
        },
        beginner_safety: {
            enabled: true,
            max_thc_first_time: 10,
            max_edible_mg_first_time: 5,
            warning_message: 'Since you\'re new to cannabis, I\'ll recommend lower-potency options. Start low and go slow!',
        },
        compliance: {
            require_age_confirmation: true,
            medical_disclaimer: 'These products are not intended to diagnose, treat, cure, or prevent any disease. Please consult a healthcare professional.',
            no_health_claims: true,
        },
    };
}

// ============================================================================
// ROLE-BASED GROUND TRUTH (v2.0)
// ============================================================================

/**
 * Role context types for role-based ground truth
 *
 * Each role gets its own ground truth configuration with:
 * - Role-specific QA pairs
 * - Preset prompts and quick actions
 * - Workflow guides
 * - Agent persona customizations
 */
export type RoleContextType = 'brand' | 'dispensary' | 'super_user' | 'customer';

export const ROLE_DISPLAY_NAMES: Record<RoleContextType, string> = {
    brand: 'Brand',
    dispensary: 'Dispensary',
    super_user: 'Super User',
    customer: 'Customer',
};

/**
 * Preset prompt template with variable substitution support
 *
 * Used for quick actions, campaign templates, and other preset prompts.
 * Supports Mustache-style variables: {{variable_name}}
 */
export interface PresetPromptTemplate {
    id: string;                          // Unique ID (e.g., "brand-product-launch")
    label: string;                       // Display label (e.g., "Product Launch")
    description: string;                 // What this preset does
    threadType: InboxThreadType;         // Thread type to create
    defaultAgent: InboxAgentPersona;     // Primary agent for this task
    promptTemplate: string;              // Template with {{variables}}
    variables?: string[];                // Variable names (e.g., ["product_name", "target_date"])
    category: string;                    // Category (e.g., "marketing", "operations")
    roles: string[];                     // Allowed roles
    icon?: string;                       // Lucide icon name
    estimatedTime?: string;              // Estimated completion time (e.g., "5-10 min")
    version: string;                     // Version for A/B testing
    createdAt?: string;                  // ISO date
    updatedAt?: string;                  // ISO date
}

/**
 * Workflow guide - step-by-step instructions for complex tasks
 *
 * Provides human-readable guidance for multi-step workflows.
 * Different from Playbooks (which are executable YAML).
 */
export interface WorkflowGuide {
    id: string;                          // Unique ID
    title: string;                       // Workflow title
    description: string;                 // What this workflow accomplishes
    steps: Array<{
        title: string;                   // Step title
        description: string;             // What to do in this step
        agentId?: InboxAgentPersona;     // Which agent helps with this step
        toolsUsed?: string[];            // Tools/features used
        expectedOutput: string;          // What success looks like
    }>;
    tags: string[];                      // Searchable tags
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;              // Total estimated time
    prerequisites?: string[];            // Required before starting
}

/**
 * Agent persona customization per role
 *
 * Role-specific additions to agent system prompts.
 * These are ADDITIVE (appended to base persona, not replacing).
 */
export interface RoleAgentPersona {
    system_prompt_additions: string;     // Role-specific instructions
    example_responses: string[];         // Example good responses
    dos: string[];                       // What agent SHOULD do for this role
    donts: string[];                     // What agent SHOULD NOT do for this role
}

/**
 * Role-based ground truth - extends base ground truth with role-specific data
 *
 * Storage:
 * - Global: ground_truth_v2/{roleId}
 * - Tenant overrides: tenants/{tenantId}/ground_truth_overrides/{roleId}
 */
export interface RoleGroundTruth extends GroundTruthQASet {
    role: RoleContextType;                                    // Which role this is for
    preset_prompts: PresetPromptTemplate[];                   // Quick actions and templates
    workflow_guides: WorkflowGuide[];                         // Step-by-step workflows
    agent_personas?: Record<InboxAgentPersona, RoleAgentPersona>;  // Agent customizations
}

/**
 * Tenant-specific override configuration
 *
 * Allows tenants to:
 * - Add custom preset prompts
 * - Disable global presets
 * - Add custom workflows
 * - Override QA pairs (future)
 */
export interface TenantGroundTruthOverride {
    tenantId: string;
    roleId: RoleContextType;
    preset_prompts: PresetPromptTemplate[];  // Custom tenant presets
    disabled_presets: string[];              // Disabled preset IDs from global
    custom_workflows: WorkflowGuide[];       // Tenant-specific workflows
    createdAt: string;                       // ISO date
    updatedAt: string;                       // ISO date
}

// ============================================================================
// ROLE-BASED ZOD SCHEMAS (v2.0)
// ============================================================================

export const PresetPromptTemplateSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    threadType: z.string(),              // InboxThreadType
    defaultAgent: z.string(),            // InboxAgentPersona
    promptTemplate: z.string(),
    variables: z.array(z.string()).optional(),
    category: z.string(),
    roles: z.array(z.string()),
    icon: z.string().optional(),
    estimatedTime: z.string().optional(),
    version: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export const WorkflowGuideSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    steps: z.array(z.object({
        title: z.string(),
        description: z.string(),
        agentId: z.string().optional(),  // InboxAgentPersona
        toolsUsed: z.array(z.string()).optional(),
        expectedOutput: z.string(),
    })),
    tags: z.array(z.string()),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedTime: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
});

export const RoleAgentPersonaSchema = z.object({
    system_prompt_additions: z.string(),
    example_responses: z.array(z.string()),
    dos: z.array(z.string()),
    donts: z.array(z.string()),
});

export const RoleGroundTruthSchema = GroundTruthQASetSchema.extend({
    role: z.enum(['brand', 'dispensary', 'super_user', 'customer']),
    preset_prompts: z.array(PresetPromptTemplateSchema),
    workflow_guides: z.array(WorkflowGuideSchema),
    agent_personas: z.record(RoleAgentPersonaSchema).optional(),
});

export const TenantGroundTruthOverrideSchema = z.object({
    tenantId: z.string(),
    roleId: z.enum(['brand', 'dispensary', 'super_user', 'customer']),
    preset_prompts: z.array(PresetPromptTemplateSchema),
    disabled_presets: z.array(z.string()),
    custom_workflows: z.array(WorkflowGuideSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});

// ============================================================================
// ROLE-BASED HELPER FUNCTIONS (v2.0)
// ============================================================================

/**
 * Get all preset prompts for a role
 */
export function getPresetPrompts(roleGT: RoleGroundTruth): PresetPromptTemplate[] {
    return roleGT.preset_prompts || [];
}

/**
 * Get preset prompts filtered by category
 */
export function getPresetPromptsByCategory(
    roleGT: RoleGroundTruth,
    category: string
): PresetPromptTemplate[] {
    return getPresetPrompts(roleGT).filter(p => p.category === category);
}

/**
 * Get a specific preset prompt by ID
 */
export function getPresetPromptById(
    roleGT: RoleGroundTruth,
    id: string
): PresetPromptTemplate | null {
    return getPresetPrompts(roleGT).find(p => p.id === id) || null;
}

/**
 * Substitute variables in a preset prompt template
 *
 * @example
 * substitutePromptVariables(
 *   "Launch {{product_name}} on {{target_date}}",
 *   { product_name: "Blue Dream", target_date: "2026-02-15" }
 * )
 * // Returns: "Launch Blue Dream on 2026-02-15"
 */
export function substitutePromptVariables(
    template: string,
    variables: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}

/**
 * Extract variable names from a preset prompt template
 *
 * @example
 * extractTemplateVariables("Launch {{product_name}} on {{target_date}}")
 * // Returns: ["product_name", "target_date"]
 */
export function extractTemplateVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
        matches.push(match[1].trim());
    }
    return [...new Set(matches)]; // Remove duplicates
}

/**
 * Get all workflow guides for a role
 */
export function getWorkflowGuides(roleGT: RoleGroundTruth): WorkflowGuide[] {
    return roleGT.workflow_guides || [];
}

/**
 * Get workflow guides filtered by difficulty
 */
export function getWorkflowGuidesByDifficulty(
    roleGT: RoleGroundTruth,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
): WorkflowGuide[] {
    return getWorkflowGuides(roleGT).filter(w => w.difficulty === difficulty);
}

/**
 * Get workflow guides filtered by tag
 */
export function getWorkflowGuidesByTag(
    roleGT: RoleGroundTruth,
    tag: string
): WorkflowGuide[] {
    return getWorkflowGuides(roleGT).filter(w => w.tags.includes(tag));
}

/**
 * Get agent persona customization for a specific agent in a role
 */
export function getAgentPersonaForRole(
    roleGT: RoleGroundTruth,
    agentId: InboxAgentPersona
): RoleAgentPersona | null {
    return roleGT.agent_personas?.[agentId] || null;
}

/**
 * Check if a role ground truth has preset prompts configured
 */
export function hasPresetPrompts(roleGT: RoleGroundTruth): boolean {
    return roleGT.preset_prompts && roleGT.preset_prompts.length > 0;
}

/**
 * Check if a role ground truth has workflow guides configured
 */
export function hasWorkflowGuides(roleGT: RoleGroundTruth): boolean {
    return roleGT.workflow_guides && roleGT.workflow_guides.length > 0;
}

/**
 * Check if a role ground truth has agent persona customizations
 */
export function hasAgentPersonas(roleGT: RoleGroundTruth): boolean {
    return !!(roleGT.agent_personas && Object.keys(roleGT.agent_personas).length > 0);
}

/**
 * Merge role ground truth with tenant overrides
 *
 * Merge strategy:
 * 1. Start with base role ground truth
 * 2. Add tenant custom preset prompts
 * 3. Filter out disabled preset prompts
 * 4. Add tenant custom workflows
 */
export function mergeWithTenantOverrides(
    baseGT: RoleGroundTruth,
    override: TenantGroundTruthOverride
): RoleGroundTruth {
    return {
        ...baseGT,
        preset_prompts: [
            ...baseGT.preset_prompts.filter(p => !override.disabled_presets.includes(p.id)),
            ...override.preset_prompts,
        ],
        workflow_guides: [
            ...baseGT.workflow_guides,
            ...override.custom_workflows,
        ],
    };
}
