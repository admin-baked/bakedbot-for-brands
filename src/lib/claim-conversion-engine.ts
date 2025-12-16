
import { createServerClient } from '@/firebase/server-client';

/**
 * Claim Conversion Engine
 * 
 * Detects opportunities to convert unclaimed dispensaries/brands to Claim Pro.
 * 
 * Triggers:
 * 1. Page crosses X organic clicks/week
 * 2. Dispensary appears on multiple ZIP pages but is unclaimed
 * 3. Brand has wide distribution but unclaimed
 */

export interface ClaimOpportunity {
    entityId: string;
    entityType: 'dispensary' | 'brand';
    entityName: string;
    triggerType: 'high_traffic' | 'multi_zip' | 'wide_distribution';
    score: number; // Priority score (higher = more urgent)
    metrics: {
        weeklyClicks?: number;
        zipCount?: number;
        retailerCount?: number;
        stateCount?: number;
    };
    suggestedAction: 'banner' | 'email' | 'founders_pitch';
    createdAt: Date;
}

export interface ClaimConversionConfig {
    // Traffic thresholds
    minWeeklyClicksForTrigger: number;
    // Multi-ZIP threshold
    minZipPagesForTrigger: number;
    // Distribution thresholds
    minRetailersForTrigger: number;
    minStatesForTrigger: number;
    // Founders pricing config
    foundersSlotsCap: number;
    foundersClaimedCount: number;
}

const DEFAULT_CONFIG: ClaimConversionConfig = {
    minWeeklyClicksForTrigger: 50,
    minZipPagesForTrigger: 3,
    minRetailersForTrigger: 10,
    minStatesForTrigger: 2,
    foundersSlotsCap: 100,
    foundersClaimedCount: 0
};

/**
 * Detect high-traffic unclaimed dispensaries
 */
export async function detectHighTrafficOpportunities(
    config: Partial<ClaimConversionConfig> = {}
): Promise<ClaimOpportunity[]> {
    const { firestore } = await createServerClient();
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Get unclaimed dispensary pages with analytics
    const dispensariesSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('dispensary_pages')
        .get();

    const opportunities: ClaimOpportunity[] = [];

    for (const doc of dispensariesSnapshot.docs) {
        const data = doc.data();

        // Skip already claimed
        if (data.claimedBy) continue;

        const weeklyClicks = data.weeklyClicks || data.analytics?.weeklyClicks || 0;

        if (weeklyClicks >= cfg.minWeeklyClicksForTrigger) {
            opportunities.push({
                entityId: doc.id,
                entityType: 'dispensary',
                entityName: data.name || doc.id,
                triggerType: 'high_traffic',
                score: weeklyClicks, // Higher traffic = higher priority
                metrics: { weeklyClicks },
                suggestedAction: weeklyClicks > 200 ? 'email' : 'banner',
                createdAt: new Date()
            });
        }
    }

    return opportunities.sort((a, b) => b.score - a.score);
}

/**
 * Detect dispensaries appearing on multiple ZIP pages (good coverage = valuable)
 */
export async function detectMultiZipOpportunities(
    config: Partial<ClaimConversionConfig> = {}
): Promise<ClaimOpportunity[]> {
    const { firestore } = await createServerClient();
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Get ZIP pages and count dispensary appearances
    const zipsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .get();

    // Count how many ZIPs each dispensary appears on
    const dispensaryZipCount = new Map<string, { name: string; count: number }>();

    for (const doc of zipsSnapshot.docs) {
        const data = doc.data();
        const dispensaries = data.dispensaries || [];

        for (const disp of dispensaries) {
            const dispId = disp.id || disp.slug;
            if (!dispId) continue;

            if (!dispensaryZipCount.has(dispId)) {
                dispensaryZipCount.set(dispId, { name: disp.name || dispId, count: 0 });
            }
            dispensaryZipCount.get(dispId)!.count++;
        }
    }

    // Get claimed status
    const dispensariesSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('dispensary_pages')
        .get();

    const claimedSet = new Set<string>();
    for (const doc of dispensariesSnapshot.docs) {
        if (doc.data().claimedBy) {
            claimedSet.add(doc.id);
        }
    }

    const opportunities: ClaimOpportunity[] = [];

    for (const [dispId, { name, count }] of Array.from(dispensaryZipCount.entries())) {
        if (claimedSet.has(dispId)) continue;

        if (count >= cfg.minZipPagesForTrigger) {
            opportunities.push({
                entityId: dispId,
                entityType: 'dispensary',
                entityName: name,
                triggerType: 'multi_zip',
                score: count * 10, // More ZIPs = higher priority
                metrics: { zipCount: count },
                suggestedAction: count > 5 ? 'founders_pitch' : 'banner',
                createdAt: new Date()
            });
        }
    }

    return opportunities.sort((a, b) => b.score - a.score);
}

/**
 * Detect brands with wide distribution but unclaimed
 */
export async function detectWideDistributionOpportunities(
    config: Partial<ClaimConversionConfig> = {}
): Promise<ClaimOpportunity[]> {
    const { firestore } = await createServerClient();
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const brandsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('brand_pages')
        .get();

    const opportunities: ClaimOpportunity[] = [];

    for (const doc of brandsSnapshot.docs) {
        const data = doc.data();

        // Skip claimed brands
        if (data.claimedBy) continue;

        const retailerCount = data.retailerCount || (data.cities?.length || 0);
        const cities = data.cities || [];

        // Extract unique states from "City, ST" format
        const states = new Set<string>();
        for (const cityStr of cities) {
            const parts = (cityStr as string).split(',');
            if (parts.length >= 2) {
                states.add(parts[parts.length - 1].trim());
            }
        }

        const stateCount = states.size;

        if (retailerCount >= cfg.minRetailersForTrigger || stateCount >= cfg.minStatesForTrigger) {
            opportunities.push({
                entityId: doc.id,
                entityType: 'brand',
                entityName: data.name || doc.id,
                triggerType: 'wide_distribution',
                score: (retailerCount * 2) + (stateCount * 20), // Weighted score
                metrics: { retailerCount, stateCount },
                suggestedAction: stateCount >= 3 ? 'founders_pitch' : 'email',
                createdAt: new Date()
            });
        }
    }

    return opportunities.sort((a, b) => b.score - a.score);
}

/**
 * Get all claim opportunities across all trigger types
 */
export async function getAllClaimOpportunities(
    config: Partial<ClaimConversionConfig> = {}
): Promise<ClaimOpportunity[]> {
    const [highTraffic, multiZip, wideDistribution] = await Promise.all([
        detectHighTrafficOpportunities(config),
        detectMultiZipOpportunities(config),
        detectWideDistributionOpportunities(config)
    ]);

    const all = [...highTraffic, ...multiZip, ...wideDistribution];

    // Dedupe by entityId (keep highest score)
    const deduped = new Map<string, ClaimOpportunity>();
    for (const opp of all) {
        const existing = deduped.get(opp.entityId);
        if (!existing || opp.score > existing.score) {
            deduped.set(opp.entityId, opp);
        }
    }

    return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
}

/**
 * Check Founders pricing availability
 */
export function getFoundersAvailability(config: ClaimConversionConfig = DEFAULT_CONFIG): {
    available: boolean;
    remaining: number;
    percentClaimed: number;
} {
    const remaining = config.foundersSlotsCap - config.foundersClaimedCount;
    return {
        available: remaining > 0,
        remaining,
        percentClaimed: Math.round((config.foundersClaimedCount / config.foundersSlotsCap) * 100)
    };
}
