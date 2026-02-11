'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { StylePreset, MediaABTest, MediaABTestResult } from '@/types/media-generation';
import { getBuiltInPresets } from '@/server/services/style-presets';
import { logger } from '@/lib/logger';

/**
 * Get all available style presets (built-in + custom)
 */
export async function getStylePresets(tenantId: string): Promise<StylePreset[]> {
    const user = await requireUser();

    // Verify access
    if (user.brandId !== tenantId && user.role !== 'super_user') {
        throw new Error('Unauthorized');
    }

    const db = getAdminFirestore();

    // Get custom presets for this tenant
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('style_presets')
        .orderBy('usageCount', 'desc')
        .get();

    const customPresets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StylePreset));

    // Combine with built-in presets
    return [...getBuiltInPresets(), ...customPresets];
}

/**
 * Create a custom style preset
 */
export async function createStylePreset(
    tenantId: string,
    preset: Omit<StylePreset, 'id' | 'tenantId' | 'category' | 'usageCount' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; presetId?: string; error?: string }> {
    try {
        const user = await requireUser();

        // Verify access
        if (user.brandId !== tenantId && user.role !== 'super_user') {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('style_presets')
            .doc();

        const now = Date.now();

        await docRef.set({
            ...preset,
            id: docRef.id,
            tenantId,
            category: 'custom',
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[Style Presets] Created custom preset', { tenantId, presetId: docRef.id });

        return { success: true, presetId: docRef.id };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Style Presets] Failed to create preset', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Update a custom style preset
 */
export async function updateStylePreset(
    tenantId: string,
    presetId: string,
    updates: Partial<StylePreset>
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();

        // Verify access
        if (user.brandId !== tenantId && user.role !== 'super_user') {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('style_presets')
            .doc(presetId)
            .update({
                ...updates,
                updatedAt: Date.now(),
            });

        logger.info('[Style Presets] Updated preset', { tenantId, presetId });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Style Presets] Failed to update preset', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Delete a custom style preset
 */
export async function deleteStylePreset(
    tenantId: string,
    presetId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();

        // Verify access
        if (user.brandId !== tenantId && user.role !== 'super_user') {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('style_presets')
            .doc(presetId)
            .delete();

        logger.info('[Style Presets] Deleted preset', { tenantId, presetId });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Style Presets] Failed to delete preset', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Increment usage count for a preset
 */
export async function trackPresetUsage(tenantId: string, presetId: string): Promise<void> {
    try {
        const db = getAdminFirestore();

        // Try to update custom preset usage count
        const presetRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('style_presets')
            .doc(presetId);

        const doc = await presetRef.get();
        if (doc.exists) {
            await presetRef.update({
                usageCount: (doc.data()?.usageCount || 0) + 1,
                updatedAt: Date.now(),
            });
        }
    } catch (error) {
        logger.warn('[Style Presets] Failed to track usage', { error, tenantId, presetId });
        // Don't throw - usage tracking failure shouldn't block generation
    }
}

/**
 * Get all A/B tests for a tenant
 */
export async function getMediaABTests(tenantId: string): Promise<MediaABTest[]> {
    const user = await requireUser();

    // Verify access
    if (user.brandId !== tenantId && user.role !== 'super_user') {
        throw new Error('Unauthorized');
    }

    const db = getAdminFirestore();
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('ab_tests')
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaABTest));
}

/**
 * Create an A/B test
 */
export async function createMediaABTest(
    tenantId: string,
    test: Omit<MediaABTest, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; testId?: string; error?: string }> {
    try {
        const user = await requireUser();

        // Verify access
        if (user.brandId !== tenantId && user.role !== 'super_user') {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ab_tests')
            .doc();

        const now = Date.now();

        await docRef.set({
            ...test,
            id: docRef.id,
            tenantId,
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[A/B Test] Created test', { tenantId, testId: docRef.id });

        return { success: true, testId: docRef.id };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[A/B Test] Failed to create test', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Get A/B test results
 */
export async function getMediaABTestResults(
    tenantId: string,
    testId: string
): Promise<MediaABTestResult[]> {
    const user = await requireUser();

    // Verify access
    if (user.brandId !== tenantId && user.role !== 'super_user') {
        throw new Error('Unauthorized');
    }

    const db = getAdminFirestore();
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('ab_tests')
        .doc(testId)
        .collection('results')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaABTestResult));
}

/**
 * Update A/B test results
 */
export async function updateMediaABTestResult(
    tenantId: string,
    testId: string,
    variantId: string,
    metrics: Partial<Pick<MediaABTestResult, 'impressions' | 'clicks' | 'conversions' | 'engagement' | 'costUsd'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();

        // Verify access
        if (user.brandId !== tenantId && user.role !== 'super_user') {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const resultRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('ab_tests')
            .doc(testId)
            .collection('results')
            .doc(variantId);

        const doc = await resultRef.get();
        const currentData = doc.exists ? (doc.data() as MediaABTestResult) : null;

        // Calculate new metrics
        const newImpressions = (currentData?.impressions || 0) + (metrics.impressions || 0);
        const newClicks = (currentData?.clicks || 0) + (metrics.clicks || 0);
        const newConversions = (currentData?.conversions || 0) + (metrics.conversions || 0);
        const newEngagement = (currentData?.engagement || 0) + (metrics.engagement || 0);
        const newCost = (currentData?.costUsd || 0) + (metrics.costUsd || 0);

        // Calculate rates
        const ctr = newImpressions > 0 ? (newClicks / newImpressions) * 100 : 0;
        const cvr = newClicks > 0 ? (newConversions / newClicks) * 100 : 0;
        const cpc = newClicks > 0 ? newCost / newClicks : 0;
        const cpconv = newConversions > 0 ? newCost / newConversions : 0;
        const engagementRate = newImpressions > 0 ? (newEngagement / newImpressions) * 100 : 0;

        await resultRef.set(
            {
                id: variantId,
                testId,
                variantId,
                impressions: newImpressions,
                clicks: newClicks,
                conversions: newConversions,
                engagement: newEngagement,
                costUsd: newCost,
                ctr,
                cvr,
                cpc,
                cpconv,
                engagementRate,
                isWinner: false, // Will be calculated separately
                updatedAt: Date.now(),
            },
            { merge: true }
        );

        logger.info('[A/B Test] Updated result', { tenantId, testId, variantId });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[A/B Test] Failed to update result', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}
