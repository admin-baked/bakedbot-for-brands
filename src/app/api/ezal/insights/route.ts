// src/app/api/ezal/insights/route.ts
/**
 * Ezal Insights API
 * GET - Get competitive insights
 * POST - Dismiss or act on insights
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getRecentInsights,
    findPriceGaps,
    dismissInsight,
    markInsightConsumed,
} from '@/server/services/ezal';
import { logger } from '@/lib/logger';
import { InsightType, InsightSeverity } from '@/types/ezal-discovery';
import { withCache, CachePrefix, invalidateCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const type = searchParams.get('type') as InsightType | null;
        const brandName = searchParams.get('brandName');
        const severity = searchParams.get('severity') as InsightSeverity | null;
        const mode = searchParams.get('mode'); // 'insights' or 'price_gaps'

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        // Price gap analysis mode
        if (mode === 'price_gaps') {
            // Cache price gaps (15 min TTL) - expensive analysis, changes infrequently
            const cacheKey = `price_gaps:${tenantId}:${brandName || 'all'}`;
            const gaps = await withCache(
                CachePrefix.ANALYTICS,
                cacheKey,
                () => findPriceGaps(tenantId, {
                    brandName: brandName || undefined,
                    minGapPercent: 5,
                }),
                900 // 15 min
            );

            return NextResponse.json({
                success: true,
                mode: 'price_gaps',
                data: gaps,
            });
        }

        // Check for mock data cookie
        const isMock = request.cookies.get('x-use-mock-data')?.value === 'true';

        // Default: recent insights
        // Cache insights (10 min TTL) - expensive to compute, can tolerate staleness
        const cacheKey = `insights:${tenantId}:${type || 'all'}:${brandName || 'all'}:${severity || 'all'}:${isMock}`;
        const insights = await withCache(
            CachePrefix.ANALYTICS,
            cacheKey,
            () => getRecentInsights(tenantId, {
                type: type || undefined,
                brandName: brandName || undefined,
                severity: severity || undefined,
                limit: 50,
                mock: isMock,
            }),
            600 // 10 min
        );

        return NextResponse.json({
            success: true,
            mode: 'insights',
            data: insights,
            summary: {
                total: insights.length,
                bySeverity: {
                    critical: insights.filter(i => i.severity === 'critical').length,
                    high: insights.filter(i => i.severity === 'high').length,
                    medium: insights.filter(i => i.severity === 'medium').length,
                    low: insights.filter(i => i.severity === 'low').length,
                },
                byType: insights.reduce((acc, i) => {
                    acc[i.type] = (acc[i.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
            },
        });

    } catch (error) {
        logger.error('[Ezal API] Get insights failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to get insights' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, insightId, action, agentId } = body;

        if (!tenantId || !insightId || !action) {
            return NextResponse.json(
                { error: 'tenantId, insightId, and action are required' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'dismiss':
                await dismissInsight(tenantId, insightId);
                // Invalidate insights cache for this tenant
                await invalidateCache(CachePrefix.ANALYTICS, `insights:${tenantId}:*`);
                return NextResponse.json({
                    success: true,
                    message: 'Insight dismissed',
                });

            case 'consume':
                if (!agentId) {
                    return NextResponse.json(
                        { error: 'agentId is required for consume action' },
                        { status: 400 }
                    );
                }
                await markInsightConsumed(tenantId, insightId, agentId);
                // Invalidate insights cache for this tenant
                await invalidateCache(CachePrefix.ANALYTICS, `insights:${tenantId}:*`);
                return NextResponse.json({
                    success: true,
                    message: `Insight marked as consumed by ${agentId}`,
                });

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

    } catch (error) {
        logger.error('[Ezal API] Insight action failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to process insight action' },
            { status: 500 }
        );
    }
}
