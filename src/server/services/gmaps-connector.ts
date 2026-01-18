'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type {
    GMapsPlace,
    GMapsSearchInput,
    GMapsRunResponse,
    GMapsIngestionRun,
    GMapsDispensaryDoc
} from '@/types/gmaps';
import { createSlug } from '@/lib/utils/slug';

const APIFY_API_BASE = 'https://api.apify.com/v2';
const GMAPS_TASK_ID = 'Kb9uh4qmh4s76kDan';  // bakedbot-ai~google-maps-discovery-task

/**
 * Get Apify API token from environment
 */
function getApifyToken(): string {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        throw new Error('APIFY_API_TOKEN environment variable not set');
    }
    return token;
}


/**
 * Trigger a dispensary search via Google Maps
 */
export async function triggerDispensarySearch(
    location: string,
    searchTerms: string[] = ['dispensary', 'cannabis store'],
    maxResults: number = 50
): Promise<GMapsIngestionRun> {
    const firestore = getAdminFirestore();
    const token = getApifyToken();

    const input: GMapsSearchInput = {
        searchStringsArray: searchTerms,
        locationQuery: location,
        maxCrawledPlacesPerSearch: maxResults,
        language: 'en',
        skipClosedPlaces: true,
    };

    // Start the Apify run
    const response = await fetch(`${APIFY_API_BASE}/actor-tasks/${GMAPS_TASK_ID}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apify API error: ${error}`);
    }

    const runData: { data: GMapsRunResponse } = await response.json();
    const run = runData.data;

    // Create ingestion run record
    const runRef = firestore.collection('gmapsRuns').doc(run.id);
    const ingestionRun: GMapsIngestionRun = {
        id: run.id,
        apifyRunId: run.id,
        searchTerms,
        location,
        status: 'running',
        startedAt: new Date(),
        placesFound: 0,
        placesIngested: 0,
        errors: [],
    };

    await runRef.set(ingestionRun);
    logger.info(`Started Google Maps discovery for ${location}`, { runId: run.id, searchTerms });

    return ingestionRun;
}

/**
 * Trigger a custom geolocation search (polygon or circle)
 */
export async function triggerGeoSearch(
    customGeolocation: GMapsSearchInput['customGeolocation'],
    searchTerms: string[] = ['dispensary'],
    maxResults: number = 100
): Promise<GMapsIngestionRun> {
    const firestore = getAdminFirestore();
    const token = getApifyToken();

    const input: GMapsSearchInput = {
        searchStringsArray: searchTerms,
        customGeolocation,
        maxCrawledPlacesPerSearch: maxResults,
        language: 'en',
        skipClosedPlaces: true,
    };

    const response = await fetch(`${APIFY_API_BASE}/actor-tasks/${GMAPS_TASK_ID}/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apify API error: ${error}`);
    }

    const runData: { data: GMapsRunResponse } = await response.json();
    const run = runData.data;

    const runRef = firestore.collection('gmapsRuns').doc(run.id);
    const ingestionRun: GMapsIngestionRun = {
        id: run.id,
        apifyRunId: run.id,
        searchTerms,
        status: 'running',
        startedAt: new Date(),
        placesFound: 0,
        placesIngested: 0,
        errors: [],
    };

    await runRef.set(ingestionRun);
    logger.info(`Started Google Maps geo discovery`, { runId: run.id, searchTerms });

    return ingestionRun;
}

/**
 * Check status of a Google Maps run
 */
export async function checkGMapsRunStatus(runId: string): Promise<GMapsRunResponse['status']> {
    const token = getApifyToken();

    const response = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}?token=${token}`);
    if (!response.ok) {
        throw new Error(`Failed to check run status: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data.status;
}

/**
 * Ingest dataset from completed Google Maps run
 */
