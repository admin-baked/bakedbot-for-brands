'use server';

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';
import { logger } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';
import { getEzalLimits } from '@/lib/plan-limits';
import { findPricingPlan } from '@/lib/config/pricing';
import { getAIStudioUsageSummary } from '@/server/services/ai-studio-billing-service';

export type CompetitorEntry = {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    distance?: number;
    source: 'auto' | 'manual';
    lastUpdated?: Date;
    menuUrl?: string;
};

export type CompetitiveIntelPlanSummary = {
    rawPlanId: string;
    planId: string;
    name: string;
    tagline?: string;
    description: string;
    priceDisplay: string;
    activationFeeDisplay: string | null;
    isActive: boolean;
};

export type CompetitiveIntelCreditsSummary = {
    planId: string;
    billingCycleKey: string;
    totalAvailable: number;
    totalUsed: number;
    totalRemaining: number;
    automationBudgetTotal: number;
    automationBudgetUsed: number;
    automationBudgetRemaining: number;
};

export type CompetitorSnapshot = {
    competitors: CompetitorEntry[];
    lastUpdated: Date;
    nextUpdate: Date;
    updateFrequency: 'weekly' | 'daily' | 'live';
    canRefresh: boolean;
    maxCompetitors: number; // Plan-based limit (scout=3, pro=10, growth=20, empire=1000)
    plan: CompetitiveIntelPlanSummary;
    credits: CompetitiveIntelCreditsSummary | null;
};

function pickFirstString(...values: Array<unknown>): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function toCreditsSummary(
    usage: Awaited<ReturnType<typeof getAIStudioUsageSummary>> | null
): CompetitiveIntelCreditsSummary | null {
    if (!usage) return null;

    return {
        planId: usage.planId,
        billingCycleKey: usage.billingCycleKey,
        totalAvailable: usage.totalCreditsAvailable,
        totalUsed: usage.totalCreditsUsed,
        totalRemaining: Math.max(0, usage.totalCreditsAvailable - usage.totalCreditsUsed),
        automationBudgetTotal: usage.automationBudgetTotal,
        automationBudgetUsed: usage.automationBudgetUsed,
        automationBudgetRemaining: Math.max(
            0,
            usage.automationBudgetTotal - usage.automationBudgetUsed
        ),
    };
}

async function loadCompetitiveIntelContext(
    firestore: FirebaseFirestore.Firestore,
    orgId: string
): Promise<{
    orgData: Record<string, any>;
    limits: ReturnType<typeof getEzalLimits>;
    plan: CompetitiveIntelPlanSummary;
    credits: CompetitiveIntelCreditsSummary | null;
}> {
    const [orgDoc, subscriptionDoc, aiSummary] = await Promise.all([
        firestore.collection('organizations').doc(orgId).get(),
        firestore
            .collection('organizations')
            .doc(orgId)
            .collection('subscription')
            .doc('current')
            .get(),
        getAIStudioUsageSummary(orgId).catch((error) => {
            logger.warn('Failed to load AI Studio usage summary for competitive intel', {
                orgId,
                error,
            });
            return null;
        }),
    ]);

    const orgData = orgDoc?.data?.() || {};
    const subscriptionData = subscriptionDoc?.data?.() || {};
    const rawPlanId =
        pickFirstString(
            orgData?.billing?.planId,
            orgData?.planId,
            subscriptionData?.planId,
            subscriptionData?.tierId,
            orgData?.subscription?.tierId,
            orgData?.plan,
            aiSummary?.planId
        ) || 'signal';

    const pricingPlan = findPricingPlan(rawPlanId) || findPricingPlan('signal');
    const resolvedPlanId = pricingPlan?.id || 'signal';
    const limits = getEzalLimits(resolvedPlanId);
    const isPlanActive =
        orgData?.billing?.subscriptionStatus === 'active' ||
        subscriptionData?.status === 'active' ||
        orgData?.subscriptionStatus === 'active';

    return {
        orgData,
        limits,
        plan: {
            rawPlanId,
            planId: resolvedPlanId,
            name: pricingPlan?.name || rawPlanId,
            tagline: pricingPlan?.tagline,
            description: pricingPlan?.desc || 'Competitive intelligence access',
            priceDisplay: pricingPlan?.priceDisplay || 'Custom',
            activationFeeDisplay: pricingPlan?.activationFee
                ? `$${pricingPlan.activationFee.toLocaleString()} activation`
                : null,
            isActive: Boolean(isPlanActive),
        },
        credits: toCreditsSummary(aiSummary),
    };
}

