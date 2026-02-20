/**
 * Weekly Playbook Cron
 * POST /api/cron/playbooks/weekly
 *
 * Fires all scheduled playbooks with frequency: 'weekly' (Monday 9:00 AM local).
 * Also fires monthly playbooks on the 1st of each month.
 *
 * Cloud Scheduler: 0 9 * * 1 (9 AM UTC Monday — adjust per timezone)
 * Authentication: Bearer CRON_SECRET
 *
 * Cloud Scheduler:
 *   Schedule: 0 9 * * 1  (weekly Monday 9:00 AM UTC / ~4:00 AM ET)
 *   gcloud scheduler jobs create http playbooks-weekly \
 *     --schedule="0 9 * * 1" --time-zone="UTC" \
 *     --uri="https://<domain>/api/cron/playbooks/weekly" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScheduledPlaybooks } from '@/lib/playbooks/trigger-engine';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('[Cron/Playbooks/Weekly] Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[Cron/Playbooks/Weekly] Starting weekly playbook run');

        // Run weekly playbooks
        const weeklyResult = await runScheduledPlaybooks('weekly');

        // Also run monthly on the 1st of the month
        let monthlyResult = null;
        const today = new Date();
        if (today.getDate() === 1) {
            logger.info('[Cron/Playbooks/Weekly] 1st of month detected — firing monthly playbooks');
            monthlyResult = await runScheduledPlaybooks('monthly');
        }

        return NextResponse.json({
            success: true,
            weekly: weeklyResult,
            monthly: monthlyResult,
        });
    } catch (err) {
        logger.error('[Cron/Playbooks/Weekly] Error', err as Record<string, unknown>);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
