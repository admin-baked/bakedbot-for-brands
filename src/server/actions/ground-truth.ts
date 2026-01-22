'use server';

/**
 * Ground Truth Server Actions
 *
 * CRUD operations for managing Ground Truth QA sets.
 * Access Control:
 * - Super admins: Full access to all brands
 * - Brand owners: Access only to their own brand
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import {
    GROUND_TRUTH_REGISTRY,
    listGroundedBrands,
    buildGroundingInstructions,
    findMatchingQA,
} from '@/server/grounding';
import type {
    GroundTruthQASet,
    GroundTruthQAPair,
    GroundTruthCategory,
    GroundTruthMetadata,
    EvaluationConfig,
    MaintenanceSchedule,
    QAPriority,
} from '@/types/ground-truth';
import { QAPairSchema, GroundTruthQASetSchema } from '@/types/ground-truth';

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T = undefined> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface GroundTruthBrandSummary {
    brandId: string;
    dispensary: string;
    version: string;
    totalQAPairs: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lastUpdated: string;
    source: 'firestore' | 'code';
    ownerUid?: string;
}

export interface CategorySummary {
    key: string;
    description: string;
    qaPairCount: number;
    sortOrder: number;
}

export interface TestResult {
    question: string;
    matchedQA: GroundTruthQAPair | null;
    matchConfidence: number;
    smokeyResponse: string;
    idealAnswer: string;
    score: {
        overall: number;
        keywordCoverage: number;
        intentMatch: number;
    };
    passed: boolean;
}

// ============================================================================
// Access Control Helpers
// ============================================================================

/**
 * Check if user can access a brand's ground truth
 */
async function canAccessBrand(userId: string, userRole: string, brandId: string): Promise<boolean> {
    // Super admins can access all
    if (userRole === 'super_user' || userRole === 'super_admin') {
        return true;
    }

    // Check if user owns the brand
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.brandId === brandId || userData?.brandId === `brand_${brandId}`) {
        return true;
    }

    // Check Firestore ground truth for owner_uid
    const gtDoc = await db.collection('ground_truth').doc(brandId).get();
    if (gtDoc.exists && gtDoc.data()?.metadata?.owner_uid === userId) {
        return true;
    }

    return false;
}

/**
 * Require access to a brand's ground truth
 */
async function requireBrandAccess(brandId: string): Promise<{ userId: string; isSuperAdmin: boolean }> {
    const token = await requireUser();
    const userId = token.uid;
    const userRole = token.role as string;
    const isSuperAdmin = userRole === 'super_user' || userRole === 'super_admin';

    if (!isSuperAdmin) {
        const hasAccess = await canAccessBrand(userId, userRole, brandId);
        if (!hasAccess) {
            throw new Error('Forbidden: You do not have access to this brand\'s ground truth');
        }
    }

    return { userId, isSuperAdmin };
}

// ============================================================================
// READ Operations
// ============================================================================

/**
 * List all brands with ground truth (merged from Firestore and code registry)
 */
