'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * getDynamicPromptSuggestions
 *
 * Reads live data from:
 *   - Latest weekly competitive intel report  (tenants/{orgId}/weekly_reports)
 *   - Recent competitor alerts                (tenants/{orgId}/competitor_alerts)
 *   - CRM lifecycle signals                   (users collection)
 *
 * Returns 2–4 contextual prompt strings that feel personalised to what's
 * happening in the org RIGHT NOW.  These are mixed with the static pool
 * inside useDynamicPrompts so the chips feel fresh on every login.
 *
 * Fails silently — callers always fall back to the static pool.
 */
export async function getDynamicPromptSuggestions(orgId: string): Promise<string[]> {
    if (!orgId) return [];

    try {
        const db = getAdminFirestore();
        const prompts: string[] = [];

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
