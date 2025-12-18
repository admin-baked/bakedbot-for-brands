'use server';

/**
 * Places Connector Service
 * Resolves Google Place IDs and manages TTL-based snapshots
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type {
    PlaceDoc,
    PlaceSnapshot,
    PlacesSearchInput,
    PlaceDetailsInput,
    GooglePlaceReview,
} from '@/types/places';
import { PLACES_CONFIG, PLACE_FIELD_MASKS } from '@/types/places';

const GOOGLE_PLACES_API_BASE = 'https://places.googleapis.com/v1';

// ============== API Key ==============

function getGoogleApiKey(): string | null {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
        logger.warn('Google Places API key not configured');
        return null;
    }
    return key;
}

export async function isPlacesConfigured(): Promise<boolean> {
    return !!getGoogleApiKey();
}

// ============== Place Resolution ==============

/**
 * Resolve a dispensary to a Google Place ID
 * Uses text search with location bias for accuracy
 */
export async function resolvePlaceId(
    dispensaryName: string,
    address: string,
    lat?: number,
    lng?: number
): Promise<{ placeId: string; confidence: number } | null> {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
        return null;
    }

    try {
        const textQuery = `${dispensaryName} ${address}`;

        const requestBody: any = {
            textQuery,
            maxResultCount: 3,
            includedTypes: ['store', 'cannabis_store', 'health'],
        };

        if (lat && lng) {
            requestBody.locationBias = {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 1000, // 1km
                },
            };
        }

        const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            logger.error('Places search failed', { status: response.status });
            return null;
        }

        const data = await response.json();
        const places = data.places || [];

        if (places.length === 0) {
            return null;
        }

        // Calculate confidence based on name/address match
        const bestMatch = places[0];
        const displayName = bestMatch.displayName?.text || '';
        const formattedAddress = bestMatch.formattedAddress || '';

        const nameMatch = displayName.toLowerCase().includes(dispensaryName.toLowerCase()) ||
            dispensaryName.toLowerCase().includes(displayName.toLowerCase());
        const addressMatch = formattedAddress.toLowerCase().includes(address.split(',')[0].toLowerCase());

        const confidence = (nameMatch ? 0.5 : 0) + (addressMatch ? 0.5 : 0);

        return {
            placeId: bestMatch.id,
            confidence,
        };
    } catch (error) {
        logger.error('Error resolving place ID:', error);
        return null;
    }
}

// ============== Snapshot Management ==============

/**
 * Fetch a fresh snapshot from Google Places API
 */
export async function fetchPlaceSnapshot(
    placeId: string,
    fieldMask: readonly string[] = PLACE_FIELD_MASKS.dispensaryPage
): Promise<PlaceSnapshot | null> {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
        return null;
    }

    try {
        const response = await fetch(`${GOOGLE_PLACES_API_BASE}/places/${placeId}`, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fieldMask.join(','),
            },
        });

        if (!response.ok) {
            logger.error('Place details fetch failed', { placeId, status: response.status });
            return null;
        }

        const place = await response.json();
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + PLACES_CONFIG.snapshotTTLDays);

        // Map reviews with required flagContentUri
        const reviews: GooglePlaceReview[] = (place.reviews || [])
            .slice(0, PLACES_CONFIG.maxReviewsPerPlace)
            .map((r: any) => ({
                authorName: r.authorAttribution?.displayName || 'Anonymous',
                authorUri: r.authorAttribution?.uri,
                authorPhotoUri: r.authorAttribution?.photoUri,
                rating: r.rating,
                text: r.text?.text,
                relativePublishTimeDescription: r.relativePublishTimeDescription,
                publishTime: r.publishTime,
                flagContentUri: r.flagContentUri, // Required by TOS
            }));

        const snapshot: PlaceSnapshot = {
            snapshotId: now.toISOString().split('T')[0].replace(/-/g, ''),
            placeId,
            fetchedAt: now,
            expiresAt,
            displayName: place.displayName?.text || '',
            formattedAddress: place.formattedAddress || '',
            nationalPhoneNumber: place.nationalPhoneNumber,
            websiteUri: place.websiteUri,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            regularOpeningHours: place.regularOpeningHours,
            currentOpeningHours: place.currentOpeningHours,
            reviews,
            googleMapsLinks: place.googleMapsLinks,
            attributions: place.attributions,
        };

        return snapshot;
    } catch (error) {
        logger.error('Error fetching place snapshot:', error);
        return null;
    }
}

