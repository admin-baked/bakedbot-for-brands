export const dynamic = 'force-dynamic';

/**
 * Connection Health Cron
 *
 * Runs daily at 8AM CT. Checks all key integrations and posts a Slack
 * alert to #ceo whenever any connection is broken or not yet configured.
 * If everything is healthy, posts a brief "all green" summary.
 *
 * Deploy:
 *   gcloud scheduler jobs create http connection-health-cron \
 *     --schedule="0 13 * * *" \
 *     --uri="https://bakedbot.ai/api/cron/connection-health" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer $CRON_SECRET" \
 *     --time-zone="America/Chicago"
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import {
    checkAllConnections,
    filterBrokenConnections,
    buildConnectionAlertSlackText,
} from '@/server/services/connection-health';

async function handler(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const checks = await checkAllConnections();
        const broken = filterBrokenConnections(checks);

        const slackText = buildConnectionAlertSlackText(broken);

        await postLinusIncidentSlack({
            source: 'connection-health-cron',
            channelName: 'ceo',
            fallbackText: broken.length > 0
                ? `⚠️ ${broken.length} connection(s) need attention`
                : '✅ All connections healthy',
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: slackText },
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `_Daily connection check — ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' })} 8AM CT_`,
                        },
                    ],
                },
            ],
        });

        logger.info('[ConnectionHealth] Daily check complete', {
            total: checks.length,
            broken: broken.length,
            brokenIds: broken.map(c => c.id),
        });

        return NextResponse.json({
            ok: true,
            total: checks.length,
            broken: broken.length,
            checks: checks.map(c => ({ id: c.id, status: c.status })),
        });
    } catch (err) {
        logger.error('[ConnectionHealth] Cron failed', { error: String(err) });
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
