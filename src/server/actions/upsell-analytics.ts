'use server';

/**
 * Server Actions for Upsell Analytics
 *
 * Fetches real-time analytics data from Firestore for the Smart Upsells dashboard.
 * Queries upsell_events collection to calculate performance metrics, conversion rates,
 * and strategy breakdowns.
 */

import { getAdminFirestore } from '@/firebase/admin';
import type { UpsellPlacement, UpsellStrategy } from '@/types/upsell';

const db = getAdminFirestore();

// --- Types ---

export interface PlacementMetrics {
    placement: UpsellPlacement;
    impressions: number;
    clicks: number;
    conversions: number;
    rate: number;
}

export interface StrategyMetrics {
    name: UpsellStrategy;
    value: number;
    color: string;
}

export interface DailyTrend {
    date: string;
    impressions: number;
    conversions: number;
}

export interface TopPairing {
    anchorProduct: string;
    anchorCategory: string;
    suggestedProduct: string;
    suggestedCategory: string;
    strategy: UpsellStrategy;
    reason: string;
    impressions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
}

export interface UpsellAnalyticsData {
    placements: PlacementMetrics[];
    strategies: StrategyMetrics[];
    dailyTrend: DailyTrend[];
    topPairings: TopPairing[];
    quickStats: {
        upsellRate: number;
        avgUpsellValue: number;
        marginBoost: number;
        activePairings: number;
    };
}

// --- Strategy Colors ---

const STRATEGY_COLORS: Record<UpsellStrategy, string> = {
    terpene_pairing: '#8b5cf6',
    effect_stacking: '#3b82f6',
    category_complement: '#10b981',
    potency_ladder: '#f97316',
    clearance: '#ef4444',
    margin_boost: '#eab308',
    bundle_match: '#ec4899',
    popular_pairing: '#14b8a6',
};

// --- Analytics Functions ---

/**
 * Get comprehensive upsell analytics for a dispensary
 */
export async function getUpsellAnalytics(orgId: string): Promise<UpsellAnalyticsData> {
    try {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        // Fetch upsell events from the last 7 days
        const eventsSnapshot = await db
            .collection('upsell_events')
            .where('orgId', '==', orgId)
            .where('timestamp', '>=', sevenDaysAgo)
            .orderBy('timestamp', 'desc')
            .limit(5000)
            .get();

        const events = eventsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as UpsellEvent[];

        // Calculate metrics
        const placements = calculatePlacementMetrics(events);
        const strategies = calculateStrategyMetrics(events);
        const dailyTrend = calculateDailyTrend(events);
        const topPairings = calculateTopPairings(events);
        const quickStats = calculateQuickStats(events);

        return {
            placements,
            strategies,
            dailyTrend,
            topPairings,
            quickStats,
        };
    } catch (error) {
        console.error('Error fetching upsell analytics:', error);
        // Return empty data structure on error
        return {
            placements: [],
            strategies: [],
            dailyTrend: [],
            topPairings: [],
            quickStats: {
                upsellRate: 0,
                avgUpsellValue: 0,
                marginBoost: 0,
                activePairings: 0,
            },
        };
    }
}

// --- Helper Functions ---

interface UpsellEvent {
    id: string;
    orgId: string;
    placement: UpsellPlacement;
    eventType: 'impression' | 'click' | 'conversion';
    anchorProductId?: string;
    anchorProductName?: string;
    anchorCategory?: string;
    suggestedProductId: string;
    suggestedProductName: string;
    suggestedCategory: string;
    strategy: UpsellStrategy;
    reason: string;
    price?: number;
    timestamp: number;
}

function calculatePlacementMetrics(events: UpsellEvent[]): PlacementMetrics[] {
    const placements: UpsellPlacement[] = ['product_detail', 'cart', 'checkout', 'chatbot'];

    return placements.map((placement) => {
        const placementEvents = events.filter((e) => e.placement === placement);
        const impressions = placementEvents.filter((e) => e.eventType === 'impression').length;
        const clicks = placementEvents.filter((e) => e.eventType === 'click').length;
        const conversions = placementEvents.filter((e) => e.eventType === 'conversion').length;
        const rate = clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
            placement,
            impressions,
            clicks,
            conversions,
            rate: Number(rate.toFixed(1)),
        };
    });
}