export async function ingestGMapsDataset(runId: string): Promise<{ places: number }> {
    const firestore = getAdminFirestore();
    const token = getApifyToken();

    // Get the run info to find the dataset ID
    const runResponse = await fetch(`${APIFY_API_BASE}/actor-runs/${runId}?token=${token}`);
    if (!runResponse.ok) {
        throw new Error(`Failed to get run info: ${await runResponse.text()}`);
    }

    const runData = await runResponse.json();
    const datasetId = runData.data.defaultDatasetId;

    // Fetch dataset items
    const datasetResponse = await fetch(`${APIFY_API_BASE}/datasets/${datasetId}/items?token=${token}`);
    if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${await datasetResponse.text()}`);
    }

    const items: GMapsPlace[] = await datasetResponse.json();

    let placesIngested = 0;

    // Process each place
    for (const item of items) {
        try {
            // Skip if no placeId
            if (!item.placeId) continue;

            // Skip if closed
            if (item.permanentlyClosed) continue;

            await upsertGMapsPlace(item);
            placesIngested++;
        } catch (e: any) {
            logger.warn(`Failed to ingest GMaps place: ${e.message}`, { title: item.title });
        }
    }

    // Update ingestion run record
    await firestore.collection('gmapsRuns').doc(runId).update({
        status: 'completed',
        completedAt: new Date(),
        placesFound: items.length,
        placesIngested,
    });

    logger.info(`Ingested Google Maps dataset`, { runId, placesFound: items.length, placesIngested });

    return { places: placesIngested };
}

/**
 * Upsert a Google Maps place into Firestore
 */
async function upsertGMapsPlace(data: GMapsPlace): Promise<void> {
    const firestore = getAdminFirestore();
    const slug = createSlug(data.title);

    const doc: GMapsDispensaryDoc = {
        id: data.placeId,
        placeId: data.placeId,
        title: data.title,
        slug,
        address: data.address,
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode,
        phone: data.phoneUnformatted || data.phone,
        website: data.website,
        location: data.location,
        rating: data.totalScore,
        reviewsCount: data.reviewsCount,
        categories: data.categories,
        openingHours: data.openingHours,
        imageUrl: data.imageUrl,
        priceLevel: data.price,
        permanentlyClosed: data.permanentlyClosed,
        temporarilyClosed: data.temporarilyClosed,
        lastDiscoveredAt: new Date(),
        source: 'gmaps',
    };

    await firestore
        .collection('sources')
        .doc('gmaps')
        .collection('places')
        .doc(data.placeId)
        .set(doc, { merge: true });
}

// ============== Query Functions ==============

/**
 * Get Google Maps places by state
 */
export async function getGMapsPlacesByState(state: string, limit: number = 50): Promise<GMapsDispensaryDoc[]> {
    const firestore = getAdminFirestore();

    const snapshot = await firestore
        .collection('sources')
        .doc('gmaps')
        .collection('places')
        .where('state', '==', state)
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            lastDiscoveredAt: data.lastDiscoveredAt?.toDate?.() || new Date(),
        } as GMapsDispensaryDoc;
    });
}

/**
 * Get Google Maps places near coordinates
 */
export async function getGMapsPlacesNear(
    lat: number,
    lng: number,
    radiusKm: number = 10,
    limit: number = 20
): Promise<GMapsDispensaryDoc[]> {
    const firestore = getAdminFirestore();

    // Simple bounding box filter (not true geo query, but works for basic cases)
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const snapshot = await firestore
        .collection('sources')
        .doc('gmaps')
        .collection('places')
        .where('location.lat', '>=', lat - latDelta)
        .where('location.lat', '<=', lat + latDelta)
        .limit(limit * 2) // Fetch more to filter by lng
        .get();

    const places = snapshot.docs
        .map(doc => {
            const data = doc.data();
            return {
                ...data,
                lastDiscoveredAt: data.lastDiscoveredAt?.toDate?.() || new Date(),
            } as GMapsDispensaryDoc;
        })
        .filter(p => {
            // Filter by longitude in memory
            return p.location.lng >= lng - lngDelta && p.location.lng <= lng + lngDelta;
        })
        .slice(0, limit);

    return places;
}

/**
 * Get recent Google Maps runs
 */
export async function getRecentGMapsRuns(limit: number = 10): Promise<GMapsIngestionRun[]> {
    const firestore = getAdminFirestore();

    const snapshot = await firestore
        .collection('gmapsRuns')
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            apifyRunId: data.apifyRunId,
            searchTerms: data.searchTerms || [],
            location: data.location,
            status: data.status,
            startedAt: data.startedAt?.toDate?.() || new Date(),
            completedAt: data.completedAt?.toDate?.(),
            placesFound: data.placesFound || 0,
            placesIngested: data.placesIngested || 0,
            errors: data.errors || [],
        } as GMapsIngestionRun;
    });
}

/**
 * Get Google Maps stats
 */
export async function getGMapsStats(): Promise<{
    totalPlaces: number;
    recentRuns: number;
    lastRunAt?: Date;
}> {
    const firestore = getAdminFirestore();

    const [placesSnap, runsSnap] = await Promise.all([
        firestore.collection('sources').doc('gmaps').collection('places').count().get(),
        firestore.collection('gmapsRuns')
            .orderBy('startedAt', 'desc')
            .limit(1)
            .get(),
    ]);

    return {
        totalPlaces: placesSnap.data().count,
        recentRuns: runsSnap.docs.length,
        lastRunAt: runsSnap.docs[0]?.data()?.startedAt?.toDate?.(),
    };
}
