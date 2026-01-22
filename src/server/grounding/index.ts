/**
 * Ground Truth Registry
 *
 * Central registry for all customer ground truth QA sets.
 * Maps brand IDs to their grounding data for Smokey.
 */

import { GroundTruthQASet } from '@/types/ground-truth';
import { logger } from '@/lib/logger';

// --- Customer Ground Truth Imports ---
import { thriveGroundTruth, THRIVE_SYRACUSE_BRAND_ID } from './customers/thrive-syracuse';

// Re-export builder utilities
export {
    buildGroundingInstructions,
    buildCondensedGrounding,
    findMatchingQA,
    getGroundingContext,
    type GroundingSection,
} from './builder';

// Re-export dynamic loader (Firestore-first with code fallback)
export {
    loadGroundTruth,
    hasGroundTruthDynamic,
    hasGroundTruthSync,
    getGroundTruthSource,
} from './dynamic-loader';

// Re-export types
export type { GroundTruthQASet, GroundTruthQAPair, GroundTruthCategory } from '@/types/ground-truth';

// --- Ground Truth Registry ---

/**
 * Registry mapping brand IDs to their ground truth QA sets.
 * Add new pilot customers here.
 */
export const GROUND_TRUTH_REGISTRY: Record<string, GroundTruthQASet> = {
    [THRIVE_SYRACUSE_BRAND_ID]: thriveGroundTruth,
    // Add more pilot customers as they onboard:
    // 'nextcustomer': nextCustomerGroundTruth,
};

/**
 * Get ground truth for a brand by ID
 */
export function getGroundTruth(brandId: string): GroundTruthQASet | null {
    const groundTruth = GROUND_TRUTH_REGISTRY[brandId];

    if (!groundTruth) {
        logger.debug(`[Grounding] No ground truth found for brand: ${brandId}`);
        return null;
    }

    logger.info(`[Grounding] Loaded ground truth for ${groundTruth.metadata.dispensary} (v${groundTruth.metadata.version})`);
    return groundTruth;
}

/**
 * Check if a brand has ground truth configured
 */
export function hasGroundTruth(brandId: string): boolean {
    return brandId in GROUND_TRUTH_REGISTRY;
}

/**
 * List all brands with ground truth configured
 */
export function listGroundedBrands(): Array<{ brandId: string; dispensary: string; version: string }> {
    return Object.entries(GROUND_TRUTH_REGISTRY).map(([brandId, gt]) => ({
        brandId,
        dispensary: gt.metadata.dispensary,
        version: gt.metadata.version,
    }));
}

/**
 * Get ground truth statistics
 */
export function getGroundTruthStats(brandId: string): {
    totalQAPairs: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    categories: string[];
} | null {
    const groundTruth = getGroundTruth(brandId);
    if (!groundTruth) return null;

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (const category of Object.values(groundTruth.categories)) {
        for (const qa of category.qa_pairs) {
            if (qa.priority === 'critical') criticalCount++;
            else if (qa.priority === 'high') highCount++;
            else mediumCount++;
        }
    }

    return {
        totalQAPairs: groundTruth.metadata.total_qa_pairs,
        criticalCount,
        highCount,
        mediumCount,
        categories: Object.keys(groundTruth.categories),
    };
}

// --- Default Export ---
export default {
    getGroundTruth,
    hasGroundTruth,
    listGroundedBrands,
    getGroundTruthStats,
    GROUND_TRUTH_REGISTRY,
};
