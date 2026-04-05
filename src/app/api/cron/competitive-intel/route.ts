/**
 * Competitive Intelligence Cron Endpoint
 *
 * POST /api/cron/competitive-intel
 *
 * Triggers the daily competitive intelligence report for a specific org.
 * Generates report covering up to 10 competitors with price changes, new products, and menu shakeups.
 * Delivers via email and dashboard inbox. Automatically enrolls user in playbook.
 * Bypasses the playbook system for reliability.
 *
 * Usage:
 * - Cloud Scheduler: daily at 7 AM (configurable per org)
 * - Manual: curl with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshCompetitiveIntelWorkspace } from '@/server/services/ezal';
import { PriceMatchInsightsGenerator } from '@/server/services/insights/generators/price-match-insights-generator';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) { return POST(request); }

export async function POST(request: NextRequest) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { orgId } = body;

        if (!orgId) {
            return NextResponse.json(
                { error: 'Missing required field: orgId' },
                { status: 400 }
            );
        }

        logger.info('[CompetitiveIntelCron] Starting competitive intel refresh', { orgId });

        const result = await refreshCompetitiveIntelWorkspace(orgId, { force: false, maxSources: 12 });

        logger.info('[CompetitiveIntelCron] Refresh completed successfully', {
            orgId,
            reportId: result.report?.id,
            sourcesRun: result.sourcesRun,
            snapshots: result.report?.totalSnapshots,
            deals: result.report?.totalDealsTracked,
        });

        // Generate price match opportunities card (Ezal's flagship feature)
        const priceMatchCount = await new PriceMatchInsightsGenerator(orgId).generate();

        logger.info('[CompetitiveIntelCron] Price match opportunities generated', {
            orgId,
            opportunities: priceMatchCount,
        });

        return NextResponse.json({
            success: true,
            reportId: result.report?.id,
            orgId,
            sourcesRun: result.sourcesRun,
            sourcesCreated: result.sourcesCreated,
            sourcesUpdated: result.sourcesUpdated,
            totalDeals: result.report?.totalDealsTracked || 0,
            totalSnapshots: result.report?.totalSnapshots || 0,
            priceMatchOpportunities: priceMatchCount,
            generatedAt: result.report?.generatedAt || null,
        });

    } catch (error: any) {
        logger.error('[CompetitiveIntelCron] Failed to generate report', {
            error: error.message,
        });

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
