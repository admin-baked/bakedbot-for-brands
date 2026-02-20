/**
 * DayDay Weekly Review Cron Endpoint
 * GET /api/cron/dayday-review
 *
 * Runs the DayDay weekly review job that aggregates and reports on discovery results.
 * Note: Despite the "daily" path name, this invokes runDayDayWeeklyReview — weekly cadence.
 *
 * Cloud Scheduler:
 *   Schedule: 0 13 * * 1  (weekly Monday 8:00 AM ET / 1:00 PM UTC)
 *   gcloud scheduler jobs create http dayday-review \
 *     --schedule="0 13 * * 1" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/dayday-review" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDayDayWeeklyReview } from '@/server/jobs/dayday-weekly-review';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

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
        const result = await runDayDayWeeklyReview();

        return NextResponse.json({ success: true, result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[Cron] DayDay Review Failed', { error });
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
