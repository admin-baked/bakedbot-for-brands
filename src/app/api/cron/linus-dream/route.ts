/**
 * Linus Dream Cron — Self-Improvement Loop
 *
 * Runs a Dream session: introspect → hypothesize → test → report.
 * Scheduled after consolidate-learnings so pending deltas are available.
 *
 * Schedule: 0 5 * * * (5 AM UTC / 12 AM EST — after consolidate-learnings at 4 AM)
 *
 * Deploy:
 *   gcloud scheduler jobs create http linus-dream-cron \
 *     --schedule="0 5 * * *" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/linus-dream" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer CRON_SECRET" \
 *     --location=us-central1
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function handler(req: NextRequest): Promise<NextResponse> {
    // Auth
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[LinusDream] CRON_SECRET not configured');
        return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    logger.info('[LinusDream] Starting scheduled dream session');

    try {
        const { runDreamSession } = await import('@/server/services/letta/dream-loop');
        const session = await runDreamSession('Linus');

        // Post to Slack
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'auto-escalator',
            channelName: 'linus-cto',
            fallbackText: `Dream Session: ${session.hypotheses.length} hypotheses, ${session.hypotheses.filter(h => h.testResult === 'confirmed').length} confirmed`,
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: session.report },
                },
            ],
        });

        const duration = Date.now() - startTime;
        const confirmed = session.hypotheses.filter(h => h.testResult === 'confirmed').length;

        logger.info(`[LinusDream] Complete: ${session.hypotheses.length} hypotheses, ${confirmed} confirmed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            hypotheses: session.hypotheses.length,
            confirmed,
            duration_ms: duration,
        });
    } catch (error) {
        logger.error('[LinusDream] Cron failed:', error as Record<string, unknown>);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
