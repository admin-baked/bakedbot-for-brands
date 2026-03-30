/**
 * get-org-tier.ts - Resolve org's billing tier from Firestore
 *
 * Returns the effective TierId for an organization.
 * Used by agent-runner to force Scout orgs to Gemini (cost control).
 *
 * 5-minute in-memory cache to avoid repeated Firestore reads.
 */

import type { TierId } from '@/config/tiers';
import { findPricingPlan } from '@/lib/config/pricing';

// Simple in-memory cache: orgId -> { tier, expiry }
const tierCache = new Map<string, { tier: TierId; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Maps a raw planId string from Firestore to a canonical TierId.
 * Handles both legacy tier IDs and current public plan IDs.
 */
export function normalizePlanIdToTierId(planId: string | undefined | null): TierId {
    if (!planId) return 'scout';

    const lower = planId.toLowerCase();

    if (lower === 'scout' || lower === 'pro' || lower === 'growth' || lower === 'empire') {
        return lower;
    }

    const pricingPlan = findPricingPlan(lower);
    switch (pricingPlan?.id) {
        case 'signal':
            return 'scout';
        case 'convert':
            return 'pro';
        case 'retain':
            return 'growth';
        case 'optimize':
        case 'enterprise':
            return 'empire';
        default:
            return 'scout';
    }
}

/**
 * Get the billing tier for an organization.
 * Reads `organizations/{orgId}.planId` from Firestore with 5-min cache.
 *
 * Returns 'scout' for any unrecognized or missing planId.
 */
export async function getOrgTier(orgId: string): Promise<TierId> {
    if (!orgId || orgId === 'general') return 'scout';

    const cached = tierCache.get(orgId);
    if (cached && Date.now() < cached.expiry) {
        return cached.tier;
    }

    try {
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        const planId = orgDoc.exists ? (orgDoc.data()?.planId as string | undefined) : undefined;

        const tier = normalizePlanIdToTierId(planId);
        tierCache.set(orgId, { tier, expiry: Date.now() + CACHE_TTL_MS });

        return tier;
    } catch {
        return 'scout';
    }
}

/**
 * Check if an org is on a paid tier (pro, growth, or empire).
 */
export async function isOrgPaid(orgId: string): Promise<boolean> {
    const tier = await getOrgTier(orgId);
    return tier !== 'scout';
}
