
import { createServerClient } from '@/firebase/server-client';

/**
 * Cannabis Desert Index
 * 
 * Calculates "access scores" for ZIP codes based on:
 * - Population density (approximated or from external data)
 * - Number of dispensaries within radius
 * - Average distance to nearest dispensary
 * 
 * A "Cannabis Desert" = high population + low dispensary access
 */

export interface DesertIndexEntry {
    zipCode: string;
    city: string;
    state: string;
    accessScore: number; // 0-100 (0 = desert, 100 = saturated)
    dispensaryCount: number;
    avgDistanceMiles: number;
    population?: number; // If available
    classification: 'desert' | 'underserved' | 'adequate' | 'saturated';
}

export interface DesertIndexSummary {
    totalZipsAnalyzed: number;
    desertCount: number;
    underservedCount: number;
    adequateCount: number;
    saturatedCount: number;
    topDeserts: DesertIndexEntry[];
    topSaturated: DesertIndexEntry[];
    lastUpdated: Date;
}

/**
 * Calculate access score based on dispensary count and distance
 * Score 0-100 where 0 = no access (desert), 100 = excellent access
 */
function calculateAccessScore(dispensaryCount: number, avgDistance: number): number {
    // Scoring logic:
    // - 0 dispensaries = 0 score
    // - Each dispensary adds points (diminishing returns after 5)
    // - Closer distance = higher score

    if (dispensaryCount === 0) return 0;

    // Base score from count (max 50 points from count alone)
    const countScore = Math.min(dispensaryCount * 10, 50);

    // Distance score (max 50 points, inversely proportional to distance)
    // 0 miles = 50 points, 10+ miles = 0 points
    const distanceScore = Math.max(0, 50 - (avgDistance * 5));

    return Math.round(countScore + distanceScore);
}

function classifyAccess(score: number): DesertIndexEntry['classification'] {
    if (score < 20) return 'desert';
    if (score < 40) return 'underserved';
    if (score < 70) return 'adequate';
    return 'saturated';
}

/**
 * Fetch Desert Index data for a specific state
 */
export async function fetchDesertIndexByState(state: string): Promise<DesertIndexEntry[]> {
    const { firestore } = await createServerClient();

    // Get all ZIP pages for this state
    const zipsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .get();

    const entries: DesertIndexEntry[] = [];

    for (const doc of zipsSnapshot.docs) {
        const data = doc.data();
        if (data.state?.toLowerCase() !== state.toLowerCase()) continue;

        const dispensaryCount = data.dispensaryCount || 0;
        // Estimate avg distance - in real implementation, this would use geo queries
        // For now, use a heuristic based on count
        const avgDistance = dispensaryCount > 0 ? Math.max(1, 10 / dispensaryCount) : 25;

        const score = calculateAccessScore(dispensaryCount, avgDistance);

        entries.push({
            zipCode: data.zipCode,
            city: data.city || 'Unknown',
            state: data.state || state,
            accessScore: score,
            dispensaryCount,
            avgDistanceMiles: avgDistance,
            classification: classifyAccess(score)
        });
    }

    // Sort by access score (lowest = worst deserts first)
    return entries.sort((a, b) => a.accessScore - b.accessScore);
}

/**
 * Generate the full Desert Index summary across all states
 */
export async function fetchDesertIndexSummary(): Promise<DesertIndexSummary> {
    const { firestore } = await createServerClient();

    const zipsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .get();

    const entries: DesertIndexEntry[] = [];

    for (const doc of zipsSnapshot.docs) {
        const data = doc.data();
        const dispensaryCount = data.dispensaryCount || 0;
        const avgDistance = dispensaryCount > 0 ? Math.max(1, 10 / dispensaryCount) : 25;
        const score = calculateAccessScore(dispensaryCount, avgDistance);

        entries.push({
            zipCode: data.zipCode,
            city: data.city || 'Unknown',
            state: data.state || 'Unknown',
            accessScore: score,
            dispensaryCount,
            avgDistanceMiles: avgDistance,
            classification: classifyAccess(score)
        });
    }

    // Count by classification
    const counts = {
        desert: entries.filter(e => e.classification === 'desert').length,
        underserved: entries.filter(e => e.classification === 'underserved').length,
        adequate: entries.filter(e => e.classification === 'adequate').length,
        saturated: entries.filter(e => e.classification === 'saturated').length
    };

    // Get top 10 worst deserts and best saturated
    const sorted = [...entries].sort((a, b) => a.accessScore - b.accessScore);

    return {
        totalZipsAnalyzed: entries.length,
        desertCount: counts.desert,
        underservedCount: counts.underserved,
        adequateCount: counts.adequate,
        saturatedCount: counts.saturated,
        topDeserts: sorted.slice(0, 10),
        topSaturated: sorted.slice(-10).reverse(),
        lastUpdated: new Date()
    };
}
