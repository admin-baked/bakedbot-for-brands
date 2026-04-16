export const dynamic = 'force-dynamic';
/**
 * NY Outreach Digest Cron
 *
 * Sends twice-daily status updates to martez@bakedbot.ai.
 * Schedule: 9 AM and 5 PM EST
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http ny-outreach-digest-morning \
 *     --schedule="0 9 * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/ny-outreach-digest" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer ${CRON_SECRET}" \
 *     --project=studio-567050101-bc6e8
 *
 *   gcloud scheduler jobs create http ny-outreach-digest-evening \
 *     --schedule="0 17 * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/ny-outreach-digest" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer ${CRON_SECRET}" \
 *     --project=studio-567050101-bc6e8
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOutreachDigest } from '@/server/services/ny-outreach/outreach-service';
import { logger } from '@/lib/logger';

const DIGEST_RECIPIENT = 'martez@bakedbot.ai';

export async function POST(request: NextRequest) {
    try {
        // Auth: require CRON_SECRET
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            logger.error('[NYOutreachDigest] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        logger.info('[NYOutreachDigest] Sending digest', { to: DIGEST_RECIPIENT });

        await sendOutreachDigest(DIGEST_RECIPIENT);

        return NextResponse.json({
            success: true,
            sentTo: DIGEST_RECIPIENT,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[NYOutreachDigest] Error sending digest', { error: err.message });
        return NextResponse.json(
            { error: err.message || 'Failed to send digest' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) { return POST(request); }