/**
 * Get competitors for an organization (auto-discovered + manual)
 */
export async function getCompetitors(orgId: string): Promise<CompetitorSnapshot> {
    await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    const context = await loadCompetitiveIntelContext(firestore, orgId);
    const { limits } = context;

    // Determine update frequency based on plan
    const updateFrequency =
        limits.frequencyMinutes <= 60 * 6 ? 'live' :
        limits.frequencyMinutes <= 1440 ? 'daily' : 'weekly';

    // Get stored competitors from BOTH old and new systems
    const [oldCompetitorsSnap, newCompetitorsSnap] = await Promise.all([
        firestore
            .collection('organizations')
            .doc(orgId)
            .collection('competitors')
            .orderBy('lastUpdated', 'desc')
            .limit(20)
            .get(),
        firestore
            .collection('tenants')
            .doc(orgId)
            .collection('competitors')
            .where('active', '==', true)
            .limit(20)
            .get()
    ]);

    const competitors: CompetitorEntry[] = [];
    let lastUpdated = new Date(0);

    // Process OLD system competitors
    oldCompetitorsSnap.forEach(doc => {
        const data = doc.data();
        competitors.push({
            id: doc.id,
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            distance: data.distance,
            source: data.source || 'auto',
            lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
            menuUrl: data.menuUrl,
        });
        if (data.lastUpdated?.toDate?.() > lastUpdated) {
            lastUpdated = data.lastUpdated.toDate();
        }
    });

    // Process NEW system competitors (Ezal-based)
    newCompetitorsSnap.forEach(doc => {
        const data = doc.data();
        const updatedAt = data.updatedAt?.toDate?.() || new Date();
        competitors.push({
            id: doc.id,
            name: data.name,
            address: data.location || data.address,
            city: data.city,
            state: data.state,
            distance: data.distance,
            source: 'auto',
            lastUpdated: updatedAt,
            menuUrl: data.website,
        });
        if (updatedAt > lastUpdated) {
            lastUpdated = updatedAt;
        }
    });

    // Deduplicate competitors by name+city+state (old and new collections can overlap)
    const seen = new Set<string>();
    const uniqueCompetitors = competitors.filter(c => {
        const key = `${(c.name || '').toLowerCase()}|${(c.city || '').toLowerCase()}|${(c.state || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Calculate next update based on plan frequency
    const updateIntervalMs = limits.frequencyMinutes * 60 * 1000;
    const nextUpdate = new Date(lastUpdated.getTime() + updateIntervalMs);

    // Can refresh if next update is in the past
    const canRefresh = new Date() > nextUpdate;

    return {
        competitors: uniqueCompetitors,
        lastUpdated,
        nextUpdate,
        updateFrequency,
        canRefresh,
        maxCompetitors: limits.maxCompetitors,
        plan: context.plan,
        credits: context.credits,
    };
}

/**
 * Auto-discover competitors based on location (called during onboarding or refresh)
 */
export async function autoDiscoverCompetitors(orgId: string, forceRefresh = false): Promise<{ discovered: number }> {
    const user = await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    const context = await loadCompetitiveIntelContext(firestore, orgId);
    const { orgData, plan, limits } = context;
    const marketState = orgData.marketState;

    if (!forceRefresh) {
        // Check last update time
        const lastMeta = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('_meta')
            .doc('competitors')
            .get();

        if (lastMeta.exists) {
            const lastUpdated = lastMeta.data()?.lastAutoDiscovery?.toDate?.();
            if (lastUpdated) {
                const nextAllowedRefresh = lastUpdated.getTime() + limits.frequencyMinutes * 60 * 1000;
                if (Date.now() < nextAllowedRefresh) {
                    logger.info('Competitive intel refresh blocked by plan cadence', {
                        orgId,
                        planId: plan.planId,
                        nextAllowedRefresh: new Date(nextAllowedRefresh).toISOString(),
                    });
                    return { discovered: 0 };
                }
            }
        }
    }

    try {
        const cms = new CannMenusService();

        // Get based on state/city from org or brand data
        let state = marketState;
        let city = orgData.city;

        if (!state) {
            // Try to get from brand doc
            const brandDoc = await firestore.collection('brands').doc(orgId).get();
            if (brandDoc.exists) {
                const brandData = brandDoc.data();
                state = brandData?.marketState || brandData?.state;
                city = brandData?.city;
            }
        }

        // Fallback: check locations collection for dispensary users
        if (!state) {
            const locationsSnap = await firestore.collection('locations')
                .where('orgId', '==', orgId)
                .limit(1)
                .get();
            if (!locationsSnap.empty) {
                const locationData = locationsSnap.docs[0].data();
                state = locationData?.state;
                city = locationData?.city;
            }
        }

        // Fallback: check tenants collection
        if (!state) {
            const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
            if (tenantDoc.exists) {
                const tenantData = tenantDoc.data();
                state = tenantData?.state;
                city = tenantData?.city;
            }
        }

        if (!state) {
            logger.warn('No market state set for competitor discovery', { orgId });
            return { discovered: 0 };
        }

        // Search for nearby competitors (dispensaries for brands, other dispensaries for dispensaries)
        const role = user.role;
        let competitors: any[] = [];

        // Use state capital/center coordinates for state-based search
        const stateCenters: Record<string, { lat: number; lng: number }> = {
            'IL': { lat: 39.7817, lng: -89.6501 },
            'MI': { lat: 42.7325, lng: -84.5555 },
            'CA': { lat: 38.5816, lng: -121.4944 },
            'CO': { lat: 39.7392, lng: -104.9903 },
            'MA': { lat: 42.3601, lng: -71.0589 },
            'AZ': { lat: 33.4484, lng: -112.0740 },
            'NV': { lat: 36.1699, lng: -115.1398 },
            'NY': { lat: 42.6526, lng: -73.7562 },
            'NJ': { lat: 40.0583, lng: -74.4057 },
            'FL': { lat: 30.4383, lng: -84.2807 },
        };

        const coords = stateCenters[state.toUpperCase()] || { lat: 41.8781, lng: -87.6298 }; // Default to Chicago

        try {
            competitors = await cms.findRetailers({
                lat: coords.lat,
                lng: coords.lng,
                limit: role === 'brand' ? 10 : 15
            });
        } catch (err) {
            logger.warn('findRetailers failed, returning empty', { state, error: err });
            competitors = [];
        }

        // Store discovered competitors
        const batch = firestore.batch();
        let discovered = 0;

        for (const comp of competitors) {
            const compRef = firestore
                .collection('organizations')
                .doc(orgId)
                .collection('competitors')
                .doc(comp.id);

            batch.set(compRef, {
                name: comp.name,
                address: comp.street_address,
                city: comp.city,
                state: comp.state,
                distance: comp.distance,
                source: 'auto',
                lastUpdated: FieldValue.serverTimestamp(),
                menuUrl: comp.menu_url || null,
            }, { merge: true });
            discovered++;
        }

        // Update meta
        const metaRef = firestore
            .collection('organizations')
            .doc(orgId)
            .collection('_meta')
            .doc('competitors');
        batch.set(metaRef, {
            lastAutoDiscovery: FieldValue.serverTimestamp(),
            discoveredCount: discovered,
        }, { merge: true });

        await batch.commit();

        logger.info(`Auto-discovered ${discovered} competitors for ${orgId}`);
        return { discovered };
    } catch (error) {
        logger.error('Failed to auto-discover competitors', { orgId, error });
        return { discovered: 0 };
    }
}

/**
 * Manually add a competitor
 */
export async function addManualCompetitor(
    orgId: string,
    competitor: { name: string; address?: string; city?: string; state?: string; menuUrl?: string }
): Promise<CompetitorEntry> {
    await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    const compRef = firestore
        .collection('organizations')
        .doc(orgId)
        .collection('competitors')
        .doc();

    const entry: any = {
        name: competitor.name,
        address: competitor.address || null,
        city: competitor.city || null,
        state: competitor.state || null,
        menuUrl: competitor.menuUrl || null,
        source: 'manual',
        lastUpdated: FieldValue.serverTimestamp(),
    };

    await compRef.set(entry);

    return {
        id: compRef.id,
        name: competitor.name,
        address: competitor.address,
        city: competitor.city,
        state: competitor.state,
        source: 'manual',
        lastUpdated: new Date(),
        menuUrl: competitor.menuUrl,
    };
}

/**
 * Remove a competitor
 */
export async function removeCompetitor(orgId: string, competitorId: string): Promise<void> {
    await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    await firestore
        .collection('organizations')
        .doc(orgId)
        .collection('competitors')
        .doc(competitorId)
        .delete();
}

/**
 * Legacy function for backward compatibility
 */
export async function getNearbyCompetitors(lat: number, lng: number, limit: number = 20) {
    await requireUser(['dispensary', 'super_user']);

    try {
        const cms = new CannMenusService();
        const results = await cms.findRetailers({ lat, lng, limit });
        return results;
    } catch (error) {
        logger.error('Failed to fetch nearby competitors', { lat, lng, error });
        return [];
    }
}

export async function fetchCompetitiveReport(orgId: string): Promise<string | null> {
    await requireUser();
    const { generateCompetitorReport } = await import('@/server/services/ezal/report-generator');
    try {
        return await generateCompetitorReport(orgId);
    } catch (error) {
        console.error("Failed to generate report", error);
        return null;
    }
}

/**
 * Get the latest saved daily intelligence report from Firestore.
 * Reads from tenants/{orgId}/weekly_reports (generated by cron).
 * Returns formatted markdown highlights, or null if no report exists.
 */
export async function getLatestDailyReport(orgId: string): Promise<string | null> {
    if (!orgId) return null;
    await requireUser();
    const { firestore } = await createServerClient();

    try {
        const snap = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('weekly_reports')
            .orderBy('generatedAt', 'desc')
            .limit(1)
            .get();

        if (snap.empty) return null;

        const data = snap.docs[0].data();
        const generatedAt: Date = data.generatedAt?.toDate?.() ?? new Date();
        const insights = data.insights || {};
        const competitors: any[] = data.competitors || [];

        const lines: string[] = [];
        lines.push(`# Daily Competitive Intelligence Report`);
        lines.push(`*Generated ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}*`);
        lines.push('');

        if (insights.marketTrends?.length) {
            lines.push('## Market Trends');
            for (const trend of insights.marketTrends) {
                lines.push(`- ${trend}`);
            }
            lines.push('');
        }

        if (insights.recommendations?.length) {
            lines.push('## Recommendations');
            for (const rec of insights.recommendations) {
                lines.push(`- ${rec}`);
            }
            lines.push('');
        }

        if (insights.topDeals?.length) {
            lines.push('## Top Competitor Deals');
            for (const deal of insights.topDeals.slice(0, 5)) {
                const price = deal.price ? `$${deal.price}` : '';
                const discount = deal.discount ? ` (${deal.discount} off)` : '';
                lines.push(`- **${deal.competitorName}**: ${deal.dealName} ${price}${discount}`);
            }
            lines.push('');
        }

        if (competitors.length) {
            lines.push('## Competitors Tracked');
            for (const comp of competitors) {
                const strategy = comp.priceStrategy ? ` — ${comp.priceStrategy} pricing` : '';
                const deals = comp.dealCount ? ` | ${comp.dealCount} deals` : '';
                lines.push(`- **${comp.competitorName}**${strategy}${deals}`);
            }
            lines.push('');
        }

        lines.push(`*Tracked ${data.totalDealsTracked || 0} deals across ${data.totalSnapshots || 0} snapshots.*`);

        return lines.join('\n');
    } catch (error) {
        logger.error('getLatestDailyReport failed', { orgId, error });
        return null;
    }
}
