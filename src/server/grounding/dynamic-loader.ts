/**
 * Dynamic Ground Truth Loader
 *
 * Provides Firestore-first loading with fallback to code registry.
 * Used by Smokey and other agents during initialization.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { GROUND_TRUTH_REGISTRY } from './index';
import { logger } from '@/lib/logger';
import { sanitizeForPrompt } from '@/server/security';
import type {
    GroundTruthQASet,
    GroundTruthCategory,
    GroundTruthQAPair,
} from '@/types/ground-truth';
import { GroundTruthQASetSchema } from '@/types/ground-truth';

/**
 * Load ground truth for a brand, preferring Firestore over code registry
 */
export async function loadGroundTruth(brandId: string): Promise<GroundTruthQASet | null> {
    // Normalize brandId (strip 'brand_' prefix if present for lookup)
    const normalizedId = brandId.startsWith('brand_')
        ? brandId.replace('brand_', '')
        : brandId;

    // 1. Try Firestore first
    try {
        const firestoreGT = await loadFromFirestore(normalizedId);
        if (firestoreGT) {
            logger.info(`[Grounding] Loaded ground truth for ${normalizedId} from Firestore`);
            return firestoreGT;
        }
    } catch (error) {
        logger.warn(`[Grounding] Error loading from Firestore for ${normalizedId}`, { error: error instanceof Error ? error.message : String(error) });
        // Continue to fallback
    }

    // 2. Fallback to code registry
    const codeGT = GROUND_TRUTH_REGISTRY[normalizedId];
    if (codeGT) {
        logger.info(`[Grounding] Loaded ground truth for ${normalizedId} from code registry (fallback)`);
        return codeGT;
    }

    // Also try with original brandId if different
    if (normalizedId !== brandId) {
        const codeGTOriginal = GROUND_TRUTH_REGISTRY[brandId];
        if (codeGTOriginal) {
            logger.info(`[Grounding] Loaded ground truth for ${brandId} from code registry (fallback)`);
            return codeGTOriginal;
        }
    }

    logger.debug(`[Grounding] No ground truth found for ${brandId}`);
    return null;
}

/**
 * Check if brand has ground truth (either source)
 * This is a quick check that can be used synchronously for code registry
 * and async for Firestore
 */
export async function hasGroundTruthDynamic(brandId: string): Promise<boolean> {
    const normalizedId = brandId.startsWith('brand_')
        ? brandId.replace('brand_', '')
        : brandId;

    // Quick check code registry first (sync)
    if (normalizedId in GROUND_TRUTH_REGISTRY) return true;
    if (brandId in GROUND_TRUTH_REGISTRY) return true;

    // Then check Firestore
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('ground_truth').doc(normalizedId).get();
        return doc.exists;
    } catch (error) {
        logger.warn(`[Grounding] Error checking Firestore for ${brandId}`, { error: error instanceof Error ? error.message : String(error) });
        return false;
    }
}

/**
 * Synchronous check for code registry only
 * Use this when you need a quick check without async
 */
export function hasGroundTruthSync(brandId: string): boolean {
    const normalizedId = brandId.startsWith('brand_')
        ? brandId.replace('brand_', '')
        : brandId;

    return normalizedId in GROUND_TRUTH_REGISTRY || brandId in GROUND_TRUTH_REGISTRY;
}

/**
 * Load from Firestore and reconstruct full GroundTruthQASet
 */
async function loadFromFirestore(brandId: string): Promise<GroundTruthQASet | null> {
    const db = getAdminFirestore();

    // Get main document
    const docRef = db.collection('ground_truth').doc(brandId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const data = doc.data()!;

    // Load categories
    const categoriesSnap = await docRef.collection('categories').orderBy('sort_order').get();
    const categories: Record<string, GroundTruthCategory> = {};

    for (const catDoc of categoriesSnap.docs) {
        const catData = catDoc.data();

        // Load QA pairs for this category
        // SECURITY: Sanitize brand-provided QA content to prevent prompt injection
        const pairsSnap = await catDoc.ref.collection('qa_pairs').get();
        const qa_pairs = pairsSnap.docs.map(p => ({
            id: p.id,
            question: sanitizeForPrompt(p.data().question || '', 500),
            ideal_answer: sanitizeForPrompt(p.data().ideal_answer || '', 2000),
            context: p.data().context ? sanitizeForPrompt(p.data().context, 500) : undefined,
            intent: p.data().intent,
            keywords: p.data().keywords || [],
            priority: p.data().priority || 'medium',
        })) as GroundTruthQAPair[];

        categories[catDoc.id] = {
            description: catData.description,
            qa_pairs,
        };
    }

    // If no categories found, return null (incomplete data)
    if (Object.keys(categories).length === 0) {
        logger.warn(`[Grounding] Firestore doc exists for ${brandId} but has no categories`);
        return null;
    }

    // Reconstruct full object
    const groundTruth: GroundTruthQASet = {
        metadata: {
            dispensary: data.metadata?.dispensary || brandId,
            brandId: data.metadata?.brandId || brandId,
            address: data.metadata?.address || '',
            version: data.metadata?.version || '1.0',
            created: data.metadata?.created || new Date().toISOString(),
            last_updated: data.metadata?.last_updated || new Date().toISOString(),
            total_qa_pairs: data.metadata?.total_qa_pairs || 0,
            author: data.metadata?.author || 'Unknown',
        },
        categories,
        evaluation_config: data.evaluation_config || {
            scoring_weights: {
                keyword_coverage: 0.40,
                intent_match: 0.30,
                factual_accuracy: 0.20,
                tone_appropriateness: 0.10,
            },
            target_metrics: {
                overall_accuracy: 0.90,
                compliance_accuracy: 1.00,
                product_recommendations: 0.85,
                store_information: 0.95,
            },
            priority_levels: {
                critical: 'Must be 100% accurate',
                high: 'Target 95% accuracy',
                medium: 'Target 85% accuracy',
            },
        },
        maintenance_schedule: data.maintenance_schedule || {
            weekly: [],
            monthly: [],
            quarterly: [],
        },
    };

    // Validate the reconstructed object
    const validation = GroundTruthQASetSchema.safeParse(groundTruth);
    if (!validation.success) {
        logger.error(`[Grounding] Invalid Firestore data for ${brandId}`, { error: validation.error.message });
        return null;
    }

    return groundTruth;
}

/**
 * Get the source of ground truth for a brand
 */
export async function getGroundTruthSource(brandId: string): Promise<'firestore' | 'code' | 'none'> {
    const normalizedId = brandId.startsWith('brand_')
        ? brandId.replace('brand_', '')
        : brandId;

    // Check Firestore first
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('ground_truth').doc(normalizedId).get();
        if (doc.exists) return 'firestore';
    } catch (error) {
        // Continue to code check
    }

    // Check code registry
    if (normalizedId in GROUND_TRUTH_REGISTRY || brandId in GROUND_TRUTH_REGISTRY) {
        return 'code';
    }

    return 'none';
}
