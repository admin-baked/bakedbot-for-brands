/**
 * Price Match Insights Generator (Ezal)
 *
 * Identifies products where competitor dispensaries are priced at or below
 * our price on likely foot-traffic drivers — and recommends matching or
 * beating by $1 to win the visit.
 *
 * Key selling point for Simply Pure Trenton and future competitive markets:
 * "Find products that likely drive competitor foot traffic and price match
 * or beat by $1."
 *
 * Agent: Ezal (lookout/competitive intelligence)
 * Artifact type: competitor_price_match
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { PriceMatchOpportunity, CompetitorPriceMatchData } from '@/types/inbox';
import { createInboxArtifactId } from '@/types/inbox';

// ---- Foot-traffic driver signals by category ----
// Products in these categories at low price points are known visit drivers
const HIGH_TRAFFIC_CATEGORIES = new Set([
    'flower', 'pre-roll', 'preroll', 'vape', 'cartridge', 'edible',
    'gummy', 'concentrate',
]);

const BEAT_THRESHOLD_CENTS = 100; // beat by $1.00 when we're priced higher

interface CompetitorProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    size?: string; // e.g., "1g", "3.5g"
}

interface OurProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    size?: string;
}

// ============ Price Match Insights Generator ============

export class PriceMatchInsightsGenerator {
    private orgId: string;

    constructor(orgId: string) {
        this.orgId = orgId;
    }

    /**
     * Generate price match opportunities and post as inbox artifact.
     * Returns the number of opportunities found.
     */
    async generate(): Promise<number> {
        try {
            const opportunities = await this.findOpportunities();

            if (opportunities.length === 0) {
                logger.debug('[PriceMatch] No price match opportunities found', {
                    orgId: this.orgId,
                });
                return 0;
            }

            const data = await this.buildData(opportunities);
            await this.postToInbox(data);

            logger.info('[PriceMatch] Price match card posted', {
                orgId: this.orgId,
                opportunities: opportunities.length,
                topCompetitor: data.topCompetitor,
            });

            return opportunities.length;
        } catch (error) {
            logger.error('[PriceMatch] Error generating price match insights', {
                error,
                orgId: this.orgId,
            });
            return 0;
        }
    }

    // ---- Private: find opportunities ----

    private async findOpportunities(): Promise<PriceMatchOpportunity[]> {
        const db = getAdminFirestore();
        const opportunities: PriceMatchOpportunity[] = [];

        // 1. Load our menu products
        const ourProducts = await this.loadOurProducts();
        if (ourProducts.length === 0) return [];

        // 2. Load competitor snapshots
        const competitorsSnap = await db
            .collection('tenants')
            .doc(this.orgId)
            .collection('competitors')
            .get();

        for (const compDoc of competitorsSnap.docs) {
            const comp = compDoc.data();
            const compProducts = await this.loadCompetitorProducts(compDoc.id);

            for (const compProd of compProducts) {
                const match = this.findBestMatch(compProd, ourProducts);
                if (!match) continue;

                const isHighTraffic = HIGH_TRAFFIC_CATEGORIES.has(
                    compProd.category.toLowerCase()
                );
                const competitorCheaper = compProd.price < match.price;
                const samePriced = compProd.price === match.price;

                // Surface when: competitor is cheaper OR same price on a high-traffic category
                if (!competitorCheaper && !(samePriced && isHighTraffic)) continue;

                const action: PriceMatchOpportunity['action'] = competitorCheaper
                    ? 'beat'
                    : 'match';

                const recommendedPrice = competitorCheaper
                    ? Math.max(compProd.price - BEAT_THRESHOLD_CENTS / 100, 0.01)
                    : compProd.price;

                opportunities.push({
                    productName: match.name,
                    category: match.category,
                    ourPrice: match.price,
                    competitorName: comp.name ?? 'Competitor',
                    competitorPrice: compProd.price,
                    recommendedPrice,
                    action,
                    estimatedImpact: isHighTraffic ? 'high' : 'medium',
                });
            }
        }

        // Sort: high-impact first, then by biggest price gap
        return opportunities
            .sort((a, b) => {
                const impactOrder = { high: 0, medium: 1, low: 2 };
                if (impactOrder[a.estimatedImpact] !== impactOrder[b.estimatedImpact]) {
                    return impactOrder[a.estimatedImpact] - impactOrder[b.estimatedImpact];
                }
                return (b.ourPrice - b.recommendedPrice) - (a.ourPrice - a.recommendedPrice);
            })
            .slice(0, 10); // max 10 opportunities per card
    }

    private async loadOurProducts(): Promise<OurProduct[]> {
        try {
            const db = getAdminFirestore();
            const snap = await db
                .collection('tenants')
                .doc(this.orgId)
                .collection('products')
                .where('status', '==', 'active')
                .limit(200)
                .get();

            return snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name ?? '',
                    category: data.category ?? data.type ?? '',
                    price: typeof data.price === 'number' ? data.price : parseFloat(data.price ?? '0'),
                    size: data.size,
                };
            }).filter((p) => p.name && p.price > 0);
        } catch (error) {
            logger.debug('[PriceMatch] Could not load our products', { error });
            return [];
        }
    }

    private async loadCompetitorProducts(
        competitorId: string
    ): Promise<CompetitorProduct[]> {
        try {
            const db = getAdminFirestore();
            const snap = await db
                .collection('tenants')
                .doc(this.orgId)
                .collection('competitors')
                .doc(competitorId)
                .collection('pricing_history')
                .orderBy('scannedAt', 'desc')
                .limit(1)
                .get();

            if (snap.empty) return [];

            const products = snap.docs[0].data().products ?? [];
            return products.map((p: Record<string, unknown>) => ({
                id: String(p.id ?? ''),
                name: String(p.name ?? ''),
                category: String(p.category ?? p.type ?? ''),
                price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price ?? '0')),
                size: p.size ? String(p.size) : undefined,
            })).filter((p: CompetitorProduct) => p.name && p.price > 0);
        } catch (error) {
            logger.debug('[PriceMatch] Could not load competitor products', {
                error,
                competitorId,
            });
            return [];
        }
    }

    /**
     * Fuzzy-match a competitor product to our catalog by normalized name.
     * Falls back to category-only match when no name match found.
     */
    private findBestMatch(
        compProd: CompetitorProduct,
        ours: OurProduct[]
    ): OurProduct | null {
        const normalize = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

        const compNorm = normalize(compProd.name);

        // Exact name match
        const exact = ours.find((p) => normalize(p.name) === compNorm);
        if (exact) return exact;

        // Partial name match (3+ word overlap)
        const compWords = new Set(compNorm.split(/\s+/).filter((w) => w.length > 2));
        const partial = ours.find((p) => {
            const ourWords = normalize(p.name).split(/\s+/);
            const overlap = ourWords.filter((w) => compWords.has(w)).length;
            return overlap >= 2;
        });
        if (partial) return partial;

        // Category + similar price tier (within 20%)
        const catMatch = ours.find((p) => {
            const sameCategory =
                normalize(p.category) === normalize(compProd.category);
            const priceTier =
                Math.abs(p.price - compProd.price) / Math.max(compProd.price, 1) < 0.2;
            return sameCategory && priceTier;
        });

        return catMatch ?? null;
    }

    private async buildData(
        opportunities: PriceMatchOpportunity[]
    ): Promise<CompetitorPriceMatchData> {
        const db = getAdminFirestore();
        const orgSnap = await db.collection('tenants').doc(this.orgId).get();
        const org = orgSnap.data() ?? {};

        const totalSavingsGap = opportunities.reduce(
            (sum, o) => sum + Math.max(o.ourPrice - o.recommendedPrice, 0),
            0
        );

        // Count opportunities by competitor
        const byComp: Record<string, number> = {};
        for (const o of opportunities) {
            byComp[o.competitorName] = (byComp[o.competitorName] ?? 0) + 1;
        }
        const topCompetitor =
            Object.entries(byComp).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Competitor';

        const state = org.state ?? '';
        const city = org.city ?? '';
        const marketContext = [city, state].filter(Boolean).join(', ') + ' | Adult-Use Market';

        const today = new Date().toISOString().split('T')[0];

        return {
            date: today,
            opportunities,
            totalSavingsGap: Math.round(totalSavingsGap * 100) / 100,
            topCompetitor,
            marketContext,
            generatedAt: new Date().toISOString(),
        };
    }

    // ---- Post to inbox ----

    private async postToInbox(data: CompetitorPriceMatchData): Promise<void> {
        const db = getAdminFirestore();
        const artifactId = createInboxArtifactId();
        const now = new Date();

        // Upsert a dedicated "Price Match Opportunities" thread (one per org, deterministic ID)
        const deterministicThreadId = `price_match_${this.orgId}`;

        const threadRef = db
            .collection('tenants')
            .doc(this.orgId)
            .collection('inbox_threads')
            .doc(deterministicThreadId);

        await threadRef.set(
            {
                id: deterministicThreadId,
                orgId: this.orgId,
                type: 'market_intel',
                status: 'active',
                title: 'Competitor Price Match Opportunities',
                preview: `${data.opportunities.length} products where competitors may be driving foot traffic with lower prices.`,
                primaryAgent: 'ezal',
                assignedAgents: ['ezal'],
                artifactIds: FieldValue.arrayUnion(artifactId),
                messages: [],
                isPinned: true,
                updatedAt: now,
                lastActivityAt: now,
                createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        // Upsert the artifact (deterministic slug so it overwrites daily)
        const artifactSlug = `price_match_${this.orgId}_${data.date}`;
        const artifactRef = db
            .collection('tenants')
            .doc(this.orgId)
            .collection('inbox_artifacts')
            .doc(artifactSlug);

        await artifactRef.set({
            id: artifactSlug,
            threadId: deterministicThreadId,
            orgId: this.orgId,
            type: 'competitor_price_match',
            status: 'draft',
            data,
            rationale: `Ezal identified ${data.opportunities.length} products where ${data.topCompetitor} and others may be driving foot traffic with lower prices. Recommended actions could capture an estimated $${data.totalSavingsGap.toFixed(2)} per visit in recovered revenue.`,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: 'ezal',
        });
    }
}
