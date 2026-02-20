/**
 * POST /api/cron/template-health-check
 *
 * Daily template health check + alert system
 * Runs via Cloud Scheduler (daily at 9 AM EST)
 *
 * Cloud Scheduler:
 *   Schedule: 0 9 * * *  (daily 9:00 AM ET)
 *   gcloud scheduler jobs create http template-health-check \
 *     --schedule="0 9 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/template-health-check" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runTemplateHealthCheck } from '@/server/services/template-alert-service';

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      logger.warn('[TemplateHealthCheck] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[TemplateHealthCheck] Starting daily health check');

    // Run health check + send alerts
    await runTemplateHealthCheck();

    return NextResponse.json({
      success: true,
      message: 'Template health check completed',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[TemplateHealthCheck] Error', {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        error: 'Health check failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
