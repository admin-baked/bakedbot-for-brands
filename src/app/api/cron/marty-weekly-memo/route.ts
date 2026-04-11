/**
 * Marty Weekly CEO Memo Cron Endpoint
 *
 * Cloud Scheduler job:
 *   Name:     marty-weekly-memo
 *   Schedule: 0 9 * * 1
 *   Timezone: America/Chicago
 *   URL:      /api/cron/marty-weekly-memo
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import { buildMartyWeeklyMemoData, postMartyWeeklyMemoToInbox } from '@/server/services/marty-reporting';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function runWeeklyMemo() {
  const memo = buildMartyWeeklyMemoData();
  const { threadId } = await postMartyWeeklyMemoToInbox(memo);

  logger.info('[MartyWeeklyMemoCron] Memo generated', {
    threadId,
    currentMrr: memo.currentMrr,
    paceVsTargetPct: memo.paceVsTargetPct,
  });

  return NextResponse.json({
    success: true,
    threadId,
    date: memo.date,
    currentMrr: memo.currentMrr,
    paceVsTargetPct: memo.paceVsTargetPct,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireCronSecret(request, 'marty-weekly-memo');
  if (authError) return authError;

  try {
    return await runWeeklyMemo();
  } catch (error) {
    logger.error('[MartyWeeklyMemoCron] Failed to generate memo', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request);
}
