// src/app/api/ezal/scrape/route.ts
/**
 * Ezal Scrape API
 * POST - Trigger a scrape for a data source
 * GET - Get scrape status/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeFullScrape, getRecentRuns } from '@/server/services/ezal';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, sourceId } = body;

        if (!tenantId || !sourceId) {
            return NextResponse.json(
                { error: 'tenantId and sourceId are required' },
                { status: 400 }
            );
        }

        const result = await executeFullScrape(tenantId, sourceId);

        return NextResponse.json({
            success: result.success,
            data: {
                runId: result.runId,
                fetchDurationMs: result.fetchDurationMs,
                parseDurationMs: result.parseDurationMs,
                productsParsed: result.parseResult?.products.length || 0,
                newProducts: result.diffResult?.newProducts || 0,
                priceChanges: result.diffResult?.priceChanges || 0,
                insightsGenerated: result.diffResult?.insightsGenerated || 0,
            },
            error: result.error,
        });

    } catch (error) {
        logger.error('[Ezal API] Scrape failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to execute scrape' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const sourceId = searchParams.get('sourceId');

        if (!tenantId || !sourceId) {
            return NextResponse.json(
                { error: 'tenantId and sourceId are required' },
                { status: 400 }
            );
        }

        const runs = await getRecentRuns(tenantId, sourceId, 10);

        return NextResponse.json({
            success: true,
            data: runs,
        });

    } catch (error) {
        logger.error('[Ezal API] Get runs failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to get scrape history' },
            { status: 500 }
        );
    }
}