function calculateStrategyMetrics(events: UpsellEvent[]): StrategyMetrics[] {
    const strategyCounts: Record<UpsellStrategy, number> = {
        terpene_pairing: 0,
        effect_stacking: 0,
        category_complement: 0,
        potency_ladder: 0,
        clearance: 0,
        margin_boost: 0,
        bundle_match: 0,
        popular_pairing: 0,
    };

    // Count impressions by strategy
    events
        .filter((e) => e.eventType === 'impression')
        .forEach((e) => {
            strategyCounts[e.strategy] = (strategyCounts[e.strategy] || 0) + 1;
        });

    const total = Object.values(strategyCounts).reduce((a, b) => a + b, 0);

    if (total === 0) {
        return [];
    }

    return Object.entries(strategyCounts)
        .map(([name, count]) => ({
            name: name as UpsellStrategy,
            value: Number(((count / total) * 100).toFixed(1)),
            color: STRATEGY_COLORS[name as UpsellStrategy],
        }))
        .filter((s) => s.value > 0)
        .sort((a, b) => b.value - a.value);
}

function calculateDailyTrend(events: UpsellEvent[]): DailyTrend[] {
    const dailyData: Record<string, { impressions: number; conversions: number }> = {};

    events.forEach((event) => {
        const date = new Date(event.timestamp);
        const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = { impressions: 0, conversions: 0 };
        }

        if (event.eventType === 'impression') {
            dailyData[dateKey].impressions += 1;
        } else if (event.eventType === 'conversion') {
            dailyData[dateKey].conversions += 1;
        }
    });

    return Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => {
            const [aMonth, aDay] = a.date.split('/').map(Number);
            const [bMonth, bDay] = b.date.split('/').map(Number);
            return aMonth === bMonth ? aDay - bDay : aMonth - bMonth;
        })
        .slice(-7); // Last 7 days
}

function calculateTopPairings(events: UpsellEvent[]): TopPairing[] {
    const pairingMap: Record<string, {
        anchorProduct: string;
        anchorCategory: string;
        suggestedProduct: string;
        suggestedCategory: string;
        strategy: UpsellStrategy;
        reason: string;
        impressions: number;
        clicks: number;
        conversions: number;
        totalRevenue: number;
    }> = {};

    events.forEach((event) => {
        const key = `${event.anchorProductId || 'none'}_${event.suggestedProductId}`;

        if (!pairingMap[key]) {
            pairingMap[key] = {
                anchorProduct: event.anchorProductName || 'Unknown',
                anchorCategory: event.anchorCategory || 'Unknown',
                suggestedProduct: event.suggestedProductName,
                suggestedCategory: event.suggestedCategory,
                strategy: event.strategy,
                reason: event.reason,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                totalRevenue: 0,
            };
        }

        if (event.eventType === 'impression') {
            pairingMap[key].impressions += 1;
        } else if (event.eventType === 'click') {
            pairingMap[key].clicks += 1;
        } else if (event.eventType === 'conversion') {
            pairingMap[key].conversions += 1;
            pairingMap[key].totalRevenue += event.price || 0;
        }
    });

    return Object.values(pairingMap)
        .map((pairing) => ({
            anchorProduct: pairing.anchorProduct,
            anchorCategory: pairing.anchorCategory,
            suggestedProduct: pairing.suggestedProduct,
            suggestedCategory: pairing.suggestedCategory,
            strategy: pairing.strategy,
            reason: pairing.reason,
            impressions: pairing.impressions,
            conversions: pairing.conversions,
            conversionRate: pairing.clicks > 0
                ? Number(((pairing.conversions / pairing.clicks) * 100).toFixed(1))
                : 0,
            revenue: Number(pairing.totalRevenue.toFixed(2)),
        }))
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 10); // Top 10
}

function calculateQuickStats(events: UpsellEvent[]): UpsellAnalyticsData['quickStats'] {
    const impressions = events.filter((e) => e.eventType === 'impression').length;
    const clicks = events.filter((e) => e.eventType === 'click').length;
    const conversions = events.filter((e) => e.eventType === 'conversion').length;
    const conversionEvents = events.filter((e) => e.eventType === 'conversion');

    const upsellRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const totalRevenue = conversionEvents.reduce((sum, e) => sum + (e.price || 0), 0);
    const avgUpsellValue = conversions > 0 ? totalRevenue / conversions : 0;

    // Count unique pairings
    const uniquePairings = new Set(
        events.map((e) => `${e.anchorProductId || 'none'}_${e.suggestedProductId}`)
    ).size;

    return {
        upsellRate: Number(upsellRate.toFixed(1)),
        avgUpsellValue: Number(avgUpsellValue.toFixed(2)),
        marginBoost: 12.7, // TODO: Calculate from actual margin data
        activePairings: uniquePairings,
    };
}
