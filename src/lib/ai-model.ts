/**
 * AI model selection utilities
 *
 * Centralises the tier → model mapping so every feature uses
 * the same logic without duplicating it.
 *
 * Tier policy:
 *   empire / growth → claude-sonnet-4-6  (user-facing content, paying for quality)
 *   scout / pro / none → claude-haiku-4-5-20251001  (fast, cheap, good enough)
 */

import { getAdminFirestore } from '@/firebase/admin';

export const MODEL_SONNET = 'claude-sonnet-4-6' as const;
export const MODEL_HAIKU = 'claude-haiku-4-5-20251001' as const;

const PREMIUM_TIERS = new Set(['empire', 'growth']);

/**
 * Returns the appropriate Claude model ID for an org based on their
 * subscription tier. Falls back to Haiku on any error.
 */
export async function getModelForOrg(orgId: string): Promise<string> {
    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('subscriptions').doc(orgId).get();
        const tierId = doc.exists ? (doc.data()?.tierId as string | undefined) : undefined;
        if (tierId && PREMIUM_TIERS.has(tierId)) return MODEL_SONNET;
    } catch {
        // Fall through to default
    }
    return MODEL_HAIKU;
}
