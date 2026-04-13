export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/knowledge-alerts
 * GET  /api/cron/knowledge-alerts  (Cloud Scheduler compat)
 *
 * Scans recent high-impact claims and creates knowledge alerts + mirrors to insights.
 * Run daily. Filters to claims not yet alerted on.
 *
 * Body: { orgId: string, lookbackDays?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { generateKnowledgeAlerts } from '@/server/services/knowledge-engine';

export const maxDuration = 60;

export async function GET(req: NextRequest) { return POST(req); }

export async function POST(req: NextRequest) {
  const authError = await requireCronSecret(req, 'knowledge-alerts');
  if (authError) return authError;

  try {
    const body = await req.json() as { orgId: string; lookbackDays?: number };
    const { orgId, lookbackDays = 7 } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const { alertIds, mirroredInsightIds } = await generateKnowledgeAlerts({
      tenantId: orgId,
      lookbackDays,
    });

    logger.info('[CRON/knowledge-alerts] Complete', {
      orgId,
      alerts: alertIds.length,
      mirrored: mirroredInsightIds.length,
    });

    return NextResponse.json({
      success: true,
      orgId,
      alertsCreated: alertIds.length,
      insightsMirrored: mirroredInsightIds.length,
    });
  } catch (err) {
    logger.error('[CRON/knowledge-alerts] Failed', { error: err });
    return NextResponse.json({ error: 'Alert generation failed' }, { status: 500 });
  }
}
