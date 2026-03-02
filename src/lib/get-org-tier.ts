/**
 * get-org-tier.ts — Resolve org's billing tier from Firestore
 *
 * Returns the effective TierId for an organization.
 * Used by agent-runner to force Scout orgs to Gemini (cost control).
 *
 * 5-minute in-memory cache to avoid repeated Firestore reads.
 */

import type { TierId } from '@/config/tiers';

// Simple in-memory cache: orgId → { tier, expiry }
const tierCache = new Map<string, { tier: TierId; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Maps a raw planId string from Firestore to a canonical TierId.
 * Handles legacy plan IDs and missing values.
 */
function normalizePlanId(planId: string | undefined | null): TierId {
    if (!planId) return 'scout';

    const lower = planId.toLowerCase();

    // Direct matches
    if (lower === 'scout' || lower === 'free') return 'scout';
    if (lower === 'pro' || lower === 'claim_pro' || lower === 'founders_claim') return 'pro';
    if (lower === 'growth' || lower === 'growth_5' || lower === 'scale_10' || lower === 'pro_25') return 'growth';
    if (lower === 'empire' || lower === 'enterprise' || lower === 'custom_25') return 'empire';

    // Unknown → default to scout (safest for cost)
    return 'scout';
}

/**
 * Get the billing tier for an organization.
 * Reads `organizations/{orgId}.planId` from Firestore with 5-min cache.
 *
 * Returns 'scout' for any unrecognized or missing planId.
 */
export async function getOrgTier(orgId: string): Promise<TierId> {
    if (!orgId || orgId === 'general') return 'scout';

    // Check cache
    const cached = tierCache.get(orgId);
    if (cached && Date.now() < cached.expiry) {
        return cached.tier;
    }

    try {
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        const planId = orgDoc.exists ? (orgDoc.data()?.planId as string | undefined) : undefined;

        const tier = normalizePlanId(planId);

        // Cache result
        tierCache.set(orgId, { tier, expiry: Date.now() + CACHE_TTL_MS });

        return tier;
    } catch {
        // On error, default to scout (safest for cost control)
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
