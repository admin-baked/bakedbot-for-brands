
import { createServerClient } from '@/firebase/server-client';

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

/**
 * Fetch SEO KPIs from Firestore
 */
export async function fetchSeoKpis(): Promise<SeoKpis> {
    const { firestore } = await createServerClient();
    const configRef = firestore.collection('foot_traffic').doc('config');

    // Count pages by type
    const [zipSnap, dispSnap, brandSnap, citySnap, stateSnap] = await Promise.all([
        configRef.collection('zip_pages').count().get(),
        configRef.collection('dispensary_pages').count().get(),
        configRef.collection('brand_pages').count().get(),
        configRef.collection('city_pages').count().get(),
        configRef.collection('state_pages').count().get()
    ]);

    const zipCount = zipSnap.data().count;
    const dispCount = dispSnap.data().count;
    const brandCount = brandSnap.data().count;
    const cityCount = citySnap.data().count;
    const stateCount = stateSnap.data().count;
    const totalPages = zipCount + dispCount + brandCount + cityCount + stateCount;

    // Calculate claim metrics
    let claimedDisp = 0;
    let claimedBrands = 0;

    // Sample check (for large datasets, this would need pagination or aggregation queries)
    const dispDocs = await configRef.collection('dispensary_pages').limit(1000).get();
    const brandDocs = await configRef.collection('brand_pages').limit(1000).get();

    dispDocs.forEach(doc => { if (doc.data().claimedBy) claimedDisp++; });
    brandDocs.forEach(doc => { if (doc.data().claimedBy) claimedBrands++; });

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

    // Check freshness of dispensary pages
    dispDocs.forEach(doc => {
        const data = doc.data();
        const updatedAt = data.updatedAt?.toDate?.() || data.updatedAt;
        if (updatedAt) {
            const updateDate = new Date(updatedAt);
            if (updateDate >= sevenDaysAgo) freshCount++;
            else if (updateDate < thirtyDaysAgo) staleCount++;
        }
    });

    const healthScore = totalPages > 0
        ? Math.round(((totalPages - staleCount) / totalPages) * 100)
        : 0;

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
            impressions: null,
            clicks: null,
            ctr: null,
            avgPosition: null,
            top3Keywords: null,
            top10Keywords: null,
            dataAvailable: false
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
