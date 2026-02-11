/**
 * Media Tracking Service
 *
 * Tracks image and video generation costs and usage analytics.
 * All generation events are persisted to Firestore for reporting.
 *
 * Note: This is a service file, NOT a server action file.
 * It exports utility functions that can be used by server actions.
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import {
    MediaGenerationEvent,
    MediaProvider,
    MediaGenerationType,
    MediaCostEstimate,
    MediaUsageStats,
    MEDIA_PRICING,
} from '@/types/media-generation';

const COLLECTION_NAME = 'media_generation_events';

/**
 * Generates a unique ID for a media generation event
 */
function generateEventId(): string {
    return `mge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates cost for an image generation
 */
export function calculateImageCost(
    provider: 'gemini-flash' | 'gemini-pro',
    _options?: { resolution?: string }
): number {
    const pricing = MEDIA_PRICING[provider];
    return pricing.perImage;
}

/**
 * Calculates cost for a video generation
 */
export function calculateVideoCost(
    provider: 'veo' | 'sora',
    durationSeconds: number
): number {
    const pricing = MEDIA_PRICING[provider];

    if (provider === 'veo') {
        // Veo supports 4, 6, or 8 seconds
        if (durationSeconds <= 4) return pricing.per4Seconds;
        if (durationSeconds <= 6) return pricing.per6Seconds;
        return pricing.per8Seconds;
    } else {
        // Sora supports 4 or 8 seconds
        if (durationSeconds <= 4) return pricing.per4Seconds;
        return pricing.per8Seconds;
    }
}

/**
 * Estimates cost for a media generation request before execution
 */
export function estimateMediaCost(
    type: MediaGenerationType,
    provider: MediaProvider,
    options?: { durationSeconds?: number; resolution?: string }
): MediaCostEstimate {
    let estimatedCostUsd = 0;
    const breakdown: MediaCostEstimate['breakdown'] = {};

    if (type === 'image' || type === 'image_edit') {
        if (provider === 'gemini-flash' || provider === 'gemini-pro') {
            estimatedCostUsd = calculateImageCost(provider, options);
            breakdown.imageCost = estimatedCostUsd;
        }
    } else if (type === 'video') {
        if (provider === 'veo' || provider === 'sora') {
            const duration = options?.durationSeconds || 4;
            estimatedCostUsd = calculateVideoCost(provider, duration);
            breakdown.videoCost = estimatedCostUsd;
        }
    }

    return {
        provider,
        model: getModelForProvider(provider),
        estimatedCostUsd,
        breakdown,
    };
}

/**
 * Maps provider to specific model ID
 */
function getModelForProvider(provider: MediaProvider): string {
    switch (provider) {
        case 'gemini-flash':
            return 'gemini-2.5-flash-image';
        case 'gemini-pro':
            return 'gemini-3-pro-image-preview';
        case 'veo':
            return 'veo-3.1-generate-preview';
        case 'sora':
            return 'sora-2';
        default:
            return provider;
    }
}

/**
 * Tracks a media generation event
 * Persists to Firestore for cost analytics
 */
export async function trackMediaGeneration(
    event: Omit<MediaGenerationEvent, 'id' | 'createdAt'>
): Promise<MediaGenerationEvent> {
    const db = getFirestore();

    const fullEvent: MediaGenerationEvent = {
        ...event,
        id: generateEventId(),
        createdAt: Date.now(),
    };

    try {
        await db.collection(COLLECTION_NAME).doc(fullEvent.id).set({
            ...fullEvent,
            createdAt: Timestamp.fromMillis(fullEvent.createdAt),
        });

        logger.info('[MediaTracking] Event tracked', {
            eventId: fullEvent.id,
            tenantId: fullEvent.tenantId,
            type: fullEvent.type,
            provider: fullEvent.provider,
            costUsd: fullEvent.costUsd,
            success: fullEvent.success,
        });

        // Update aggregate counters for quick dashboard queries
        await updateAggregates(fullEvent);

        return fullEvent;
    } catch (error) {
        logger.error('[MediaTracking] Failed to track event', { error, event });
        // Don't throw - tracking failure shouldn't block generation
        return fullEvent;
    }
}

/**
 * Updates aggregate counters for quick dashboard queries
 */
async function updateAggregates(event: MediaGenerationEvent): Promise<void> {
    const db = getFirestore();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const aggregateRef = db
        .collection('tenants')
        .doc(event.tenantId)
        .collection('media_usage')
        .doc(today);

    try {
        await aggregateRef.set(
            {
                date: today,
                totalCostUsd: FieldValue.increment(event.costUsd),
                totalGenerations: FieldValue.increment(1),
                successfulGenerations: event.success ? FieldValue.increment(1) : FieldValue.increment(0),
                failedGenerations: event.success ? FieldValue.increment(0) : FieldValue.increment(1),
                [`byProvider.${event.provider}.count`]: FieldValue.increment(1),
                [`byProvider.${event.provider}.costUsd`]: FieldValue.increment(event.costUsd),
                [`byType.${event.type}.count`]: FieldValue.increment(1),
                [`byType.${event.type}.costUsd`]: FieldValue.increment(event.costUsd),
                updatedAt: Timestamp.now(),
            },
            { merge: true }
        );
    } catch (error) {
        logger.warn('[MediaTracking] Failed to update aggregates', { error, tenantId: event.tenantId });
    }
}

/**
 * Gets media usage statistics for a tenant within a date range
 */
export async function getMediaUsage(
    tenantId: string,
    startDate: Date,
    endDate: Date
): Promise<MediaUsageStats> {
    const db = getFirestore();

    const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('tenantId', '==', tenantId)
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .orderBy('createdAt', 'desc')
        .get();

    const events: MediaGenerationEvent[] = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
    })) as MediaGenerationEvent[];

    // Calculate aggregates
    const byProvider: MediaUsageStats['byProvider'] = {
        'gemini-flash': { count: 0, costUsd: 0 },
        'gemini-pro': { count: 0, costUsd: 0 },
        'veo': { count: 0, costUsd: 0 },
        'sora': { count: 0, costUsd: 0 },
    };

    const byType: MediaUsageStats['byType'] = {
        image: { count: 0, costUsd: 0 },
        video: { count: 0, costUsd: 0 },
        image_edit: { count: 0, costUsd: 0 },
    };

    const dailyMap = new Map<string, { count: number; costUsd: number }>();

    let totalCostUsd = 0;
    let successfulGenerations = 0;
    let failedGenerations = 0;

    for (const event of events) {
        totalCostUsd += event.costUsd;

        if (event.success) {
            successfulGenerations++;
        } else {
            failedGenerations++;
        }

        // By provider
        byProvider[event.provider].count++;
        byProvider[event.provider].costUsd += event.costUsd;

        // By type
        byType[event.type].count++;
        byType[event.type].costUsd += event.costUsd;

        // Daily trend
        const date = new Date(event.createdAt).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { count: 0, costUsd: 0 };
        dailyMap.set(date, {
            count: existing.count + 1,
            costUsd: existing.costUsd + event.costUsd,
        });
    }

    // Convert daily map to sorted array
    const dailyTrend = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        tenantId,
        period: { start: startDate, end: endDate },
        totalCostUsd,
        totalGenerations: events.length,
        successfulGenerations,
        failedGenerations,
        byProvider,
        byType,
        dailyTrend,
    };
}

/**
 * Gets media costs grouped by provider for a specific period
 */
export async function getMediaCostsByProvider(
    tenantId: string,
    period: 'day' | 'week' | 'month'
): Promise<Record<MediaProvider, number>> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
    }

    const usage = await getMediaUsage(tenantId, startDate, now);

    return {
        'gemini-flash': usage.byProvider['gemini-flash'].costUsd,
        'gemini-pro': usage.byProvider['gemini-pro'].costUsd,
        'veo': usage.byProvider['veo'].costUsd,
        'sora': usage.byProvider['sora'].costUsd,
    };
}

/**
 * Gets recent media generation events for a tenant
 */
export async function getRecentMediaEvents(
    tenantId: string,
    limit: number = 50
): Promise<MediaGenerationEvent[]> {
    const db = getFirestore();

    const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
    })) as MediaGenerationEvent[];
}

/**
 * Gets the top content by cost for a tenant
 */
export async function getTopCostContent(
    tenantId: string,
    limit: number = 10
): Promise<MediaGenerationEvent[]> {
    const db = getFirestore();

    const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('tenantId', '==', tenantId)
        .where('success', '==', true)
        .orderBy('costUsd', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: (doc.data().createdAt as Timestamp).toMillis(),
    })) as MediaGenerationEvent[];
}

/**
 * Checks if a tenant has exceeded their daily cost limit
 */
export async function checkCostLimit(
    tenantId: string,
    limitUsd: number
): Promise<{ exceeded: boolean; currentCostUsd: number }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const usage = await getMediaUsage(tenantId, startOfDay, today);

    return {
        exceeded: usage.totalCostUsd >= limitUsd,
        currentCostUsd: usage.totalCostUsd,
    };
}

/**
 * Creates a tracked image generation wrapper
 * Use this instead of direct generation for automatic cost tracking
 */
export async function withImageTracking<T extends { imageUrl: string }>(
    tenantId: string,
    userId: string,
    provider: 'gemini-flash' | 'gemini-pro',
    prompt: string,
    generateFn: () => Promise<T>,
    options?: {
        contentId?: string;
        playbookRunId?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<T & { trackingEvent: MediaGenerationEvent }> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let result: T | undefined;

    try {
        result = await generateFn();
        success = true;
    } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
    } finally {
        const costUsd = calculateImageCost(provider);

        const trackingEvent = await trackMediaGeneration({
            tenantId,
            userId,
            type: 'image',
            provider,
            model: getModelForProvider(provider),
            prompt,
            costUsd,
            success,
            errorMessage,
            contentId: options?.contentId,
            playbookRunId: options?.playbookRunId,
            metadata: {
                ...options?.metadata,
                generationTimeMs: Date.now() - startTime,
            },
        });

        if (result) {
            return { ...result, trackingEvent };
        }
    }

    // This will only be reached if an error was thrown
    throw new Error(errorMessage || 'Generation failed');
}

/**
 * Creates a tracked video generation wrapper
 * Use this instead of direct generation for automatic cost tracking
 */
export async function withVideoTracking<T extends { videoUrl: string; duration?: number }>(
    tenantId: string,
    userId: string,
    provider: 'veo' | 'sora',
    prompt: string,
    durationSeconds: number,
    generateFn: () => Promise<T>,
    options?: {
        aspectRatio?: string;
        resolution?: string;
        contentId?: string;
        playbookRunId?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<T & { trackingEvent: MediaGenerationEvent }> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let result: T | undefined;

    try {
        result = await generateFn();
        success = true;
    } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw error;
    } finally {
        const costUsd = calculateVideoCost(provider, durationSeconds);

        const trackingEvent = await trackMediaGeneration({
            tenantId,
            userId,
            type: 'video',
            provider,
            model: getModelForProvider(provider),
            prompt,
            durationSeconds,
            aspectRatio: options?.aspectRatio,
            resolution: options?.resolution,
            costUsd,
            success,
            errorMessage,
            contentId: options?.contentId,
            playbookRunId: options?.playbookRunId,
            metadata: {
                ...options?.metadata,
                generationTimeMs: Date.now() - startTime,
            },
        });

        if (result) {
            return { ...result, trackingEvent };
        }
    }

    // This will only be reached if an error was thrown
    throw new Error(errorMessage || 'Generation failed');
}
