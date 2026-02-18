/**
 * International Market Discovery Cron Endpoint
 * POST /api/cron/dayday-international-discovery
 * Triggered daily by GitHub Actions (.github/workflows/dayday-international.yaml)
 *
 * Runs RTRVR-powered Google Maps scraping for international cannabis dispensary discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { runInternationalDiscovery } from '@/server/jobs/dayday-international-discovery';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
    // 1. Verify CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
        logger.warn('[IntlDiscoveryCron] Unauthorized request');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        logger.info('[IntlDiscoveryCron] Starting');

        // 2. Run discovery job
        const result = await runInternationalDiscovery(2); // Process 2 markets per run

        // 3. Return results
        return NextResponse.json({
            success: result.errors.length === 0,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('[IntlDiscoveryCron] Failed', { error: errorMsg });

        return NextResponse.json(
            {
                success: false,
                error: errorMsg,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    // Allow manual testing via GET with ?token=CRON_SECRET
    const token = req.nextUrl.searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET;

    if (!token || token !== expectedToken) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Forward to POST handler
    const postReq = new NextRequest(req, {
        method: 'POST',
    });
    return POST(postReq);
}
