/**
 * Algorithm Event Logger
 * Centralized logging for all algorithm events.
 * Events are stored in Firestore for analysis and learning loops.
 */

import { AlgorithmEvent } from './schema';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'algorithm_events';

/**
 * Logs an algorithm event to Firestore.
 * Events are partitioned by brand_id for efficient querying.
 */
export async function logAlgorithmEvent(event: Omit<AlgorithmEvent, 'event_id' | 'timestamp'>): Promise<string> {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();

    const fullEvent: AlgorithmEvent = {
        ...event,
        event_id: eventId,
        timestamp,
    } as AlgorithmEvent;

    try {
        const { firestore } = await createServerClient();

        // Store in brand-partitioned subcollection for efficient queries
        await firestore
            .collection(COLLECTION_NAME)
            .doc(event.brand_id)
            .collection('events')
            .doc(eventId)
            .set(fullEvent);

        logger.debug(`[Algorithms] Logged ${event.event_type} event: ${eventId}`);
        return eventId;
    } catch (error) {
        // Don't fail the main flow if logging fails
        logger.warn('[Algorithms] Failed to log event', error instanceof Error ? error : new Error(String(error)));
        return eventId;
    }
}

/**
 * Queries recent events for a brand (for analysis/debugging).
 */
export async function getRecentEvents(
    brandId: string,
    eventType?: AlgorithmEvent['event_type'],
    limit: number = 100
): Promise<AlgorithmEvent[]> {
    try {
        const { firestore } = await createServerClient();

        let query = firestore
            .collection(COLLECTION_NAME)
            .doc(brandId)
            .collection('events')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        if (eventType) {
            query = query.where('event_type', '==', eventType);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data() as AlgorithmEvent);
    } catch (error) {
        logger.error('[Algorithms] Failed to fetch events', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Aggregates feedback for a specific recommendation event.
 * Used to compute reward signals for learning.
 */
export async function getFeedbackForRecommendation(
    brandId: string,
    recommendationEventId: string
): Promise<Array<{ action: string; sku_id: string; value?: number }>> {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection(COLLECTION_NAME)
            .doc(brandId)
            .collection('events')
            .where('event_type', '==', 'smokey_feedback')
            .where('payload.recommendation_event_id', '==', recommendationEventId)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                action: data.payload?.action,
                sku_id: data.payload?.sku_id,
                value: data.payload?.value,
            };
        });
    } catch (error) {
        logger.error('[Algorithms] Failed to fetch feedback', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