/**
 * Get cached snapshot or fetch fresh one
 */
export async function getPlaceSnapshot(
    placeId: string,
    forceFresh: boolean = false
): Promise<PlaceSnapshot | null> {
    const firestore = getAdminFirestore();

    // Check cache first
    if (!forceFresh) {
        const snapshotsRef = firestore
            .collection('places')
            .doc(placeId)
            .collection('snapshots')
            .orderBy('fetchedAt', 'desc')
            .limit(1);

        const snapshot = await snapshotsRef.get();

        if (!snapshot.empty) {
            const cached = snapshot.docs[0].data() as PlaceSnapshot;
            const expiresAt = cached.expiresAt instanceof Date
                ? cached.expiresAt
                : new Date(cached.expiresAt);

            if (new Date() < expiresAt) {
                return cached;
            }
        }
    }

    // Fetch fresh snapshot
    const freshSnapshot = await fetchPlaceSnapshot(placeId);

    if (freshSnapshot) {
        // Save to cache
        await firestore
            .collection('places')
            .doc(placeId)
            .collection('snapshots')
            .doc(freshSnapshot.snapshotId)
            .set({
                ...freshSnapshot,
                fetchedAt: freshSnapshot.fetchedAt,
                expiresAt: freshSnapshot.expiresAt,
            });

        // Update place doc
        await firestore.collection('places').doc(placeId).set({
            placeId,
            updatedAt: new Date(),
        }, { merge: true });
    }

    return freshSnapshot;
}

// ============== Dispensary Enrichment ==============

/**
 * Enrich a dispensary with Google Places data
 */
export async function enrichDispensaryWithPlaces(
    dispensaryId: string,
    dispensaryName: string,
    address: string,
    lat?: number,
    lng?: number
): Promise<{ success: boolean; placeId?: string; snapshot?: PlaceSnapshot }> {
    const firestore = getAdminFirestore();

    // Check if already has placeId
    const dispensaryDoc = await firestore.collection('dispensaries').doc(dispensaryId).get();
    const dispensary = dispensaryDoc.data();

    let placeId = dispensary?.google?.placeId;

    // Resolve placeId if not exists
    if (!placeId) {
        const resolved = await resolvePlaceId(dispensaryName, address, lat, lng);

        if (!resolved || resolved.confidence < PLACES_CONFIG.minConfidenceForAutoMatch) {
            logger.warn('Could not resolve place ID with sufficient confidence', { dispensaryId });
            return { success: false };
        }

        placeId = resolved.placeId;

        // Save placeId to dispensary
        await firestore.collection('dispensaries').doc(dispensaryId).update({
            'google.placeId': placeId,
            'google.placeConfidence': resolved.confidence,
            'google.lastEnrichedAt': new Date(),
        });
    }

    // Get snapshot
    const snapshot = await getPlaceSnapshot(placeId);

    if (!snapshot) {
        return { success: false, placeId };
    }

    // Update dispensary with snapshot data
    const updates: Record<string, any> = {
        'google.lastEnrichedAt': new Date(),
    };

    if (snapshot.rating && !dispensary?.googleRating) {
        updates.googleRating = snapshot.rating;
        updates.googleReviewCount = snapshot.userRatingCount;
    }

    if (snapshot.regularOpeningHours && !dispensary?.googleHours) {
        updates.googleHours = snapshot.regularOpeningHours;
    }

    if (snapshot.nationalPhoneNumber && !dispensary?.googlePhone) {
        updates.googlePhone = snapshot.nationalPhoneNumber;
    }

    await firestore.collection('dispensaries').doc(dispensaryId).update(updates);

    logger.info('Dispensary enriched with Places data', { dispensaryId, placeId });

    return { success: true, placeId, snapshot };
}

// ============== Query Functions ==============

/**
 * Get opening status for a dispensary
 */
export async function getDispensaryOpenStatus(
    placeId: string
): Promise<{ isOpen: boolean; closesAt?: string } | null> {
    const snapshot = await getPlaceSnapshot(placeId);

    if (!snapshot?.currentOpeningHours) {
        return null;
    }

    return {
        isOpen: snapshot.currentOpeningHours.openNow || false,
        closesAt: undefined, // Would need to parse periods
    };
}
