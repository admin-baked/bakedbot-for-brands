'use server';

/**
 * Auto-Competitor Discovery Service
 * Automatically finds nearby competitors based on location
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { getRetailersByZipCode } from '@/server/services/geo-discovery';
import type { CompetitorType } from '@/types/ezal-scraper';

export interface DiscoveredCompetitor {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    distance?: number;
    type: CompetitorType;
    suggested: boolean;
}

/**
 * Discover nearest competitors for a given ZIP code
 * Uses CannMenus geo-discovery to find dispensaries
 */
export async function discoverNearestCompetitors(
    zip: string,
    limit: number = 3
): Promise<DiscoveredCompetitor[]> {
    try {
        const retailers = await getRetailersByZipCode(zip, limit);

        return retailers.map(r => ({
            id: r.id,
            name: r.name,
            address: r.address || 'Address unavailable',
            city: r.city || 'Unknown City',
            state: r.state || 'Unknown State',
            zip: r.postalCode || zip,
            distance: r.distance ?? undefined,
            type: 'dispensary' as CompetitorType,
            suggested: true,
        }));
    } catch (error) {
        logger.error('Failed to discover competitors:', error);
        return [];
    }
}

/**
 * Auto-setup competitors during onboarding
 * Finds 3 nearest and saves them to the user's competitor list
 */
export async function autoSetupCompetitors(
    tenantId: string,
    zip: string,
    ownDispensaryId?: string
): Promise<{ success: boolean; competitors: DiscoveredCompetitor[]; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        // 1. Discover nearby competitors
        const discovered = await discoverNearestCompetitors(zip, 5);

        // 2. Filter out own dispensary if provided
        const competitors = discovered
            .filter(c => c.id !== ownDispensaryId)
            .slice(0, 3);

        // 3. Save to Firestore
        const batch = firestore.batch();
        const competitorsRef = firestore.collection('tenants').doc(tenantId).collection('competitors');

        for (const comp of competitors) {
            const docRef = competitorsRef.doc(comp.id);
            batch.set(docRef, {
                ...comp,
                tenantId,
                active: true,
                autoDiscovered: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true });
        }

        await batch.commit();

        logger.info('Auto-setup competitors complete', { tenantId, count: competitors.length });

        return {
            success: true,
            competitors,
        };
    } catch (error: any) {
        logger.error('Failed to auto-setup competitors:', error);
        return {
            success: false,
            competitors: [],
            error: error.message,
        };
    }
}

/**
 * Get suggested competitors for dashboard "Auto-Discover" button
 */
export async function getSuggestedCompetitors(
    zip: string,
    excludeIds: string[] = []
): Promise<DiscoveredCompetitor[]> {
    try {
        const discovered = await discoverNearestCompetitors(zip, 10);

        return discovered.filter(c => !excludeIds.includes(c.id));
    } catch (error) {
        logger.error('Failed to get suggested competitors:', error);
        return [];
    }
}
