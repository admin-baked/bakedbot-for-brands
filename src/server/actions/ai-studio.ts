'use server';

/**
 * AI Studio Server Actions
 *
 * Public API for AI Studio credit management.
 * All mutations require authenticated session.
 * Admin-only actions require super_user role.
 */

import { requireUser, requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import {
    getAIStudioUsageSummary,
    applyTopUpCredits,
    checkAIStudioActionAllowed,
    grantManualAIStudioCredits,
} from '@/server/services/ai-studio-billing-service';
import { upsertAIStudioEntitlement } from '@/lib/ai-studio/entitlements';
import type {
    AIStudioUsageSummary,
    AIStudioUsageEvent,
    AIStudioTopUpPurchase,
    AIStudioTopUpPackId,
    AIStudioPlanId,
    AIStudioOverrideDoc,
    CheckAIStudioActionInput,
    CheckAIStudioActionResult,
} from '@/types/ai-studio';

// ---------------------------------------------------------------------------
// Customer-facing: usage summary
// ---------------------------------------------------------------------------

/**
 * Returns the current-cycle AI Studio usage summary for the caller's org.
 */
export async function getMyAIStudioUsageSummary(): Promise<AIStudioUsageSummary | null> {
    try {
        const session = await requireUser();
        const db = getAdminFirestore();

        // Resolve orgId from user session
        const userSnap = await db.collection('users').doc(session.uid).get();
        if (!userSnap.exists) return null;
        const orgId = (userSnap.data() as { orgId?: string }).orgId;
        if (!orgId) return null;

        return getAIStudioUsageSummary(orgId);
    } catch (err) {
        logger.error('[AIStudio] getMyAIStudioUsageSummary failed', { err });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Customer-facing: usage events (paginated ledger)
// ---------------------------------------------------------------------------

export interface GetAIStudioUsageEventsInput {
    orgId: string;
    limit?: number;
    startAfter?: number; // createdAt cursor
    actionType?: string;
    automationTriggered?: boolean;
}

export interface GetAIStudioUsageEventsResult {
    events: AIStudioUsageEvent[];
    hasMore: boolean;
}

/**
 * Returns paginated AI Studio usage events for an org.
 * Users can only access their own org. Admins can access any org.
 */
export async function getAIStudioUsageEvents(
    input: GetAIStudioUsageEventsInput
): Promise<GetAIStudioUsageEventsResult> {
    try {
        const session = await requireUser();
        const db = getAdminFirestore();

        // Verify org access
        const userSnap = await db.collection('users').doc(session.uid).get();
        const userOrgId = (userSnap.data() as { orgId?: string; role?: string })?.orgId;
        const role = (userSnap.data() as { role?: string })?.role;

        const isSuperUser = role === 'super_user';
        if (!isSuperUser && userOrgId !== input.orgId) {
            logger.warn('[AIStudio] Unauthorized org access attempt', {
                uid: session.uid,
                requestedOrg: input.orgId,
                userOrg: userOrgId,
            });
            return { events: [], hasMore: false };
        }

        const limit = Math.min(input.limit ?? 50, 100);

        let query = db
            .collection('ai_studio_usage_events')
            .where('orgId', '==', input.orgId)
            .orderBy('createdAt', 'desc')
            .limit(limit + 1);

        if (input.actionType) {
            query = query.where('actionType', '==', input.actionType) as typeof query;
        }
        if (input.automationTriggered !== undefined) {
            query = query.where('automationTriggered', '==', input.automationTriggered) as typeof query;
        }
        if (input.startAfter) {
            query = query.startAfter(input.startAfter) as typeof query;
        }

        const snap = await query.get();
        const docs = snap.docs.map((d) => d.data() as AIStudioUsageEvent);
        const hasMore = docs.length > limit;

        return {
            events: hasMore ? docs.slice(0, limit) : docs,
            hasMore,
        };
    } catch (err) {
        logger.error('[AIStudio] getAIStudioUsageEvents failed', { err });
        return { events: [], hasMore: false };
    }
}

// ---------------------------------------------------------------------------
// Customer-facing: check action allowed (pre-flight)
// ---------------------------------------------------------------------------

/**
 * Pre-flight check: can the caller's org perform this AI action right now?
 * Safe to call before showing UI elements (e.g., disable image gen button if blocked).
 */
export async function checkMyAIStudioAction(
    input: Omit<CheckAIStudioActionInput, 'orgId' | 'userId'>
): Promise<CheckAIStudioActionResult | null> {
    try {
        const session = await requireUser();
        const db = getAdminFirestore();
        const userSnap = await db.collection('users').doc(session.uid).get();
        const orgId = (userSnap.data() as { orgId?: string }).orgId;
        if (!orgId) return null;

        return checkAIStudioActionAllowed({
            ...input,
            orgId,
            userId: session.uid,
        });
    } catch (err) {
        logger.error('[AIStudio] checkMyAIStudioAction failed', { err });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Billing: initiate top-up purchase
// ---------------------------------------------------------------------------

/**
 * Creates a top-up purchase intent. In production this would initiate a
 * payment provider checkout session and return the checkout URL.
 * Confirmation is handled via webhook → confirmAIStudioTopUpPurchase().
 *
 * For v1 (manual or internal use): directly applies credits if called with admin rights.
 */
export async function purchaseAIStudioTopUp(packId: AIStudioTopUpPackId): Promise<{
    success: boolean;
    purchase?: AIStudioTopUpPurchase;
    error?: string;
}> {
    try {
        const session = await requireUser();
        const db = getAdminFirestore();
        const userSnap = await db.collection('users').doc(session.uid).get();
        const orgId = (userSnap.data() as { orgId?: string }).orgId;
        if (!orgId) return { success: false, error: 'Org not found' };

        // TODO: Integrate with Authorize.net / Stripe to create checkout session
        // For v1: apply directly (billing provider integration in Phase 4b)
        const purchase = await applyTopUpCredits(orgId, packId, session.uid);

        logger.info('[AIStudio] Top-up purchase applied', {
            orgId,
            packId,
            purchaseId: purchase.id,
        });

        return { success: true, purchase };
    } catch (err) {
        logger.error('[AIStudio] purchaseAIStudioTopUp failed', { err });
        return { success: false, error: 'Top-up purchase failed' };
    }
}

// ---------------------------------------------------------------------------
// Admin: grant bonus credits
// ---------------------------------------------------------------------------

/**
 * Grants one-time bonus credits to an org (admin only).
 * Creates a synthetic top-up record with billing_provider = 'manual'.
 */
export async function adminGrantAIStudioCredits(
    orgId: string,
    amount: number,
    note?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireSuperUser();

        if (amount <= 0 || amount > 100_000) {
            return { success: false, error: 'Invalid credit amount (1–100000)' };
        }

        const db = getAdminFirestore();
        const session = await requireUser();
        const grantTimestamp = Date.now();

        await grantManualAIStudioCredits({
            orgId,
            credits: amount,
            grantKey: `admin_${grantTimestamp}`,
            purchasedByUserId: session.uid,
            externalChargeId: `admin:${session.uid}:${grantTimestamp}`,
        });

        if (note) {
            await db.collection('org_ai_studio_overrides').doc(orgId).set(
                { note, updatedAt: Timestamp.now() },
                { merge: true }
            );
        }

        logger.info('[AIStudio] Admin credit grant applied', {
            orgId,
            amount,
            grantedBy: session.uid,
            note,
        });

        return { success: true };
    } catch (err) {
        logger.error('[AIStudio] adminGrantAIStudioCredits failed', { orgId, err });
        return { success: false, error: 'Grant failed' };
    }
}

// ---------------------------------------------------------------------------
// Admin: update override doc
// ---------------------------------------------------------------------------

/**
 * Updates admin override settings for an org (admin only).
 */
export async function adminUpdateAIStudioOverride(
    orgId: string,
    overrides: Partial<AIStudioOverrideDoc>
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminSession = await requireSuperUser();
        const db = getAdminFirestore();
        const now = Date.now();

        await db.collection('org_ai_studio_overrides').doc(orgId).set(
            {
                ...overrides,
                orgId,
                updatedAt: now,
            },
            { merge: true }
        );

        logger.info('[AIStudio] Admin override updated', { orgId, overrides });
        return { success: true };
    } catch (err) {
        logger.error('[AIStudio] adminUpdateAIStudioOverride failed', { orgId, err });
        return { success: false, error: 'Override update failed' };
    }
}

// ---------------------------------------------------------------------------
// Admin: provision entitlement for org
// ---------------------------------------------------------------------------

/**
 * Provisions or upgrades an org's AI Studio entitlement (admin only).
 * Called when an org activates a plan or upgrades.
 */
export async function adminProvisionAIStudioEntitlement(
    orgId: string,
    planId: AIStudioPlanId
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireSuperUser();
        await upsertAIStudioEntitlement(orgId, planId);
        logger.info('[AIStudio] Entitlement provisioned', { orgId, planId });
        return { success: true };
    } catch (err) {
        logger.error('[AIStudio] adminProvisionAIStudioEntitlement failed', { orgId, err });
        return { success: false, error: 'Entitlement provisioning failed' };
    }
}

// ---------------------------------------------------------------------------
// Admin: get usage summary for any org
// ---------------------------------------------------------------------------

/**
 * Returns AI Studio usage summary for any org (admin only).
 */
export async function adminGetAIStudioUsageSummary(
    orgId: string
): Promise<AIStudioUsageSummary | null> {
    try {
        await requireSuperUser();
        return getAIStudioUsageSummary(orgId);
    } catch (err) {
        logger.error('[AIStudio] adminGetAIStudioUsageSummary failed', { orgId, err });
        return null;
    }
}
