'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { MediaBudget, MediaCostAlert } from '@/types/media-generation';
import { logger } from '@/lib/logger';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocumentId(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length >= 3 &&
        value.length <= 128 &&
        !/[\/\\?#\[\]]/.test(value)
    );
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

function assertTenantAccess(user: unknown, tenantId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }
    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== tenantId) {
        throw new Error('Unauthorized');
    }
}

/**
 * Get media budget configuration for a tenant
 */
export async function getMediaBudget(tenantId: string): Promise<MediaBudget | null> {
    if (!isValidDocumentId(tenantId)) {
        throw new Error('Invalid tenant ID');
    }
    const user = await requireUser();
    assertTenantAccess(user, tenantId);

    const db = getAdminFirestore();
    const doc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('media_budget')
        .get();

    if (!doc.exists) {
        return null;
    }

    return { id: doc.id, ...doc.data() } as MediaBudget;
}

/**
 * Update media budget configuration
 */
export async function updateMediaBudget(
    tenantId: string,
    budget: Partial<MediaBudget>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!isValidDocumentId(tenantId)) {
            return { success: false, error: 'Invalid tenant ID' };
        }
        const user = await requireUser();
        assertTenantAccess(user, tenantId);

        const db = getAdminFirestore();
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('media_budget');

        const now = Date.now();

        await docRef.set(
            {
                ...budget,
                tenantId,
                updatedAt: now,
                ...(!(await docRef.get()).exists && { createdAt: now }),
            },
            { merge: true }
        );

        logger.info('[Media Budget] Budget updated', { tenantId, budget });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Media Budget] Failed to update budget', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Get all cost alerts for a tenant
 */
export async function getMediaCostAlerts(tenantId: string): Promise<MediaCostAlert[]> {
    if (!isValidDocumentId(tenantId)) {
        throw new Error('Invalid tenant ID');
    }
    const user = await requireUser();
    assertTenantAccess(user, tenantId);

    const db = getAdminFirestore();
    const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('cost_alerts')
        .orderBy('createdAt', 'desc')
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaCostAlert));
}

/**
 * Create a new cost alert
 */
export async function createMediaCostAlert(
    tenantId: string,
    alert: Omit<MediaCostAlert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
        if (!isValidDocumentId(tenantId)) {
            return { success: false, error: 'Invalid tenant ID' };
        }
        const user = await requireUser();
        assertTenantAccess(user, tenantId);

        const db = getAdminFirestore();
        const docRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('cost_alerts')
            .doc();

        const now = Date.now();

        await docRef.set({
            ...alert,
            id: docRef.id,
            tenantId,
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[Media Budget] Alert created', { tenantId, alertId: docRef.id });

        return { success: true, alertId: docRef.id };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Media Budget] Failed to create alert', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Update a cost alert
 */
export async function updateMediaCostAlert(
    tenantId: string,
    alertId: string,
    updates: Partial<MediaCostAlert>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!isValidDocumentId(tenantId)) {
            return { success: false, error: 'Invalid tenant ID' };
        }
        if (!isValidDocumentId(alertId)) {
            return { success: false, error: 'Invalid alert ID' };
        }
        const user = await requireUser();
        assertTenantAccess(user, tenantId);

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('cost_alerts')
            .doc(alertId)
            .update({
                ...updates,
                updatedAt: Date.now(),
            });

        logger.info('[Media Budget] Alert updated', { tenantId, alertId });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Media Budget] Failed to update alert', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Delete a cost alert
 */
export async function deleteMediaCostAlert(
    tenantId: string,
    alertId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!isValidDocumentId(tenantId)) {
            return { success: false, error: 'Invalid tenant ID' };
        }
        if (!isValidDocumentId(alertId)) {
            return { success: false, error: 'Invalid alert ID' };
        }
        const user = await requireUser();
        assertTenantAccess(user, tenantId);

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('cost_alerts')
            .doc(alertId)
            .delete();

        logger.info('[Media Budget] Alert deleted', { tenantId, alertId });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Media Budget] Failed to delete alert', { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

/**
 * Get budget status (current spend vs limits)
 */
export async function getMediaBudgetStatus(tenantId: string): Promise<{
    daily: { spent: number; limit?: number; remaining: number };
    weekly: { spent: number; limit?: number; remaining: number };
    monthly: { spent: number; limit?: number; remaining: number };
}> {
    if (!isValidDocumentId(tenantId)) {
        throw new Error('Invalid tenant ID');
    }
    const user = await requireUser();
    assertTenantAccess(user, tenantId);

    const { checkMediaBudget } = await import('@/server/services/media-budget');
    const result = await checkMediaBudget(tenantId, 0); // Check with 0 cost to get current status

    return {
        daily: {
            spent: result.daily?.spendUsd || 0,
            limit: result.daily?.limitUsd,
            remaining: result.daily?.remainingUsd || 0,
        },
        weekly: {
            spent: result.weekly?.spendUsd || 0,
            limit: result.weekly?.limitUsd,
            remaining: result.weekly?.remainingUsd || 0,
        },
        monthly: {
            spent: result.monthly?.spendUsd || 0,
            limit: result.monthly?.limitUsd,
            remaining: result.monthly?.remainingUsd || 0,
        },
    };
}
