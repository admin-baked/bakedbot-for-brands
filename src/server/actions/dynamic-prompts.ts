'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        dispensaryId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return (
        token.currentOrgId ||
        token.orgId ||
        token.brandId ||
        token.dispensaryId ||
        token.tenantId ||
        token.organizationId ||
        null
    );
}

/**
 * getDynamicPromptSuggestions
 *
 * Reads live data from:
 *   - Onboarding state (highest priority — guides new users through setup)
 *   - Latest weekly competitive intel report  (tenants/{orgId}/weekly_reports)
 *   - Recent competitor alerts                (tenants/{orgId}/competitor_alerts)
 *   - CRM lifecycle signals                   (users collection)
 *
 * Returns 2–4 contextual prompt strings that feel personalised to what's
 * happening in the org RIGHT NOW.  These are mixed with the static pool
 * inside useDynamicPrompts so the chips feel fresh on every login.
 *
 * Fails silently — callers always fall back to the static pool.
 *
 * @param orgId  - The org whose data to read
 * @param userId - The current user's UID (optional — enables onboarding prompts)
 */
export async function getDynamicPromptSuggestions(orgId: string, userId?: string): Promise<string[]> {
    if (!orgId) return [];

    try {
        const user = await requireUser();
        const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
        const actorOrgId = getActorOrgId(user);
        const actorUid =
            typeof user === 'object' && user && typeof (user as { uid?: unknown }).uid === 'string'
                ? (user as { uid: string }).uid
                : null;

        if (!isSuperRole(role) && (!actorOrgId || actorOrgId !== orgId)) {
            throw new Error('Unauthorized');
        }
        if (!isSuperRole(role) && userId && actorUid && userId !== actorUid) {
            throw new Error('Unauthorized');
        }

        const db = getAdminFirestore();
        const prompts: string[] = [];

        // ── 0. Onboarding setup prompts (highest priority) ──────────────────
        // Surface setup nudges for new users or incomplete setup steps.
        // If any setup is missing, return these first — they're most actionable.
        if (userId || actorUid) {
            try {
                const onboardingUserId = userId || actorUid!;
                const userDoc = await db.collection('users').doc(onboardingUserId).get();
                const userData = userDoc.data() as any;

                const isNewUser = userData?.isNewUser === true;
                const onboardingCompleted = !!userData?.onboardingCompletedAt;
                const hasPOS = !!userData?.posConfig;

                // Check if competitors have been added for this org
                const competitorsSnap = await db
                    .collection(`organizations/${orgId}/competitors`)
                    .limit(1)
                    .get();
                const hasCompetitors = !competitorsSnap.empty;

                const setupPrompts: string[] = [];

                if (isNewUser || !onboardingCompleted) {
                    setupPrompts.push("I'm new here! Give me a quick tour of what the AI can do for my business");
                }
                if (!hasPOS) {
                    setupPrompts.push('Connect your POS to unlock real-time inventory and sales insights');
                }
                if (!hasCompetitors) {
                    setupPrompts.push('Add competitors so I can start tracking pricing gaps and opportunities');
                }

                // If the user has any missing setup steps, surface those first.
                // The caller (useDynamicPrompts) will fill remaining slots from static pool.
                if (setupPrompts.length > 0) {
                    logger.info('[DynamicPrompts] Returning onboarding prompts', {
                        orgId,
                        userId: onboardingUserId,
                        count: setupPrompts.length,
                        isNewUser,
                        hasPOS,
                        hasCompetitors
                    });
                    return [...new Set(setupPrompts)].slice(0, 4);
                }
            } catch (e) {
                logger.warn('[DynamicPrompts] Could not load onboarding state', { orgId, userId, error: e });
            }
        }

        // ── 1. Latest weekly competitive intel report ───────────────────────
        try {
            const reportSnap = await db
                .collection(`tenants/${orgId}/weekly_reports`)
                .orderBy('generatedAt', 'desc')
                .limit(1)
                .get();

            if (!reportSnap.empty) {
                const report = reportSnap.docs[0].data() as any;
                const insights = report.insights ?? {};

                // Pick the top trend if present
                const trends: string[] = insights.marketTrends ?? [];
                if (trends.length > 0) {
                    prompts.push(`Market trend spotted: "${trends[0]}" — how should we respond?`);
                }

                // Pick the top pricing gap if present
                const gaps: any[] = insights.pricingGaps ?? [];
                if (gaps.length > 0) {
                    const g = gaps[0];
                    const product = g.productName ?? g.category ?? 'a key SKU';
                    prompts.push(`We found a pricing gap on ${product} vs competitors — want a campaign?`);
                }

                // Pick the top recommendation
                const recs: string[] = insights.recommendations ?? [];
                if (recs.length > 0) {
                    prompts.push(`Intel recommends: "${recs[0]}"`);
                }
            }
        } catch (e) {
            logger.warn('[DynamicPrompts] Could not load weekly intel report', { orgId, error: e });
        }

        // ── 2. Recent competitor alerts ─────────────────────────────────────
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7); // past 7 days

            const alertSnap = await db
                .collection(`tenants/${orgId}/competitor_alerts`)
                .where('createdAt', '>=', cutoff)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            for (const doc of alertSnap.docs) {
                const alert = doc.data() as any;
                const competitor = alert.competitorName ?? 'A competitor';

                if (alert.type === 'price_drop_major') {
                    prompts.push(`${competitor} just dropped prices — draft a counter-campaign now`);
                    break; // one alert prompt is enough
                }
                if (alert.type === 'new_competitor') {
                    prompts.push(`New competitor detected: ${competitor} — should we run an analysis?`);
                    break;
                }
                if (alert.type === 'product_stockout') {
                    const product = alert.productName ?? 'a popular product';
                    prompts.push(`${competitor} is out of stock on ${product} — capture their customers`);
                    break;
                }
                if (alert.type === 'new_product_launch') {
                    const product = alert.productName ?? 'a new product';
                    prompts.push(`${competitor} just launched ${product} — extract their brand positioning`);
                    break;
                }
            }
        } catch (e) {
            logger.warn('[DynamicPrompts] Could not load competitor alerts', { orgId, error: e });
        }

        // ── 3. CRM lifecycle signals ────────────────────────────────────────
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            // New signups this week
            const newUsersSnap = await db
                .collection('users')
                .where('orgId', '==', orgId)
                .where('createdAt', '>=', weekAgo)
                .limit(20)
                .get();

            if (newUsersSnap.size >= 3) {
                prompts.push(`${newUsersSnap.size} new customers this week — build a welcome campaign`);
            } else if (newUsersSnap.size > 0) {
                prompts.push(`${newUsersSnap.size} new customer${newUsersSnap.size > 1 ? 's' : ''} joined — send a personalised welcome`);
            }

            // Churned / at-risk customers
            const churnSnap = await db
                .collection('users')
                .where('orgId', '==', orgId)
                .where('lifecycleStage', '==', 'churned')
                .limit(5)
                .get();

            if (churnSnap.size > 0) {
                prompts.push(`${churnSnap.size} customers recently churned — launch a win-back sequence`);
            }

            // VIP customers with no recent comms
            const vipSnap = await db
                .collection('users')
                .where('orgId', '==', orgId)
                .where('lifecycleStage', '==', 'vip')
                .limit(5)
                .get();

            if (vipSnap.size > 0) {
                prompts.push(`You have ${vipSnap.size} VIP customer${vipSnap.size > 1 ? 's' : ''} — send them an exclusive offer`);
            }
        } catch (e) {
            logger.warn('[DynamicPrompts] Could not load CRM signals', { orgId, error: e });
        }

        // Return up to 4 unique, non-empty dynamic prompts
        return [...new Set(prompts.filter(Boolean))].slice(0, 4);

    } catch (e) {
        logger.error('[DynamicPrompts] Unexpected error', { orgId, error: e });
        return [];
    }
}
