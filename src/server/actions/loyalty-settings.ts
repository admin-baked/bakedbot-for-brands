'use server';

/**
 * Loyalty Settings Server Actions
 *
 * CRUD for tenant-specific loyalty program configuration.
 * Stored at: tenants/{orgId}/settings/loyalty
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { DEFAULT_LOYALTY_SETTINGS } from '@/types/customers';
import type { LoyaltySettings, LoyaltyTier, RedemptionTier, SegmentThresholds, LoyaltyMenuDisplay, DiscountProgram } from '@/types/customers';
import { requireUser } from '@/server/auth/auth';

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

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }
    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

/**
 * Public (no auth) — fetch only the menu-display-relevant fields for a given orgId.
 * Called from public menu pages to render the loyalty/discount bar.
 */
export async function getPublicMenuSettings(orgId: string): Promise<{
    pointsPerDollar: number;
    menuDisplay: LoyaltyMenuDisplay;
    discountPrograms: DiscountProgram[];
} | null> {
    try {
        if (!isValidDocumentId(orgId)) return null;
        const db = getAdminFirestore();
        const doc = await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('loyalty')
            .get();

        const defaults = DEFAULT_LOYALTY_SETTINGS;
        const saved = doc.exists ? (doc.data() as Partial<LoyaltySettings>) : {};

        return {
            pointsPerDollar: saved.pointsPerDollar ?? defaults.pointsPerDollar,
            menuDisplay: { ...defaults.menuDisplay!, ...(saved.menuDisplay || {}) },
            discountPrograms: saved.discountPrograms?.length
                ? saved.discountPrograms
                : (defaults.discountPrograms ?? []),
        };
    } catch (error: unknown) {
        logger.error('[LOYALTY_SETTINGS] getPublicMenuSettings failed', { error, orgId });
        return null;
    }
}

/**
 * Get loyalty settings for an org. Falls back to defaults if none saved.
 */
export async function getLoyaltySettings(orgId: string): Promise<{
    success: boolean;
    data?: LoyaltySettings;
    error?: string;
}> {
    try {
        const user = await requireUser();
        if (!isValidDocumentId(orgId)) throw new Error('orgId is required');
        assertOrgAccess(user, orgId);

        const db = getAdminFirestore();
        const doc = await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('loyalty')
            .get();

        if (!doc.exists) {
            return { success: true, data: DEFAULT_LOYALTY_SETTINGS };
        }

        const saved = doc.data() as Partial<LoyaltySettings>;
        // Merge with defaults so new fields are always present
        const merged: LoyaltySettings = {
            ...DEFAULT_LOYALTY_SETTINGS,
            ...saved,
            tiers: saved.tiers?.length ? saved.tiers : DEFAULT_LOYALTY_SETTINGS.tiers,
            redemptionTiers: saved.redemptionTiers?.length ? saved.redemptionTiers : DEFAULT_LOYALTY_SETTINGS.redemptionTiers,
            segmentThresholds: {
                ...DEFAULT_LOYALTY_SETTINGS.segmentThresholds!,
                ...(saved.segmentThresholds || {}),
            },
        };

        return { success: true, data: merged };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[LOYALTY_SETTINGS] getLoyaltySettings failed', { error, orgId });
        return { success: false, error: msg };
    }
}

/**
 * Update the full loyalty settings document.
 */
export async function updateLoyaltySettings(
    orgId: string,
    settings: Partial<LoyaltySettings>
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['dispensary', 'super_user']);

        if (!isValidDocumentId(orgId)) throw new Error('orgId is required');
        assertOrgAccess(user, orgId);

        const db = getAdminFirestore();
        await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('loyalty')
            .set({
                ...settings,
                updatedAt: new Date(),
            }, { merge: true });

        logger.info('[LOYALTY_SETTINGS] Settings updated', { orgId });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[LOYALTY_SETTINGS] updateLoyaltySettings failed', { error, orgId });
        return { success: false, error: msg };
    }
}

/**
 * Update only the segment thresholds section.
 */
export async function updateSegmentThresholds(
    orgId: string,
    thresholds: Partial<SegmentThresholds>
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['dispensary', 'super_user']);

        if (!isValidDocumentId(orgId)) throw new Error('orgId is required');
        assertOrgAccess(user, orgId);

        const db = getAdminFirestore();
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        for (const [key, value] of Object.entries(thresholds)) {
            updateData[`segmentThresholds.${key}`] = value;
        }

        await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('loyalty')
            .set(updateData, { merge: true });

        logger.info('[LOYALTY_SETTINGS] Segment thresholds updated', { orgId, thresholds });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[LOYALTY_SETTINGS] updateSegmentThresholds failed', { error, orgId });
        return { success: false, error: msg };
    }
}

/**
 * Add or update a loyalty tier.
 */
export async function upsertLoyaltyTier(
    orgId: string,
    tier: LoyaltyTier
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['dispensary', 'super_user']);
        if (!isValidDocumentId(orgId)) {
            throw new Error('orgId is required');
        }
        assertOrgAccess(user, orgId);

        const { data: current } = await getLoyaltySettings(orgId);
        const tiers = current?.tiers ?? [...DEFAULT_LOYALTY_SETTINGS.tiers];
        const idx = tiers.findIndex(t => t.id === tier.id);
        if (idx >= 0) tiers[idx] = tier;
        else tiers.push(tier);

        return updateLoyaltySettings(orgId, { tiers });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Delete a loyalty tier by id.
 */
export async function deleteLoyaltyTier(
    orgId: string,
    tierId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['dispensary', 'super_user']);
        if (!isValidDocumentId(orgId)) {
            throw new Error('orgId is required');
        }
        assertOrgAccess(user, orgId);

        const { data: current } = await getLoyaltySettings(orgId);
        const tiers = (current?.tiers ?? []).filter(t => t.id !== tierId);
        return updateLoyaltySettings(orgId, { tiers });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Add or update a redemption tier.
 */
export async function upsertRedemptionTier(
    orgId: string,
    tier: RedemptionTier
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser(['dispensary', 'super_user']);
        if (!isValidDocumentId(orgId)) {
            throw new Error('orgId is required');
        }
        assertOrgAccess(user, orgId);

        const { data: current } = await getLoyaltySettings(orgId);
        const tiers = current?.redemptionTiers ?? [...DEFAULT_LOYALTY_SETTINGS.redemptionTiers!];
        const idx = tiers.findIndex(t => t.id === tier.id);
        if (idx >= 0) tiers[idx] = tier;
        else tiers.push(tier);

        return updateLoyaltySettings(orgId, { redemptionTiers: tiers });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}
