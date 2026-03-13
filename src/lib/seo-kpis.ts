
import { createServerClient } from '@/firebase/server-client';
import { searchConsoleService } from '@/server/services/growth/search-console';

/**
 * SEO KPIs Data Service for Pops Dashboard
 * 
 * Tracks organic growth metrics:
 * - Indexed pages (by type)
 * - Claim conversion rates
 * - Page freshness
 * - Placeholders for Search Console data (impressions, rankings)
 */

export interface SeoKpis {
    // Internal metrics (tracked in Firestore)
    indexedPages: {
        zip: number;
        dispensary: number;
        brand: number;
        city: number;
        state: number;
        total: number;
    };
    claimMetrics: {
        totalUnclaimed: number;
        totalClaimed: number;
        claimRate: number; // percentage
        pendingClaims: number;
    };
    pageHealth: {
        freshPages: number;    // Updated within 7 days
        stalePages: number;    // Not updated in 30+ days
        healthScore: number;   // 0-100
    };
    // Placeholder metrics (require external API)
    searchConsole: {
        impressions: number | null;
        clicks: number | null;
        ctr: number | null;
        avgPosition: number | null;
        top3Keywords: number | null;
        top10Keywords: number | null;
        dataAvailable: boolean;
    };
    lastUpdated: Date;
}

type TimestampLike = {
    toDate?: () => Date;
};

function coerceDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && typeof (value as TimestampLike).toDate === 'function') {
        try {
            return (value as TimestampLike).toDate?.() || null;
        } catch {
            return null;
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function mostRecentDate(a?: Date | null, b?: Date | null): Date | null {
    if (!a) return b || null;
    if (!b) return a;
    return a.getTime() >= b.getTime() ? a : b;
}

/**
 * Fetch SEO KPIs from Firestore
 */
export async function fetchSeoKpis(userId?: string): Promise<SeoKpis> {
    const { firestore } = await createServerClient();
    const configRef = firestore.collection('foot_traffic').doc('config');

    // Count pages by type. Brand + dispensary pages still exist in both the
    // legacy foot_traffic/config tree and the newer top-level SEO collections.
    const [zipSnap, configDispSnap, topLevelDispSnap, configBrandSnap, topLevelBrandSnap, citySnap, stateSnap] = await Promise.all([
        configRef.collection('zip_pages').count().get(),
        configRef.collection('dispensary_pages').count().get(),
        firestore.collection('seo_pages_dispensary').count().get(),
        configRef.collection('brand_pages').count().get(),
        firestore.collection('seo_pages_brand').count().get(),
        configRef.collection('city_pages').count().get(),
        configRef.collection('state_pages').count().get()
    ]);

    const zipCount = zipSnap.data().count;
    const dispCount = Math.max(configDispSnap.data().count, topLevelDispSnap.data().count);
    const brandCount = Math.max(configBrandSnap.data().count, topLevelBrandSnap.data().count);
    const cityCount = citySnap.data().count;
    const stateCount = stateSnap.data().count;
    const totalPages = zipCount + dispCount + brandCount + cityCount + stateCount;

    // Calculate claim metrics
    let claimedDisp = 0;
    let claimedBrands = 0;

    // Sample check (for large datasets, this would need pagination or aggregation queries)
    const [configDispDocs, topLevelDispDocs, configBrandDocs, topLevelBrandDocs] = await Promise.all([
        configRef.collection('dispensary_pages').limit(1000).get(),
        firestore.collection('seo_pages_dispensary').limit(1000).get(),
        configRef.collection('brand_pages').limit(1000).get(),
        firestore.collection('seo_pages_brand').limit(1000).get(),
    ]);

    const dispensaryClaims = new Map<string, boolean>();
    const brandClaims = new Map<string, boolean>();

    configDispDocs.forEach((doc) => {
        dispensaryClaims.set(doc.id, Boolean(doc.data().claimedBy));
    });
    topLevelDispDocs.forEach((doc) => {
        dispensaryClaims.set(doc.id, dispensaryClaims.get(doc.id) || Boolean(doc.data().claimedBy));
    });
    configBrandDocs.forEach((doc) => {
        brandClaims.set(doc.id, Boolean(doc.data().claimedBy));
    });
    topLevelBrandDocs.forEach((doc) => {
        brandClaims.set(doc.id, brandClaims.get(doc.id) || Boolean(doc.data().claimedBy));
    });

    claimedDisp = Array.from(dispensaryClaims.values()).filter(Boolean).length;
    claimedBrands = Array.from(brandClaims.values()).filter(Boolean).length;

    const totalClaimed = claimedDisp + claimedBrands;
    const totalUnclaimed = (dispCount + brandCount) - totalClaimed;
    const claimRate = (dispCount + brandCount) > 0
        ? Math.round((totalClaimed / (dispCount + brandCount)) * 100)
        : 0;

    // Calculate page freshness
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let freshCount = 0;
    let staleCount = 0;

    const pageFreshness = new Map<string, Date | null>();

    const zipDocs = await configRef.collection('zip_pages').limit(1000).get();

    zipDocs.forEach((doc) => {
        const data = doc.data();
        pageFreshness.set(doc.id, coerceDate(data.updatedAt) || coerceDate(data.lastRefreshed));
    });
    configDispDocs.forEach((doc) => {
        const data = doc.data();
        pageFreshness.set(doc.id, mostRecentDate(pageFreshness.get(doc.id), coerceDate(data.updatedAt)));
    });
    topLevelDispDocs.forEach((doc) => {
        const data = doc.data();
        pageFreshness.set(doc.id, mostRecentDate(pageFreshness.get(doc.id), coerceDate(data.updatedAt)));
    });
    configBrandDocs.forEach((doc) => {
        const data = doc.data();
        pageFreshness.set(doc.id, mostRecentDate(pageFreshness.get(doc.id), coerceDate(data.updatedAt)));
    });
    topLevelBrandDocs.forEach((doc) => {
        const data = doc.data();
        pageFreshness.set(doc.id, mostRecentDate(pageFreshness.get(doc.id), coerceDate(data.updatedAt)));
    });

    pageFreshness.forEach((updatedAt) => {
        if (updatedAt) {
            if (updatedAt >= sevenDaysAgo) {
                freshCount++;
            } else if (updatedAt < thirtyDaysAgo) {
                staleCount++;
            }
        }
    });

    const healthScore = totalPages > 0
        ? Math.round(((totalPages - staleCount) / totalPages) * 100)
        : 0;

    const [siteSummary, topQueries] = await Promise.all([
        searchConsoleService.getSiteSummary(28, { userId }),
        searchConsoleService.getTopQueries(undefined, undefined, 100, { userId }),
    ]);

    const top3Keywords = topQueries.queries.filter((query) => query.position <= 3).length;
    const top10Keywords = topQueries.queries.filter((query) => query.position <= 10).length;
    const searchConsoleAvailable = siteSummary.impressions > 0 || topQueries.queries.length > 0;

    return {
        indexedPages: {
            zip: zipCount,
            dispensary: dispCount,
            brand: brandCount,
            city: cityCount,
            state: stateCount,
            total: totalPages
        },
        claimMetrics: {
            totalUnclaimed,
            totalClaimed,
            claimRate,
            pendingClaims: 0 // Would need separate claims collection
        },
        pageHealth: {
            freshPages: freshCount,
            stalePages: staleCount,
            healthScore
        },
        // Placeholder for Search Console data
        searchConsole: {
            impressions: searchConsoleAvailable ? siteSummary.impressions : null,
            clicks: searchConsoleAvailable ? siteSummary.clicks : null,
            ctr: searchConsoleAvailable ? Number((siteSummary.ctr * 100).toFixed(2)) : null,
            avgPosition: searchConsoleAvailable ? Number(siteSummary.avgPosition.toFixed(1)) : null,
            top3Keywords: searchConsoleAvailable ? top3Keywords : null,
            top10Keywords: searchConsoleAvailable ? top10Keywords : null,
            dataAvailable: searchConsoleAvailable
        },
        lastUpdated: now
    };
}

/**
 * Placeholder: Fetch Search Console data
 * This would integrate with Google Search Console API when credentials are available
 */
export async function fetchSearchConsoleData(): Promise<SeoKpis['searchConsole']> {
    // TODO: Implement when Search Console API is configured
    // Would use googleapis library with service account

    return {
        impressions: null,
        clicks: null,
        ctr: null,
        avgPosition: null,
        top3Keywords: null,
        top10Keywords: null,
        dataAvailable: false
    };
}

/**
 * Calculate MRR ladder progress
 */
export function calculateMrrLadder(currentMrr: number): {
    currentTier: string;
    nextMilestone: number;
    progress: number;
    claimsNeeded: number;
} {
    const tiers = [
        { name: '$10K MRR', target: 10000, claimsEstimate: 100 },
        { name: '$25K MRR', target: 25000, claimsEstimate: 250 },
        { name: '$50K MRR', target: 50000, claimsEstimate: 500 }
    ];

    let currentTier = 'Pre-Launch';
    let nextMilestone = 10000;
    let progress = 0;
    let claimsNeeded = 100;

    for (const tier of tiers) {
        if (currentMrr >= tier.target) {
            currentTier = tier.name;
        } else {
            nextMilestone = tier.target;
            progress = Math.round((currentMrr / tier.target) * 100);
            claimsNeeded = Math.max(0, tier.claimsEstimate - Math.floor(currentMrr / 99));
            break;
        }
    }

    if (currentMrr >= 50000) {
        currentTier = '$50K MRR';
        nextMilestone = 100000;
        progress = Math.round((currentMrr / 100000) * 100);
        claimsNeeded = 0;
    }

    return { currentTier, nextMilestone, progress, claimsNeeded };
}
