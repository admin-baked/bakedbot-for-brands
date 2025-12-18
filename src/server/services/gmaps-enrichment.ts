'use server';

/**
 * Page Enrichment Service
 * Enriches dispensary and brand pages with Google Maps data
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { getGMapsPlacesNear } from '@/server/services/gmaps-connector';
import type { GMapsDispensaryDoc } from '@/types/gmaps';

export interface EnrichmentResult {
    success: boolean;
    placesFound: number;
    fieldsUpdated: string[];
    error?: string;
    placeId?: string;
}

/**
 * Enrich a dispensary page with Google Maps data
 * Updates hours, phone, rating, photos from GMaps
 */
export async function enrichDispensaryWithGMaps(
    dispensaryId: string,
    lat: number,
    lng: number
): Promise<EnrichmentResult> {
    try {
        const { firestore } = await createServerClient();

        // Find matching GMaps places nearby
        const gmapsPlaces = await getGMapsPlacesNear(lat, lng, 0.5, 5); // 500m radius

        if (gmapsPlaces.length === 0) {
            return { success: false, placesFound: 0, fieldsUpdated: [] };
        }

        // Get the dispensary doc
        const dispensaryRef = firestore.collection('dispensaries').doc(dispensaryId);
        const dispensaryDoc = await dispensaryRef.get();

        if (!dispensaryDoc.exists) {
            return { success: false, placesFound: 0, fieldsUpdated: [], error: 'Dispensary not found' };
        }

        const dispensary = dispensaryDoc.data();
        const dispensaryName = (dispensary?.name || '').toLowerCase();

        // Find best match by name similarity
        const bestMatch = gmapsPlaces.find(p =>
            p.title.toLowerCase().includes(dispensaryName) ||
            dispensaryName.includes(p.title.toLowerCase())
        ) || gmapsPlaces[0];

        // Build update object
        const updates: Record<string, any> = {};
        const fieldsUpdated: string[] = [];

        if (bestMatch.phone && !dispensary?.phone) {
            updates.phone = bestMatch.phone;
            fieldsUpdated.push('phone');
        }

        if (bestMatch.rating && !dispensary?.rating) {
            updates.rating = bestMatch.rating;
            updates.reviewCount = bestMatch.reviewsCount;
            fieldsUpdated.push('rating');
        }

        if (bestMatch.openingHours && !dispensary?.openingHours) {
            updates.openingHours = bestMatch.openingHours;
            fieldsUpdated.push('openingHours');
        }

        if (bestMatch.website && !dispensary?.website) {
            updates.website = bestMatch.website;
            fieldsUpdated.push('website');
        }

        if (bestMatch.imageUrl && !dispensary?.gmapsImageUrl) {
            updates.gmapsImageUrl = bestMatch.imageUrl;
            fieldsUpdated.push('imageUrl');
        }

        // Store GMaps reference for future use
        updates.gmapsPlaceId = bestMatch.placeId;
        updates.gmapsEnrichedAt = new Date();

        if (Object.keys(updates).length > 0) {
            await dispensaryRef.update(updates);
        }

        logger.info('Dispensary enriched with GMaps data', {
            dispensaryId,
            placesFound: gmapsPlaces.length,
            fieldsUpdated
        });

        return {
            success: true,
            placesFound: gmapsPlaces.length,
            fieldsUpdated,
        };
    } catch (error: any) {
        logger.error('Failed to enrich dispensary with GMaps:', error);
        return {
            success: false,
            placesFound: 0,
            fieldsUpdated: [],
            error: error.message,
        };
    }
}

/**
 * Batch enrich all dispensaries in a state
 */
export async function batchEnrichDispensariesByState(
    state: string,
    limit: number = 50
): Promise<{ enriched: number; skipped: number; errors: number }> {
    const { firestore } = await createServerClient();

    const dispensariesSnapshot = await firestore
        .collection('dispensaries')
        .where('state', '==', state)
        .where('gmapsEnrichedAt', '==', null)
        .limit(limit)
        .get();

    let enriched = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of dispensariesSnapshot.docs) {
        const dispensary = doc.data();

        if (!dispensary.lat || !dispensary.lon) {
            skipped++;
            continue;
        }

        const result = await enrichDispensaryWithGMaps(doc.id, dispensary.lat, dispensary.lon);

        if (result.success) {
            enriched++;
        } else if (result.error) {
            errors++;
        } else {
            skipped++;
        }
    }

    logger.info('Batch enrichment complete', { state, enriched, skipped, errors });

    return { enriched, skipped, errors };
}

/**
 * Auto-enrich on page generation
 * Call this when creating new SEO pages
 */
export async function enrichOnPageCreate(
    pageType: 'dispensary' | 'brand',
    entityId: string,
    coords?: { lat: number; lng: number }
): Promise<EnrichmentResult> {
    if (!coords) {
        return { success: false, placesFound: 0, fieldsUpdated: [], error: 'No coordinates' };
    }

    if (pageType === 'dispensary') {
        return enrichDispensaryWithGMaps(entityId, coords.lat, coords.lng);
    }

    // For brands, we could enrich with GMaps data later
    return { success: true, placesFound: 0, fieldsUpdated: [] };
}
