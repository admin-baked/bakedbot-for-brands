'use server';
/**
 * Media Costs Server Actions
 *
 * Server actions for retrieving and analyzing media generation costs.
 * Used by the CEO Dashboard Costs Tab.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import {
    getMediaUsage,
    getRecentMediaEvents,
    getTopCostContent,
} from '@/server/services/media-tracking';
import type {
    MediaGenerationEvent,
    MediaUsageStats,
    MediaProvider,
} from '@/types/media-generation';

/**
 * Dashboard data for media costs
 */
export interface MediaCostsDashboard {
    /** Summary statistics */
    summary: {
        totalCostUsd: number;
        totalGenerations: number;
        successRate: number;
        avgCostPerGeneration: number;
    };

    /** Costs by provider */
    byProvider: {
        provider: MediaProvider;
        count: number;
        costUsd: number;
        percentage: number;
    }[];

    /** Costs by type (image/video) */
    byType: {
        type: 'image' | 'video' | 'image_edit';
        count: number;
        costUsd: number;
        percentage: number;
    }[];

    /** Daily trend for chart */
    dailyTrend: {
        date: string;
        count: number;
        costUsd: number;
    }[];

    /** Recent events */
    recentEvents: MediaGenerationEvent[];

    /** Top cost content */
    topCostContent: MediaGenerationEvent[];

    /** Period covered */
    period: {
        start: string;
        end: string;
        label: string;
    };
}

/**
 * Get media costs dashboard data
 */
export async function getMediaCostsDashboard(
    orgId: string,
    period: 'week' | 'month' | 'quarter' = 'month'
): Promise<MediaCostsDashboard> {
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            periodLabel = 'Last 7 days';
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            periodLabel = 'Last 30 days';
            break;
        case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            periodLabel = 'Last 90 days';
            break;
    }

    try {
        const [usage, recentEvents, topCostContent] = await Promise.all([
            getMediaUsage(orgId, startDate, now),
            getRecentMediaEvents(orgId, 20),
            getTopCostContent(orgId, 10),
        ]);

        // Calculate summary
        const totalCostUsd = usage.totalCostUsd;
        const totalGenerations = usage.totalGenerations;
        const successRate = totalGenerations > 0
            ? (usage.successfulGenerations / totalGenerations) * 100
            : 100;
        const avgCostPerGeneration = totalGenerations > 0
            ? totalCostUsd / totalGenerations
            : 0;

        // Format by provider
        const providers: MediaProvider[] = ['gemini-flash', 'gemini-pro', 'veo', 'sora'];
        const byProvider = providers.map((provider) => ({
            provider,
            count: usage.byProvider[provider].count,
            costUsd: usage.byProvider[provider].costUsd,
            percentage: totalCostUsd > 0
                ? (usage.byProvider[provider].costUsd / totalCostUsd) * 100
                : 0,
        })).filter((p) => p.count > 0); // Only include providers with usage

        // Format by type
        const types: Array<'image' | 'video' | 'image_edit'> = ['image', 'video', 'image_edit'];
        const byType = types.map((type) => ({
            type,
            count: usage.byType[type].count,
            costUsd: usage.byType[type].costUsd,
            percentage: totalCostUsd > 0
                ? (usage.byType[type].costUsd / totalCostUsd) * 100
                : 0,
        })).filter((t) => t.count > 0); // Only include types with usage

        return {
            summary: {
                totalCostUsd,
                totalGenerations,
                successRate,
                avgCostPerGeneration,
            },
            byProvider,
            byType,
            dailyTrend: usage.dailyTrend,
            recentEvents,
            topCostContent,
            period: {
                start: startDate.toISOString(),
                end: now.toISOString(),
                label: periodLabel,
            },
        };
    } catch (error) {
        logger.error('[MediaCosts] Failed to get dashboard data', { error, orgId });
        throw error;
    }
}

/**
 * Get global media costs across all tenants (super admin only)
 */
export async function getGlobalMediaCosts(
    period: 'week' | 'month' | 'quarter' = 'month'
): Promise<{
    totalCostUsd: number;
    totalGenerations: number;
    byTenant: { tenantId: string; costUsd: number; count: number }[];
    byProvider: { provider: string; costUsd: number; count: number }[];
    dailyTrend: { date: string; costUsd: number; count: number }[];
}> {
    const db = getFirestore();
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
    }

    try {
        const snapshot = await db
            .collection('media_generation_events')
            .where('createdAt', '>=', Timestamp.fromDate(startDate))
            .where('createdAt', '<=', Timestamp.fromDate(now))
            .orderBy('createdAt', 'desc')
            .get();

        const events: MediaGenerationEvent[] = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
            createdAt: (doc.data().createdAt as Timestamp).toMillis(),
        })) as MediaGenerationEvent[];

        // Aggregate by tenant
        const tenantMap = new Map<string, { costUsd: number; count: number }>();
        const providerMap = new Map<string, { costUsd: number; count: number }>();
        const dailyMap = new Map<string, { costUsd: number; count: number }>();

        let totalCostUsd = 0;

        for (const event of events) {
            totalCostUsd += event.costUsd;

            // By tenant
            const tenant = tenantMap.get(event.tenantId) || { costUsd: 0, count: 0 };
            tenant.costUsd += event.costUsd;
            tenant.count += 1;
            tenantMap.set(event.tenantId, tenant);

            // By provider
            const provider = providerMap.get(event.provider) || { costUsd: 0, count: 0 };
            provider.costUsd += event.costUsd;
            provider.count += 1;
            providerMap.set(event.provider, provider);

            // Daily trend
            const date = new Date(event.createdAt).toISOString().split('T')[0];
            const daily = dailyMap.get(date) || { costUsd: 0, count: 0 };
            daily.costUsd += event.costUsd;
            daily.count += 1;
            dailyMap.set(date, daily);
        }

        return {
            totalCostUsd,
            totalGenerations: events.length,
            byTenant: Array.from(tenantMap.entries())
                .map(([tenantId, data]) => ({ tenantId, ...data }))
                .sort((a, b) => b.costUsd - a.costUsd),
            byProvider: Array.from(providerMap.entries())
                .map(([provider, data]) => ({ provider, ...data }))
                .sort((a, b) => b.costUsd - a.costUsd),
            dailyTrend: Array.from(dailyMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
    } catch (error) {
        logger.error('[MediaCosts] Failed to get global costs', { error });
        throw error;
    }
}

/**
 * Get estimated monthly cost projection based on current usage
 */
export async function getMonthlyProjection(orgId: string): Promise<{
    currentMonth: number;
    projectedMonth: number;
    dailyAverage: number;
    daysRemaining: number;
}> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const daysSoFar = now.getDate();
    const daysRemaining = daysInMonth - daysSoFar;

    const usage = await getMediaUsage(orgId, startOfMonth, now);

    const dailyAverage = daysSoFar > 0 ? usage.totalCostUsd / daysSoFar : 0;
    const projectedMonth = usage.totalCostUsd + dailyAverage * daysRemaining;

    return {
        currentMonth: usage.totalCostUsd,
        projectedMonth,
        dailyAverage,
        daysRemaining,
    };
}
