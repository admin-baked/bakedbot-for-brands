/**
 * Daily Playbook Cron
 * POST /api/cron/playbooks/daily
 *
 * Fires all scheduled playbooks with frequency: 'daily' (7:00 AM local).
 * Also fires quarterly playbooks on Jan 1, Apr 1, Jul 1, Oct 1.
 *
 * Cloud Scheduler: 0 7 * * * (7 AM UTC — adjust per timezone requirements)
 * Authentication: Bearer CRON_SECRET
 *
 * Cloud Scheduler:
 *   Schedule: 0 7 * * *  (daily 7:00 AM UTC / ~2:00 AM ET)
 *   gcloud scheduler jobs create http playbooks-daily \
 *     --schedule="0 7 * * *" --time-zone="UTC" \
 *     --uri="https://<domain>/api/cron/playbooks/daily" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduledPlaybooks, isQuarterlyTriggerDay } from '@/lib/playbooks/trigger-engine';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('[Cron/Playbooks/Daily] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[Cron/Playbooks/Daily] Starting daily playbook run');

        // Run daily playbooks
        const dailyResult = await runScheduledPlaybooks('daily');

        // Also run quarterly on trigger days
        let quarterlyResult = null;
        if (isQuarterlyTriggerDay()) {
            logger.info('[Cron/Playbooks/Daily] Quarterly trigger day detected — firing quarterly playbooks');
            quarterlyResult = await runScheduledPlaybooks('quarterly');
        }

        return NextResponse.json({
            success: true,
            daily: dailyResult,
            quarterly: quarterlyResult,
        });
    } catch (err) {
        logger.error('[Cron/Playbooks/Daily] Error', err as Record<string, unknown>);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
