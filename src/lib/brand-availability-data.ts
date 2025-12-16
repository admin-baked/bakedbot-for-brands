
import { createServerClient } from '@/firebase/server-client';

/**
 * Brand Availability Index
 * 
 * Tracks where cannabis brands are physically available on shelves.
 * Useful for: brands tracking distribution, consumers finding products,
 * and investors understanding market penetration.
 */

export interface BrandAvailabilityEntry {
    brandName: string;
    brandSlug: string;
    totalRetailers: number;
    statesCovered: string[];
    citiesCovered: number;
    topCities: { city: string; state: string; count: number }[];
    availabilityScore: number; // 0-100 (reach * depth)
    classification: 'local' | 'regional' | 'multi-state' | 'national';
}

export interface BrandAvailabilitySummary {
    totalBrandsTracked: number;
    localCount: number;
    regionalCount: number;
    multiStateCount: number;
    nationalCount: number;
    topBrands: BrandAvailabilityEntry[];
    risingBrands: BrandAvailabilityEntry[]; // Brands with recent distribution growth
    lastUpdated: Date;
}

function classifyDistribution(stateCount: number, retailerCount: number): BrandAvailabilityEntry['classification'] {
    if (stateCount >= 10 && retailerCount >= 100) return 'national';
    if (stateCount >= 3 && retailerCount >= 25) return 'multi-state';
    if (retailerCount >= 10) return 'regional';
    return 'local';
}

function calculateAvailabilityScore(stateCount: number, retailerCount: number): number {
    // Score based on reach (states) and depth (retailers)
    const reachScore = Math.min(stateCount * 10, 50); // Max 50 from states
    const depthScore = Math.min(Math.log10(retailerCount + 1) * 20, 50); // Log scale, max 50
    return Math.round(reachScore + depthScore);
}

/**
 * Fetch Brand Availability data
 */
export async function fetchBrandAvailabilityIndex(): Promise<BrandAvailabilityEntry[]> {
    const { firestore } = await createServerClient();

    // Get all brand pages
    const brandsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('brand_pages')
        .get();

    const entries: BrandAvailabilityEntry[] = [];

    for (const doc of brandsSnapshot.docs) {
        const data = doc.data();

        const cities = data.cities || [];
        const retailerCount = data.retailerCount || cities.length;

        // Extract unique states from cities (format: "City, ST")
        const states = new Set<string>();
        const cityCountMap = new Map<string, { city: string; state: string; count: number }>();

        for (const cityStr of cities) {
            // Try to parse "City, ST" format
            const parts = cityStr.split(',').map((s: string) => s.trim());
            if (parts.length >= 2) {
                const state = parts[parts.length - 1];
                const city = parts.slice(0, -1).join(', ');
                states.add(state);

                const key = `${city}-${state}`;
                if (!cityCountMap.has(key)) {
                    cityCountMap.set(key, { city, state, count: 0 });
                }
                cityCountMap.get(key)!.count++;
            } else {
                // Just a city name without state
                const key = cityStr;
                if (!cityCountMap.has(key)) {
                    cityCountMap.set(key, { city: cityStr, state: 'Unknown', count: 0 });
                }
                cityCountMap.get(key)!.count++;
            }
        }

        const stateList = Array.from(states);
        const topCities = Array.from(cityCountMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const score = calculateAvailabilityScore(stateList.length, retailerCount);

        entries.push({
            brandName: data.name || doc.id,
            brandSlug: data.slug || doc.id,
            totalRetailers: retailerCount,
            statesCovered: stateList,
            citiesCovered: cityCountMap.size,
            topCities,
            availabilityScore: score,
            classification: classifyDistribution(stateList.length, retailerCount)
        });
    }

    // Sort by availability score (highest first)
    return entries.sort((a, b) => b.availabilityScore - a.availabilityScore);
}

/**
 * Generate the full Brand Availability summary
 */
export async function fetchBrandAvailabilitySummary(): Promise<BrandAvailabilitySummary> {
    const entries = await fetchBrandAvailabilityIndex();

    const counts = {
        local: entries.filter(e => e.classification === 'local').length,
        regional: entries.filter(e => e.classification === 'regional').length,
        multiState: entries.filter(e => e.classification === 'multi-state').length,
        national: entries.filter(e => e.classification === 'national').length
    };

    return {
        totalBrandsTracked: entries.length,
        localCount: counts.local,
        regionalCount: counts.regional,
        multiStateCount: counts.multiState,
        nationalCount: counts.national,
        topBrands: entries.slice(0, 10),
        risingBrands: entries.slice(0, 5), // Placeholder - would need historical data for true "rising"
        lastUpdated: new Date()
    };
}
