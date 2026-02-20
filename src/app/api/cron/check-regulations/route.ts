/**
 * Regulation Monitor Cron Endpoint
 *
 * POST /api/cron/check-regulations
 *
 * Scrapes official state regulatory URLs, compares content hashes,
 * and — on change — saves a Claude Haiku proposal to Drive + posts Slack alert.
 *
 * ⚠️  NEVER auto-modifies rule packs. All proposals require human review.
 *
 * Schedule: Weekly, Monday 9AM ET
 * Cloud Scheduler command:
 *   gcloud scheduler jobs create http check-regulations \
 *     --schedule="0 14 * * 1" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/check-regulations" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runRegulationMonitor } from '@/server/services/compliance/regulation-monitor';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes — scraping 5 URLs + AI generation

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('[CheckRegulationsCron] Starting regulation monitor run');

    const result = await runRegulationMonitor();

    logger.info('[CheckRegulationsCron] Run complete', {
      sourcesChecked: result.sourcesChecked,
      changesDetected: result.changesDetected,
    });

    return NextResponse.json({
      success: true,
      checkedAt: result.checkedAt,
      sourcesChecked: result.sourcesChecked,
      changesDetected: result.changesDetected,
      results: result.results.map(r => ({
        sourceId: r.sourceId,
        jurisdiction: r.jurisdiction,
        changed: r.changed,
        driveFileId: r.driveFileId,
        error: r.error,
      })),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[CheckRegulationsCron] Run failed', { error: message });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
