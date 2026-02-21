/**
 * International Market Discovery Cron Endpoint
 * POST /api/cron/dayday-international-discovery
 * Triggered daily by GitHub Actions (.github/workflows/dayday-international.yaml)
 *
 * Runs RTRVR-powered Google Maps scraping for international cannabis dispensary discovery.
 * Processes 2 international markets per run (rate-limited due to scraping overhead).
 *
 * Cloud Scheduler:
 *   Schedule: 0 7 * * *  (daily 7:00 AM ET)
 *   gcloud scheduler jobs create http dayday-international-discovery \
 *     --schedule="0 7 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/dayday-international-discovery" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runInternationalDiscovery } from '@/server/jobs/dayday-international-discovery';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
    // 1. Verify CRON_SECRET
    const authError = await requireCronSecret(req, 'INTL_DISCOVERY');
    if (authError) {
        return authError;
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
