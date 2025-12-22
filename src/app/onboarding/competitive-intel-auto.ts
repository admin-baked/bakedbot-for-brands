/**
 * Server-side helper for auto-discovering competitors during onboarding
 * This is called from the onboarding action to avoid circular dependencies
 */

import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { CannMenusService } from '@/server/services/cannmenus';

/**
 * Auto-discover competitors during onboarding
 * Called with Firestore instance to avoid re-initialization
 */
export async function autoDiscoverCompetitors(
    orgId: string,
    marketState: string,
    firestore: Firestore
): Promise<{ discovered: number }> {
    try {
        const cms = new CannMenusService();

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

        const coords = stateCenters[marketState.toUpperCase()] || { lat: 41.8781, lng: -87.6298 };

        // Find retailers near the state center
        const competitors = await cms.findRetailers({
            lat: coords.lat,
            lng: coords.lng,
            limit: 10
        });

        if (competitors.length === 0) {
            return { discovered: 0 };
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
                address: comp.street_address || null,
                city: comp.city || null,
                state: comp.state || marketState,
                distance: comp.distance || null,
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

        return { discovered };
    } catch (error) {
        logger.error('Auto-discover competitors failed:', {
            orgId,
            marketState,
            error: error instanceof Error ? error.message : String(error)
        });
        return { discovered: 0 };
    }
}
