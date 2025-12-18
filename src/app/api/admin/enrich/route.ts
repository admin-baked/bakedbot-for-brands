// src/app/api/admin/enrich/route.ts
/**
 * Batch enrichment API endpoint
 * Triggers GMaps enrichment for dispensary pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getGMapsPlacesNear } from '@/server/services/gmaps-connector';
import { logger } from '@/lib/monitoring';

export const maxDuration = 60; // 60 second timeout

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { state, limit = 25 } = body;

        const firestore = getAdminFirestore();

        // Query dispensaries that haven't been enriched
        let query = firestore.collection('dispensaries')
            .where('gmapsEnrichedAt', '==', null)
            .limit(limit);

        if (state) {
            query = firestore.collection('dispensaries')
                .where('state', '==', state)
                .where('gmapsEnrichedAt', '==', null)
                .limit(limit);
        }

        const snapshot = await query.get();

        const results = {
            total: snapshot.size,
            enriched: 0,
            skipped: 0,
            errors: 0,
        };

        for (const doc of snapshot.docs) {
            const dispensary = doc.data();

            if (!dispensary.lat || !dispensary.lon) {
                results.skipped++;
                continue;
            }

            try {
                const places = await getGMapsPlacesNear(dispensary.lat, dispensary.lon, 0.5);

                if (places.length === 0) {
                    results.skipped++;
                    continue;
                }

                // Find best match
                const dispensaryName = (dispensary.name || '').toLowerCase();
                const bestMatch = places.find(p =>
                    p.title.toLowerCase().includes(dispensaryName) ||
                    dispensaryName.includes(p.title.toLowerCase())
                ) || places[0];

                // Update dispensary
                const updates: Record<string, any> = {
                    gmapsEnrichedAt: new Date(),
                    gmapsPlaceId: bestMatch.placeId,
                };

                if (bestMatch.phone && !dispensary.phone) updates.phone = bestMatch.phone;
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

                await firestore.collection('dispensaries').doc(doc.id).update(updates);
                results.enriched++;

            } catch (error) {
                logger.error('Error enriching dispensary', { id: doc.id, error });
                results.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            results,
        });

    } catch (error: any) {
        logger.error('Batch enrichment failed', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
