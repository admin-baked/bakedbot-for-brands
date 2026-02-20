/**
 * DayDay Daily Discovery Cron Endpoint
 * GET /api/cron/dayday-discovery
 *
 * Processes 5 domestic cannabis markets per run for DayDay dispensary discovery.
 *
 * Cloud Scheduler:
 *   Schedule: 0 6 * * *  (daily 6:00 AM ET)
 *   gcloud scheduler jobs create http dayday-discovery \
 *     --schedule="0 6 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/dayday-discovery" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDayDayDailyDiscovery } from '@/server/jobs/dayday-daily-discovery';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(req: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        logger.info('[Cron] Starting Day Day Daily Discovery...');
        const result = await runDayDayDailyDiscovery(5); // Process 5 markets per run
        return NextResponse.json({ success: true, result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[Cron] Day Day Discovery failed', { error });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
/**
 * POST handler for Cloud Scheduler compatibility
 * Cloud Scheduler sends POST requests by default
 */
export async function POST(request: NextRequest) {
    return GET(request);
}
