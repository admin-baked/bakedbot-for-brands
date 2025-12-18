#!/usr/bin/env npx ts-node

/**
 * Batch Enrich Pages Script
 * Enriches existing dispensary pages with Google Maps data
 * 
 * Usage: npx ts-node scripts/batch-enrich-pages.ts [--state STATE] [--limit N]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : require('../service-account.json');

    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

interface EnrichmentStats {
    total: number;
    enriched: number;
    skipped: number;
    errors: number;
}

async function getGMapsPlacesNear(lat: number, lng: number, radiusKm: number = 0.5): Promise<any[]> {
    try {
        // Query gmaps_places collection for nearby places
        const snapshot = await db.collection('gmaps_places')
            .where('location.lat', '>=', lat - (radiusKm / 111))
            .where('location.lat', '<=', lat + (radiusKm / 111))
            .limit(10)
            .get();

        // Filter by longitude in memory since Firestore doesn't support compound geo queries
        const places = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((p: any) => {
                const lngDiff = Math.abs(p.location.lng - lng);
                return lngDiff <= (radiusKm / 111);
            });

        return places;
    } catch (error) {
        console.error('Error fetching GMaps places:', error);
        return [];
    }
}

async function enrichDispensary(dispensaryId: string, dispensary: any): Promise<boolean> {
    if (!dispensary.lat || !dispensary.lon) {
        console.log(`  Skipping ${dispensaryId}: No coordinates`);
        return false;
    }

    if (dispensary.gmapsEnrichedAt) {
        console.log(`  Skipping ${dispensaryId}: Already enriched`);
        return false;
    }

    const places = await getGMapsPlacesNear(dispensary.lat, dispensary.lon);

    if (places.length === 0) {
        console.log(`  Skipping ${dispensaryId}: No GMaps places found nearby`);
        return false;
    }

    // Find best match by name
    const dispensaryName = (dispensary.name || '').toLowerCase();
    const bestMatch = places.find((p: any) =>
        p.title?.toLowerCase().includes(dispensaryName) ||
        dispensaryName.includes(p.title?.toLowerCase() || '')
    ) || places[0];

    // Build update
    const updates: Record<string, any> = {
        gmapsEnrichedAt: new Date(),
        gmapsPlaceId: bestMatch.placeId,
    };

    if (bestMatch.phone && !dispensary.phone) {
        updates.phone = bestMatch.phone;
    }
    if (bestMatch.rating && !dispensary.rating) {
        updates.rating = bestMatch.rating;
        updates.reviewsCount = bestMatch.reviewsCount;
    }
    if (bestMatch.openingHours && !dispensary.openingHours) {
        updates.openingHours = bestMatch.openingHours;
    }
    if (bestMatch.website && !dispensary.website) {
        updates.website = bestMatch.website;
    }
    if (bestMatch.imageUrl && !dispensary.gmapsImageUrl) {
        updates.gmapsImageUrl = bestMatch.imageUrl;
    }

    await db.collection('dispensaries').doc(dispensaryId).update(updates);
    console.log(`  ✓ Enriched ${dispensaryId} with ${Object.keys(updates).length - 2} fields`);

    return true;
}

async function batchEnrich(state?: string, limit: number = 50): Promise<EnrichmentStats> {
    console.log(`\n🚀 Starting batch enrichment...`);
    console.log(`   State filter: ${state || 'ALL'}`);
    console.log(`   Limit: ${limit}\n`);

    let query = db.collection('dispensaries')
        .where('gmapsEnrichedAt', '==', null)
        .limit(limit);

    if (state) {
        query = db.collection('dispensaries')
            .where('state', '==', state)
            .limit(limit);
    }

    const snapshot = await query.get();

    const stats: EnrichmentStats = {
        total: snapshot.size,
        enriched: 0,
        skipped: 0,
        errors: 0,
    };

    console.log(`Found ${stats.total} dispensaries to process\n`);

    for (const doc of snapshot.docs) {
        try {
            const enriched = await enrichDispensary(doc.id, doc.data());
            if (enriched) {
                stats.enriched++;
            } else {
                stats.skipped++;
            }
        } catch (error) {
            console.error(`  ✗ Error enriching ${doc.id}:`, error);
            stats.errors++;
        }

        // Rate limit to avoid quota issues
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Enrichment Complete:`);
    console.log(`   Total processed: ${stats.total}`);
    console.log(`   Enriched: ${stats.enriched}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}\n`);

    return stats;
}

// Parse CLI args
const args = process.argv.slice(2);
const stateIndex = args.indexOf('--state');
const limitIndex = args.indexOf('--limit');

const state = stateIndex !== -1 ? args[stateIndex + 1] : undefined;
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;

// Run
batchEnrich(state, limit)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
