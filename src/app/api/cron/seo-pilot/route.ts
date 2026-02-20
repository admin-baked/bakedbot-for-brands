/**
 * SEO Pilot Cron Endpoint
 * GET /api/cron/seo-pilot
 *
 * Generates SEO pages for cannabis dispensaries in a given city/state market.
 * Runs in the early morning before peak traffic to avoid contention with brand cleanup.
 *
 * Cloud Scheduler:
 *   Schedule: 0 4 * * *  (daily 4:00 AM ET)
 *   gcloud scheduler jobs create http seo-pilot \
 *     --schedule="0 4 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/seo-pilot" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runChicagoPilotJob } from '@/server/jobs/seo-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for pilot

export async function GET(request: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city') || 'Chicago';
        const state = searchParams.get('state') || 'IL';
        const zipStr = searchParams.get('zips');
        const zipCodes = zipStr ? zipStr.split(',').map(z => z.trim()) : undefined;

        logger.info(`[API] Triggering Pilot for ${city}, ${state}...`);

        // Run the job (awaiting it here for the pilot so we see results in response)
        const results = await runChicagoPilotJob(city, state, zipCodes);

        return NextResponse.json({
            success: true,
            message: 'Chicago Pilot completed',
            results
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[API] Pilot failed', { error });
        return NextResponse.json({
            success: false,
            error: message
        }, { status: 500 });
    }
}
