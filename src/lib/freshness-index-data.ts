
import { createServerClient } from '@/firebase/server-client';

/**
 * Market Freshness Index
 * 
 * Measures how often dispensary menus are updated by region.
 * Fresh data = active market; stale data = dormant/poorly maintained.
 */

export interface FreshnessEntry {
    city: string;
    state: string;
    dispensaryCount: number;
    avgDaysSinceUpdate: number;
    freshCount: number;   // Updated within 7 days
    staleCount: number;   // Not updated in 30+ days
    freshnessScore: number; // 0-100
    classification: 'fresh' | 'active' | 'aging' | 'stale';
}

export interface FreshnessIndexSummary {
    totalDispensariesAnalyzed: number;
    freshCount: number;
    activeCount: number;
    agingCount: number;
    staleCount: number;
    topFreshMarkets: FreshnessEntry[];
    topStaleMarkets: FreshnessEntry[];
    lastUpdated: Date;
}

function classifyFreshness(score: number): FreshnessEntry['classification'] {
    if (score >= 80) return 'fresh';
    if (score >= 50) return 'active';
    if (score >= 20) return 'aging';
    return 'stale';
}

/**
 * Calculate freshness score based on update frequency
 * Score 0-100 where 100 = all menus updated today
 */
function calculateFreshnessScore(avgDaysSinceUpdate: number): number {
    // 0 days = 100, 30+ days = 0
    return Math.max(0, Math.round(100 - (avgDaysSinceUpdate * 3.33)));
}

/**
 * Fetch Freshness Index data aggregated by city
 */
export async function fetchFreshnessIndexByState(state: string): Promise<FreshnessEntry[]> {
    const { firestore } = await createServerClient();

    // Get all dispensary pages
    const dispensariesSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('dispensary_pages')
        .get();

    // Group by city
    const cityMap = new Map<string, {
        state: string;
        dispensaries: { updatedAt?: Date }[]
    }>();

    for (const doc of dispensariesSnapshot.docs) {
        const data = doc.data();
        if (state && data.state?.toLowerCase() !== state.toLowerCase()) continue;

        const city = data.city || 'Unknown';
        const cityState = data.state || 'Unknown';

        if (!cityMap.has(city)) {
            cityMap.set(city, { state: cityState, dispensaries: [] });
        }

        cityMap.get(city)!.dispensaries.push({
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        });
    }

    const entries: FreshnessEntry[] = [];
    const now = new Date();

    for (const [city, { state: entryState, dispensaries }] of Array.from(cityMap.entries())) {
        if (dispensaries.length === 0) continue;

        // Calculate average days since update
        let totalDays = 0;
        let freshCount = 0;
        let staleCount = 0;

        for (const d of dispensaries) {
            const updatedAt = d.updatedAt ? new Date(d.updatedAt) : new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Default 60 days old
            const daysSince = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += daysSince;

            if (daysSince <= 7) freshCount++;
            if (daysSince >= 30) staleCount++;
        }

        const avgDays = totalDays / dispensaries.length;
        const score = calculateFreshnessScore(avgDays);

        entries.push({
            city,
            state: entryState,
            dispensaryCount: dispensaries.length,
            avgDaysSinceUpdate: Math.round(avgDays),
            freshCount,
            staleCount,
            freshnessScore: score,
            classification: classifyFreshness(score)
        });
    }

    // Sort by freshness score (highest first)
    return entries.sort((a, b) => b.freshnessScore - a.freshnessScore);
}

/**
 * Generate the full Freshness Index summary
 */
export async function fetchFreshnessIndexSummary(): Promise<FreshnessIndexSummary> {
    const entries = await fetchFreshnessIndexByState('');

    const counts = {
        fresh: entries.filter(e => e.classification === 'fresh').length,
        active: entries.filter(e => e.classification === 'active').length,
        aging: entries.filter(e => e.classification === 'aging').length,
        stale: entries.filter(e => e.classification === 'stale').length
    };

    const totalDispensaries = entries.reduce((sum, e) => sum + e.dispensaryCount, 0);

    return {
        totalDispensariesAnalyzed: totalDispensaries,
        freshCount: counts.fresh,
        activeCount: counts.active,
        agingCount: counts.aging,
        staleCount: counts.stale,
        topFreshMarkets: entries.slice(0, 10),
        topStaleMarkets: [...entries].sort((a, b) => a.freshnessScore - b.freshnessScore).slice(0, 10),
        lastUpdated: new Date()
    };
}
