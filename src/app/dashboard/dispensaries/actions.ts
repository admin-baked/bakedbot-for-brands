'use server';

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { searchNearbyRetailers } from '@/lib/cannmenus-api';
import { logger } from '@/lib/logger';

export async function getBrandDispensaries() {
    const user = await requireUser(['brand', 'owner']);
    const brandId = user.brandId;

    if (!brandId) {
        throw new Error('No brand ID associated with user');
    }

    const { firestore } = await createServerClient();

    // In a real app, we would have a 'relationships' collection or 'dispensaries' subcollection under brand.
    // For now, let's assume we store them in a subcollection 'partners' under the brand doc.
    const partnersRef = firestore.collection('organizations').doc(brandId).collection('partners');
    const snapshot = await partnersRef.get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function searchDispensaries(query: string, state: string) {
    await requireUser(['brand', 'owner']);

    // CannMenus searchNearbyRetailers uses lat/long. 
    // We might need a text search endpoint or geocode the state/city first.
    // For this MVP, let's assume we can search by state or use a hardcoded lat/long for the state center if needed,
    // OR we use a different CannMenus endpoint if available.
    // Looking at `cannmenus-api.ts`, `searchNearbyRetailers` takes lat/long.
    // Let's mock a search for now or use a placeholder if we don't have geocoding.
    // Ideally, we'd use the `geocodeZipCode` from `cannmenus-api.ts` if the user provided a zip.
    // If query is a zip, use it.

    try {
        // Simple heuristic: if query looks like zip
        if (/^\d{5}$/.test(query)) {
            const { geocodeZipCode } = await import('@/lib/cannmenus-api');
            const coords = await geocodeZipCode(query);
            if (coords) {
                return await searchNearbyRetailers(coords.lat, coords.lng, 20, state);
            }
        }

        // Fallback: Return empty or mock if we can't search by text yet
        return [];
    } catch (error) {
        logger.error('Error searching dispensaries:', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

export async function addDispensary(dispensary: any) {
    const user = await requireUser(['brand', 'owner']);
    const brandId = user.brandId;

    if (!brandId) {
        throw new Error('No brand ID associated with user');
    }

    const { firestore } = await createServerClient();
    const partnersRef = firestore.collection('organizations').doc(brandId).collection('partners');

    if (dispensary.id) {
        await partnersRef.doc(dispensary.id).set({
            ...dispensary,
            addedAt: new Date().toISOString(),
            status: 'active'
        });
    } else {
        await partnersRef.add({
            ...dispensary,
            addedAt: new Date().toISOString(),
            status: 'active'
        });
    }

    return { success: true };
}
