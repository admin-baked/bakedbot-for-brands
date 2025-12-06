'use server';

// src/server/services/creator-metrics.ts
/**
 * Creator Metrics Service
 * Aggregates analytics for influencers and content creators
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export interface CreatorMetrics {
    creatorId: string;
    period: 'day' | 'week' | 'month' | 'all';

    // Engagement
    totalClicks: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;

    // Conversions
    checkouts: number;
    conversions: number;
    conversionRate: number;

    // Revenue
    totalCommissions: number;
    pendingCommissions: number;
    paidCommissions: number;
    avgOrderValue: number;

    // Top performers
    topProducts: ProductPerformance[];
    topReferrers: ReferrerPerformance[];

    // Trends
    dailyMetrics: DailyMetric[];
}

export interface ProductPerformance {
    productId: string;
    productName: string;
    brandName: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commissionEarned: number;
}

export interface ReferrerPerformance {
    source: string;
    medium: string;
    clicks: number;
    conversions: number;
}

export interface DailyMetric {
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
}

/**
 * Get comprehensive metrics for a creator
 */
export async function getCreatorMetrics(
    creatorId: string,
    period: 'day' | 'week' | 'month' | 'all' = 'month'
): Promise<CreatorMetrics> {
    const { firestore } = await createServerClient();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
        case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'all':
            startDate = new Date(0); // Beginning of time
            break;
    }

    try {
        // Query affiliate events for this creator
        const eventsRef = firestore
            .collection('affiliate_events')
            .where('affiliateId', '==', creatorId)
            .where('timestamp', '>=', startDate)
            .orderBy('timestamp', 'desc')
            .limit(10000);

        const eventsSnap = await eventsRef.get();
        const events = eventsSnap.docs.map(doc => doc.data());

        // Aggregate metrics
        let totalClicks = 0;
        let checkouts = 0;
        let conversions = 0;
        let totalCommissions = 0;
        let pendingCommissions = 0;
        let paidCommissions = 0;
        const uniqueVisitorSet = new Set<string>();
        const productMap = new Map<string, ProductPerformance>();
        const referrerMap = new Map<string, ReferrerPerformance>();
        const dailyMap = new Map<string, DailyMetric>();
        let totalOrderValue = 0;

        events.forEach((event: any) => {
            const eventDate = event.timestamp?.toDate?.() || new Date();
            const dateKey = eventDate.toISOString().split('T')[0];

            // Track unique visitors
            if (event.sessionId) {
                uniqueVisitorSet.add(event.sessionId);
            }

            // Count event types
            if (event.type === 'click') {
                totalClicks++;
            } else if (event.type === 'checkout') {
                checkouts++;
            } else if (event.type === 'conversion') {
                conversions++;
                totalOrderValue += event.orderValue || 0;

                if (event.commissionStatus === 'pending') {
                    pendingCommissions += event.commission || 0;
                } else if (event.commissionStatus === 'paid') {
                    paidCommissions += event.commission || 0;
                }
                totalCommissions += event.commission || 0;
            }

            // Product performance
            if (event.productId) {
                const existing = productMap.get(event.productId) || {
                    productId: event.productId,
                    productName: event.productName || 'Unknown',
                    brandName: event.brandName || 'Unknown',
                    clicks: 0,
                    conversions: 0,
                    revenue: 0,
                    commissionEarned: 0,
                };

                if (event.type === 'click') existing.clicks++;
                if (event.type === 'conversion') {
                    existing.conversions++;
                    existing.revenue += event.orderValue || 0;
                    existing.commissionEarned += event.commission || 0;
                }

                productMap.set(event.productId, existing);
            }

            // Referrer performance
            if (event.source) {
                const refKey = `${event.source}-${event.medium || 'direct'}`;
                const existing = referrerMap.get(refKey) || {
                    source: event.source,
                    medium: event.medium || 'direct',
                    clicks: 0,
                    conversions: 0,
                };

                if (event.type === 'click') existing.clicks++;
                if (event.type === 'conversion') existing.conversions++;

                referrerMap.set(refKey, existing);
            }

            // Daily metrics
            const dailyExisting = dailyMap.get(dateKey) || {
                date: dateKey,
                clicks: 0,
                conversions: 0,
                earnings: 0,
            };

            if (event.type === 'click') dailyExisting.clicks++;
            if (event.type === 'conversion') {
                dailyExisting.conversions++;
                dailyExisting.earnings += event.commission || 0;
            }

            dailyMap.set(dateKey, dailyExisting);
        });

        // Sort and limit top performers
        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.commissionEarned - a.commissionEarned)
            .slice(0, 10);

        const topReferrers = Array.from(referrerMap.values())
            .sort((a, b) => b.conversions - a.conversions)
            .slice(0, 5);

        const dailyMetrics = Array.from(dailyMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30); // Last 30 days

        return {
            creatorId,
            period,
            totalClicks,
            uniqueVisitors: uniqueVisitorSet.size,
            avgTimeOnPage: 0, // Would need additional tracking
            checkouts,
            conversions,
            conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
            totalCommissions,
            pendingCommissions,
            paidCommissions,
            avgOrderValue: conversions > 0 ? totalOrderValue / conversions : 0,
            topProducts,
            topReferrers,
            dailyMetrics,
        };

    } catch (error) {
        logger.error('[CreatorMetrics] Failed to fetch metrics:', error instanceof Error ? error : new Error(String(error)));

        // Return empty metrics on error
        return {
            creatorId,
            period,
            totalClicks: 0,
            uniqueVisitors: 0,
            avgTimeOnPage: 0,
            checkouts: 0,
            conversions: 0,
            conversionRate: 0,
            totalCommissions: 0,
            pendingCommissions: 0,
            paidCommissions: 0,
            avgOrderValue: 0,
            topProducts: [],
            topReferrers: [],
            dailyMetrics: [],
        };
    }
}

/**
 * Get leaderboard of top creators
 */
export async function getCreatorLeaderboard(
    limit: number = 10,
    period: 'week' | 'month' | 'all' = 'month'
): Promise<{ creatorId: string; name: string; totalEarnings: number; conversions: number }[]> {
    const { firestore } = await createServerClient();

    try {
        // Query creator profiles with earnings
        const creatorsRef = firestore
            .collection('creators')
            .orderBy(`stats.${period}Earnings`, 'desc')
            .limit(limit);

        const snap = await creatorsRef.get();

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                creatorId: doc.id,
                name: data.displayName || data.email || 'Anonymous',
                totalEarnings: data.stats?.[`${period}Earnings`] || 0,
                conversions: data.stats?.[`${period}Conversions`] || 0,
            };
        });

    } catch (error) {
        logger.error('[CreatorMetrics] Leaderboard query failed:', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
