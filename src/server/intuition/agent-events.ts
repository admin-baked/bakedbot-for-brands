/**
 * Intuition OS - Agent Events Service
 * 
 * Loop 1: Log Everything
 * 
 * Every interaction, decision, and outcome becomes a structured event.
 * These events are the raw material for learning.
 */

import {
    AgentEvent,
    AgentEventType,
    AgentName
} from './schema';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getEventsCollection(tenantId: string) {
    return `tenants/${tenantId}/agentEvents`;
}

// --- Event Queue for Batching ---

interface QueuedEvent {
    event: Omit<AgentEvent, 'id' | 'createdAt'>;
    resolve: (eventId: string) => void;
    reject: (error: Error) => void;
}

const eventQueue: QueuedEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;
const BATCH_SIZE = 500;
const FLUSH_INTERVAL_MS = 5000;

/**
 * Logs an agent event to Firestore.
 * Events are batched for cost optimization.
 */
export async function logAgentEvent(
    event: Omit<AgentEvent, 'id' | 'createdAt'>
): Promise<string> {
    return new Promise((resolve, reject) => {
        eventQueue.push({ event, resolve, reject });

        // Flush immediately if batch is full
        if (eventQueue.length >= BATCH_SIZE) {
            flushEventQueue();
        }

        // Schedule flush if not already scheduled
        if (!flushTimer) {
            flushTimer = setTimeout(flushEventQueue, FLUSH_INTERVAL_MS);
        }
    });
}

/**
 * Flushes the event queue to Firestore.
 */
async function flushEventQueue(): Promise<void> {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    if (eventQueue.length === 0) return;

    // Take current batch
    const batch = eventQueue.splice(0, BATCH_SIZE);

    try {
        const { firestore } = await createServerClient();
        const writeBatch = firestore.batch();
        const eventIds: string[] = [];

        for (const { event } of batch) {
            const eventId = uuidv4();
            const timestamp = new Date().toISOString();

            const fullEvent: AgentEvent = {
                ...event,
                id: eventId,
                createdAt: timestamp,
            };

            const docRef = firestore
                .collection(getEventsCollection(event.tenantId))
                .doc(eventId);

            writeBatch.set(docRef, fullEvent);
            eventIds.push(eventId);
        }

        await writeBatch.commit();

        // Resolve all promises
        batch.forEach((item, index) => {
            item.resolve(eventIds[index]);
        });

        logger.debug(`[Intuition] Flushed ${batch.length} events to Firestore`);
    } catch (error) {
        // Reject all promises
        const err = error instanceof Error ? error : new Error(String(error));
        batch.forEach(item => item.reject(err));

        logger.error('[Intuition] Failed to flush events', err);
    }
}

/**
 * Force flush for graceful shutdown.
 */
export async function forceFlushEvents(): Promise<void> {
    while (eventQueue.length > 0) {
        await flushEventQueue();
    }
}

// --- Query Functions ---

/**
 * Gets recent events for a tenant.
 */
export async function getRecentEvents(
    tenantId: string,
    options: {
        agent?: AgentName;
        type?: AgentEventType;
        sessionId?: string;
        customerId?: string;
        limit?: number;
        startAfter?: string;
    } = {}
): Promise<AgentEvent[]> {
    const { agent, type, sessionId, customerId, limit = 100, startAfter } = options;

    try {
        const { firestore } = await createServerClient();
        let query = firestore
            .collection(getEventsCollection(tenantId))
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (agent) {
            query = query.where('agent', '==', agent);
        }
        if (type) {
            query = query.where('type', '==', type);
        }
        if (sessionId) {
            query = query.where('sessionId', '==', sessionId);
        }
        if (customerId) {
            query = query.where('customerId', '==', customerId);
        }
        if (startAfter) {
            query = query.startAfter(startAfter);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data() as AgentEvent);
    } catch (error) {
        logger.error('[Intuition] Failed to fetch events',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Gets events for a specific session.
 */
export async function getSessionEvents(
    tenantId: string,
    sessionId: string
): Promise<AgentEvent[]> {
    return getRecentEvents(tenantId, { sessionId, limit: 1000 });
}

/**
 * Gets event counts by type for analytics.
 */
export async function getEventCounts(
    tenantId: string,
    startDate: Date,
    endDate: Date
): Promise<Record<AgentEventType, number>> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection(getEventsCollection(tenantId))
            .where('createdAt', '>=', startDate.toISOString())
            .where('createdAt', '<=', endDate.toISOString())
            .get();

        const counts: Record<string, number> = {};
        for (const doc of snapshot.docs) {
            const event = doc.data() as AgentEvent;
            counts[event.type] = (counts[event.type] || 0) + 1;
        }

        return counts as Record<AgentEventType, number>;
    } catch (error) {
        logger.error('[Intuition] Failed to count events',
            error instanceof Error ? error : new Error(String(error)));
        return {} as Record<AgentEventType, number>;
    }
}

// --- Event Creation Helpers ---

/**
 * Creates a recommendation shown event.
 */
export async function logRecommendationShown(
    tenantId: string,
    agent: AgentName,
    sessionId: string,
    products: string[],
    options: {
        customerId?: string;
        confidenceScore?: number;
        systemMode?: 'fast' | 'slow';
        heuristicsApplied?: string[];
    } = {}
): Promise<string> {
    return logAgentEvent({
        agent,
        tenantId,
        sessionId,
        customerId: options.customerId,
        type: 'recommendation_shown',
        payload: { products },
        metadata: {
            confidenceScore: options.confidenceScore,
            systemMode: options.systemMode,
            heuristicsApplied: options.heuristicsApplied,
        },
    });
}

/**
 * Creates a product clicked event.
 */
export async function logProductClicked(
    tenantId: string,
    agent: AgentName,
    sessionId: string,
    productId: string,
    customerId?: string
): Promise<string> {
    return logAgentEvent({
        agent,
        tenantId,
        sessionId,
        customerId,
        type: 'product_clicked',
        payload: { productId },
    });
}

/**
 * Creates an order completed event.
 */
export async function logOrderCompleted(
    tenantId: string,
    agent: AgentName,
    sessionId: string,
    orderId: string,
    products: string[],
    totalAmount: number,
    customerId?: string
): Promise<string> {
    return logAgentEvent({
        agent,
        tenantId,
        sessionId,
        customerId,
        type: 'order_completed',
        payload: { orderId, products, totalAmount },
    });
}

/**
 * Creates a feedback event.
 */
export async function logFeedback(
    tenantId: string,
    agent: AgentName,
    sessionId: string,
    feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment',
    value: number | string,
    customerId?: string
): Promise<string> {
    return logAgentEvent({
        agent,
        tenantId,
        sessionId,
        customerId,
        type: 'feedback',
        payload: { feedbackType, value },
    });
}