export async function listAllGroundTruthBrands(): Promise<ActionResult<GroundTruthBrandSummary[]>> {
    try {
        const token = await requireUser();
        const userId = token.uid;
        const userRole = token.role as string;
        const isSuperAdmin = userRole === 'super_user' || userRole === 'super_admin';

        const brands: GroundTruthBrandSummary[] = [];
        const seenBrandIds = new Set<string>();

        // 1. Fetch from Firestore
        const db = getAdminFirestore();
        const firestoreSnap = await db.collection('ground_truth').get();

        for (const doc of firestoreSnap.docs) {
            const data = doc.data();
            const brandId = doc.id;

            // Access check for non-super admins
            if (!isSuperAdmin) {
                const hasAccess = await canAccessBrand(userId, userRole, brandId);
                if (!hasAccess) continue;
            }

            // Count QA pairs by priority
            let totalQAPairs = 0;
            let criticalCount = 0;
            let highCount = 0;
            let mediumCount = 0;

            const categoriesSnap = await doc.ref.collection('categories').get();
            for (const catDoc of categoriesSnap.docs) {
                const pairsSnap = await catDoc.ref.collection('qa_pairs').get();
                for (const pairDoc of pairsSnap.docs) {
                    totalQAPairs++;
                    const priority = pairDoc.data().priority;
                    if (priority === 'critical') criticalCount++;
                    else if (priority === 'high') highCount++;
                    else mediumCount++;
                }
            }

            brands.push({
                brandId,
                dispensary: data.metadata?.dispensary || brandId,
                version: data.metadata?.version || '1.0',
                totalQAPairs,
                criticalCount,
                highCount,
                mediumCount,
                lastUpdated: data.metadata?.last_updated || new Date().toISOString(),
                source: 'firestore',
                ownerUid: data.metadata?.owner_uid,
            });
            seenBrandIds.add(brandId);
        }

        // 2. Add from code registry (if not already in Firestore)
        const codeBrands = listGroundedBrands();
        for (const codeBrand of codeBrands) {
            if (seenBrandIds.has(codeBrand.brandId)) continue;

            // Access check for non-super admins
            if (!isSuperAdmin) {
                const hasAccess = await canAccessBrand(userId, userRole, codeBrand.brandId);
                if (!hasAccess) continue;
            }

            const gt = GROUND_TRUTH_REGISTRY[codeBrand.brandId];
            if (!gt) continue;

            // Count QA pairs
            let totalQAPairs = 0;
            let criticalCount = 0;
            let highCount = 0;
            let mediumCount = 0;

            for (const category of Object.values(gt.categories)) {
                for (const qa of category.qa_pairs) {
                    totalQAPairs++;
                    if (qa.priority === 'critical') criticalCount++;
                    else if (qa.priority === 'high') highCount++;
                    else mediumCount++;
                }
            }

            brands.push({
                brandId: codeBrand.brandId,
                dispensary: codeBrand.dispensary,
                version: codeBrand.version,
                totalQAPairs,
                criticalCount,
                highCount,
                mediumCount,
                lastUpdated: gt.metadata.last_updated,
                source: 'code',
            });
        }

        return { success: true, message: 'Brands retrieved', data: brands };
    } catch (error) {
        logger.error('[GroundTruth] listAllGroundTruthBrands error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to list brands',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get full ground truth for a brand (Firestore-first, fallback to code)
 */
export async function getGroundTruthForBrand(brandId: string): Promise<ActionResult<GroundTruthQASet>> {
    try {
        await requireBrandAccess(brandId);

        // 1. Try Firestore first
        const db = getAdminFirestore();
        const gtDoc = await db.collection('ground_truth').doc(brandId).get();

        if (gtDoc.exists) {
            const data = gtDoc.data()!;
            const categories: Record<string, GroundTruthCategory> = {};

            // Load categories and QA pairs
            const categoriesSnap = await gtDoc.ref.collection('categories').orderBy('sort_order').get();
            for (const catDoc of categoriesSnap.docs) {
                const catData = catDoc.data();
                const pairsSnap = await catDoc.ref.collection('qa_pairs').get();
                const qa_pairs = pairsSnap.docs.map(p => ({
                    id: p.id,
                    ...p.data(),
                })) as GroundTruthQAPair[];

                categories[catDoc.id] = {
                    description: catData.description,
                    qa_pairs,
                };
            }

            const groundTruth: GroundTruthQASet = {
                metadata: data.metadata,
                categories,
                evaluation_config: data.evaluation_config,
                maintenance_schedule: data.maintenance_schedule,
            };

            return { success: true, message: 'Ground truth retrieved from Firestore', data: groundTruth };
        }

        // 2. Fallback to code registry
        const codeGT = GROUND_TRUTH_REGISTRY[brandId];
        if (codeGT) {
            return { success: true, message: 'Ground truth retrieved from code registry', data: codeGT };
        }

        return { success: false, message: 'No ground truth found for this brand' };
    } catch (error) {
        logger.error('[GroundTruth] getGroundTruthForBrand error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to get ground truth',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get categories for a brand
 */
export async function getCategories(brandId: string): Promise<ActionResult<CategorySummary[]>> {
    try {
        await requireBrandAccess(brandId);

        const db = getAdminFirestore();
        const gtDoc = await db.collection('ground_truth').doc(brandId).get();

        if (gtDoc.exists) {
            const categories: CategorySummary[] = [];
            const categoriesSnap = await gtDoc.ref.collection('categories').orderBy('sort_order').get();

            for (const catDoc of categoriesSnap.docs) {
                const catData = catDoc.data();
                const pairsSnap = await catDoc.ref.collection('qa_pairs').count().get();

                categories.push({
                    key: catDoc.id,
                    description: catData.description,
                    qaPairCount: pairsSnap.data().count,
                    sortOrder: catData.sort_order ?? 0,
                });
            }

            return { success: true, message: 'Categories retrieved', data: categories };
        }

        // Fallback to code registry
        const codeGT = GROUND_TRUTH_REGISTRY[brandId];
        if (codeGT) {
            const categories: CategorySummary[] = Object.entries(codeGT.categories).map(([key, cat], index) => ({
                key,
                description: cat.description,
                qaPairCount: cat.qa_pairs.length,
                sortOrder: index,
            }));
            return { success: true, message: 'Categories retrieved from code', data: categories };
        }

        return { success: false, message: 'No ground truth found' };
    } catch (error) {
        logger.error('[GroundTruth] getCategories error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to get categories',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get QA pairs for a category
 */
export async function getQAPairs(
    brandId: string,
    categoryKey: string
): Promise<ActionResult<GroundTruthQAPair[]>> {
    try {
        await requireBrandAccess(brandId);

        const db = getAdminFirestore();
        const categoryRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey);

        const categoryDoc = await categoryRef.get();

        if (categoryDoc.exists) {
            const pairsSnap = await categoryRef.collection('qa_pairs').get();
            const pairs = pairsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as GroundTruthQAPair[];

            return { success: true, message: 'QA pairs retrieved', data: pairs };
        }

        // Fallback to code registry
        const codeGT = GROUND_TRUTH_REGISTRY[brandId];
        if (codeGT && codeGT.categories[categoryKey]) {
            return {
                success: true,
                message: 'QA pairs retrieved from code',
                data: codeGT.categories[categoryKey].qa_pairs,
            };
        }

        return { success: false, message: 'Category not found' };
    } catch (error) {
        logger.error('[GroundTruth] getQAPairs error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to get QA pairs',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// WRITE Operations
// ============================================================================

/**
 * Create new ground truth for a brand (super admin only for new brands)
 */
export async function createGroundTruth(config: {
    brandId: string;
    dispensary: string;
    address: string;
    author: string;
    ownerUid?: string;
}): Promise<ActionResult<{ brandId: string }>> {
    try {
        const token = await requireUser(['super_user']);
        const db = getAdminFirestore();

        // Check if already exists
        const existingDoc = await db.collection('ground_truth').doc(config.brandId).get();
        if (existingDoc.exists) {
            return { success: false, message: 'Ground truth already exists for this brand' };
        }

        const now = new Date().toISOString();
        const metadata: GroundTruthMetadata & { owner_uid?: string } = {
            dispensary: config.dispensary,
            brandId: config.brandId,
            address: config.address,
            version: '1.0',
            created: now,
            last_updated: now,
            total_qa_pairs: 0,
            author: config.author,
            owner_uid: config.ownerUid,
        };

        const defaultEvaluationConfig: EvaluationConfig = {
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
                critical: 'Must be 100% accurate - regulatory and safety content',
                high: 'Target 95% accuracy - frequently asked questions',
                medium: 'Target 85% accuracy - supplementary information',
            },
        };

        const defaultMaintenanceSchedule: MaintenanceSchedule = {
            weekly: ['Review chat logs for new question patterns'],
            monthly: ['Update product and inventory answers'],
            quarterly: ['Full QA set audit'],
        };

        await db.collection('ground_truth').doc(config.brandId).set({
            metadata,
            evaluation_config: defaultEvaluationConfig,
            maintenance_schedule: defaultMaintenanceSchedule,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
        });

        logger.info(`[GroundTruth] Created ground truth for ${config.brandId}`);
        return { success: true, message: 'Ground truth created', data: { brandId: config.brandId } };
    } catch (error) {
        logger.error('[GroundTruth] createGroundTruth error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to create ground truth',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Update ground truth metadata
 */
export async function updateMetadata(
    brandId: string,
    updates: Partial<GroundTruthMetadata>
): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const gtRef = db.collection('ground_truth').doc(brandId);
        const gtDoc = await gtRef.get();

        if (!gtDoc.exists) {
            return { success: false, message: 'Ground truth not found' };
        }

        await gtRef.update({
            'metadata.dispensary': updates.dispensary ?? gtDoc.data()?.metadata?.dispensary,
            'metadata.address': updates.address ?? gtDoc.data()?.metadata?.address,
            'metadata.version': updates.version ?? gtDoc.data()?.metadata?.version,
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'Metadata updated' };
    } catch (error) {
        logger.error('[GroundTruth] updateMetadata error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to update metadata',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Add a category
 */
export async function addCategory(
    brandId: string,
    category: { key: string; description: string }
): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const gtRef = db.collection('ground_truth').doc(brandId);
        const gtDoc = await gtRef.get();

        if (!gtDoc.exists) {
            return { success: false, message: 'Ground truth not found. Create it first.' };
        }

        // Get current category count for sort order
        const categoriesSnap = await gtRef.collection('categories').get();
        const sortOrder = categoriesSnap.size;

        await gtRef.collection('categories').doc(category.key).set({
            description: category.description,
            sort_order: sortOrder,
            created_at: FieldValue.serverTimestamp(),
        });

        await gtRef.update({
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'Category added' };
    } catch (error) {
        logger.error('[GroundTruth] addCategory error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to add category',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Update a category
 */
export async function updateCategory(
    brandId: string,
    categoryKey: string,
    updates: { description?: string; sortOrder?: number }
): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const categoryRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey);

        const categoryDoc = await categoryRef.get();
        if (!categoryDoc.exists) {
            return { success: false, message: 'Category not found' };
        }

        const updateData: Record<string, any> = {};
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
        updateData.updated_at = FieldValue.serverTimestamp();

        await categoryRef.update(updateData);

        return { success: true, message: 'Category updated' };
    } catch (error) {
        logger.error('[GroundTruth] updateCategory error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to update category',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Delete a category (and all its QA pairs)
 */
export async function deleteCategory(brandId: string, categoryKey: string): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const categoryRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey);

        const categoryDoc = await categoryRef.get();
        if (!categoryDoc.exists) {
            return { success: false, message: 'Category not found' };
        }

        // Delete all QA pairs first
        const pairsSnap = await categoryRef.collection('qa_pairs').get();
        const batch = db.batch();
        for (const doc of pairsSnap.docs) {
            batch.delete(doc.ref);
        }
        batch.delete(categoryRef);
        await batch.commit();

        // Update metadata
        const gtRef = db.collection('ground_truth').doc(brandId);
        await gtRef.update({
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'Category deleted' };
    } catch (error) {
        logger.error('[GroundTruth] deleteCategory error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to delete category',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Add a QA pair
 */
export async function addQAPair(
    brandId: string,
    categoryKey: string,
    qa: Omit<GroundTruthQAPair, 'id'>
): Promise<ActionResult<{ qaId: string }>> {
    try {
        await requireBrandAccess(brandId);

        // Validate QA pair
        const validation = QAPairSchema.omit({ id: true }).safeParse(qa);
        if (!validation.success) {
            return { success: false, message: 'Invalid QA pair data', error: validation.error.message };
        }

        const db = getAdminFirestore();

        const categoryRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey);

        const categoryDoc = await categoryRef.get();
        if (!categoryDoc.exists) {
            return { success: false, message: 'Category not found. Create it first.' };
        }

        // Generate ID (e.g., "SI-001" based on category prefix)
        const prefix = categoryKey.substring(0, 2).toUpperCase();
        const pairsSnap = await categoryRef.collection('qa_pairs').get();
        const qaId = `${prefix}-${String(pairsSnap.size + 1).padStart(3, '0')}`;

        await categoryRef.collection('qa_pairs').doc(qaId).set({
            ...qa,
            id: qaId,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
        });

        // Update total count and timestamp
        const gtRef = db.collection('ground_truth').doc(brandId);
        const gtDoc = await gtRef.get();
        const currentTotal = gtDoc.data()?.metadata?.total_qa_pairs || 0;

        await gtRef.update({
            'metadata.total_qa_pairs': currentTotal + 1,
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'QA pair added', data: { qaId } };
    } catch (error) {
        logger.error('[GroundTruth] addQAPair error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to add QA pair',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Update a QA pair
 */
export async function updateQAPair(
    brandId: string,
    categoryKey: string,
    qaId: string,
    updates: Partial<Omit<GroundTruthQAPair, 'id'>>
): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const qaRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey)
            .collection('qa_pairs')
            .doc(qaId);

        const qaDoc = await qaRef.get();
        if (!qaDoc.exists) {
            return { success: false, message: 'QA pair not found' };
        }

        await qaRef.update({
            ...updates,
            updated_at: FieldValue.serverTimestamp(),
        });

        // Update timestamp
        const gtRef = db.collection('ground_truth').doc(brandId);
        await gtRef.update({
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'QA pair updated' };
    } catch (error) {
        logger.error('[GroundTruth] updateQAPair error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to update QA pair',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Delete a QA pair
 */
export async function deleteQAPair(
    brandId: string,
    categoryKey: string,
    qaId: string
): Promise<ActionResult> {
    try {
        await requireBrandAccess(brandId);
        const db = getAdminFirestore();

        const qaRef = db
            .collection('ground_truth')
            .doc(brandId)
            .collection('categories')
            .doc(categoryKey)
            .collection('qa_pairs')
            .doc(qaId);

        const qaDoc = await qaRef.get();
        if (!qaDoc.exists) {
            return { success: false, message: 'QA pair not found' };
        }

        await qaRef.delete();

        // Update total count
        const gtRef = db.collection('ground_truth').doc(brandId);
        const gtDoc = await gtRef.get();
        const currentTotal = gtDoc.data()?.metadata?.total_qa_pairs || 1;

        await gtRef.update({
            'metadata.total_qa_pairs': Math.max(0, currentTotal - 1),
            'metadata.last_updated': new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'QA pair deleted' };
    } catch (error) {
        logger.error('[GroundTruth] deleteQAPair error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to delete QA pair',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// Import/Export Operations
// ============================================================================

/**
 * Export ground truth as JSON
 */
export async function exportGroundTruthJSON(brandId: string): Promise<ActionResult<GroundTruthQASet>> {
    try {
        const result = await getGroundTruthForBrand(brandId);
        if (!result.success || !result.data) {
            return { success: false, message: result.message || 'Ground truth not found' };
        }

        return { success: true, message: 'Export successful', data: result.data };
    } catch (error) {
        logger.error('[GroundTruth] exportGroundTruthJSON error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to export',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Import ground truth from JSON
 */
export async function importGroundTruthJSON(
    brandId: string,
    data: GroundTruthQASet
): Promise<ActionResult<{ imported: number }>> {
    try {
        await requireBrandAccess(brandId);

        // Validate the data
        const validation = GroundTruthQASetSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, message: 'Invalid ground truth data', error: validation.error.message };
        }

        const db = getAdminFirestore();
        const gtRef = db.collection('ground_truth').doc(brandId);

        // Check if exists - if so, we're updating
        const gtDoc = await gtRef.get();
        if (!gtDoc.exists) {
            // Create new
            await gtRef.set({
                metadata: {
                    ...data.metadata,
                    last_updated: new Date().toISOString(),
                },
                evaluation_config: data.evaluation_config,
                maintenance_schedule: data.maintenance_schedule,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp(),
            });
        } else {
            // Update metadata
            await gtRef.update({
                metadata: {
                    ...data.metadata,
                    last_updated: new Date().toISOString(),
                },
                evaluation_config: data.evaluation_config,
                maintenance_schedule: data.maintenance_schedule,
                updated_at: FieldValue.serverTimestamp(),
            });
        }

        // Import categories and QA pairs
        let importedCount = 0;

        for (const [categoryKey, category] of Object.entries(data.categories)) {
            const categoryRef = gtRef.collection('categories').doc(categoryKey);

            await categoryRef.set({
                description: category.description,
                sort_order: Object.keys(data.categories).indexOf(categoryKey),
                updated_at: FieldValue.serverTimestamp(),
            });

            for (const qa of category.qa_pairs) {
                await categoryRef.collection('qa_pairs').doc(qa.id).set({
                    ...qa,
                    updated_at: FieldValue.serverTimestamp(),
                });
                importedCount++;
            }
        }

        // Update total count
        await gtRef.update({
            'metadata.total_qa_pairs': importedCount,
            updated_at: FieldValue.serverTimestamp(),
        });

        logger.info(`[GroundTruth] Imported ${importedCount} QA pairs for ${brandId}`);
        return { success: true, message: 'Import successful', data: { imported: importedCount } };
    } catch (error) {
        logger.error('[GroundTruth] importGroundTruthJSON error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to import',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// Testing Operations
// ============================================================================

/**
 * Test a question against ground truth using live Smokey
 */
export async function testQuestionLive(
    brandId: string,
    question: string
): Promise<ActionResult<TestResult>> {
    try {
        await requireBrandAccess(brandId);

        // 1. Get ground truth for matching
        const gtResult = await getGroundTruthForBrand(brandId);
        if (!gtResult.success || !gtResult.data) {
            return { success: false, message: 'Ground truth not found for brand' };
        }

        const groundTruth = gtResult.data;

        // 2. Find matching QA pair
        const matchedQA = findMatchingQA(groundTruth, question);
        const matchConfidence = matchedQA ? 0.85 : 0; // Simple confidence for now

        // 3. Call Smokey API to get actual response
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bakedbot.ai';
        let smokeyResponse = '';

        try {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: question,
                    brandId: brandId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                smokeyResponse = data.message || '';
            } else {
                smokeyResponse = '[Error: Could not get Smokey response]';
            }
        } catch (fetchError) {
            smokeyResponse = '[Error: Failed to call Smokey API]';
        }

        // 4. Calculate score
        const idealAnswer = matchedQA?.ideal_answer || '';
        const keywords = matchedQA?.keywords || [];

        // Keyword coverage
        const keywordsFound = keywords.filter(kw =>
            smokeyResponse.toLowerCase().includes(kw.toLowerCase())
        );
        const keywordCoverage = keywords.length > 0 ? keywordsFound.length / keywords.length : 0;

        // Intent match (simplified - check if response addresses the question)
        const intentMatch = smokeyResponse.length > 50 ? 0.7 : 0.3;

        // Overall score
        const overall = matchedQA
            ? keywordCoverage * 0.5 + intentMatch * 0.3 + (smokeyResponse.length > 100 ? 0.2 : 0.1)
            : 0.5;

        // Determine pass/fail based on priority
        const threshold = matchedQA?.priority === 'critical' ? 0.9 : matchedQA?.priority === 'high' ? 0.8 : 0.7;
        const passed = overall >= threshold;

        const result: TestResult = {
            question,
            matchedQA,
            matchConfidence,
            smokeyResponse,
            idealAnswer,
            score: {
                overall: Math.round(overall * 100) / 100,
                keywordCoverage: Math.round(keywordCoverage * 100) / 100,
                intentMatch: Math.round(intentMatch * 100) / 100,
            },
            passed,
        };

        return { success: true, message: 'Test completed', data: result };
    } catch (error) {
        logger.error('[GroundTruth] testQuestionLive error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to run test',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ============================================================================
// Migration Operations
// ============================================================================

/**
 * Migrate a brand from code registry to Firestore
 */
export async function migrateFromCodeRegistry(brandId: string): Promise<ActionResult<{ migrated: number }>> {
    try {
        await requireUser(['super_user']);

        const codeGT = GROUND_TRUTH_REGISTRY[brandId];
        if (!codeGT) {
            return { success: false, message: 'Brand not found in code registry' };
        }

        // Check if already in Firestore
        const db = getAdminFirestore();
        const existingDoc = await db.collection('ground_truth').doc(brandId).get();
        if (existingDoc.exists) {
            return { success: false, message: 'Brand already exists in Firestore' };
        }

        // Import the code-based ground truth
        const result = await importGroundTruthJSON(brandId, codeGT);
        if (!result.success) {
            return { success: false, message: result.message, error: result.error };
        }

        logger.info(`[GroundTruth] Migrated ${brandId} from code registry to Firestore`);
        return { success: true, message: 'Migration successful', data: { migrated: result.data?.imported ?? 0 } };
    } catch (error) {
        logger.error('[GroundTruth] migrateFromCodeRegistry error', { error: error instanceof Error ? error.message : String(error) });
        return {
            success: false,
            message: 'Failed to migrate',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
