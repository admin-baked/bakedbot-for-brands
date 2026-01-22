/**
 * Ground Truth QA System
 *
 * Structured QA pairs for training and evaluating Smokey (AI Budtender).
 * Each dispensary/brand gets their own ground truth set for accurate, compliant responses.
 */

import { z } from 'zod';

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
