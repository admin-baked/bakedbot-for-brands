/**
 * Cron: Auto-Escalate Cards
 *
 * Runs daily at 7:00 AM ET.
 * Executes Level 3/4 discovered cards autonomously and sends daily digest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import {
  executeAutonomousCards,
  buildDailyDigest,
} from '@/server/services/insights/autonomy-escalation-service';
import { getInsightTargetOrgs } from '@/server/services/insights/target-orgs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authError = await requireCronSecret(request, 'auto-escalate-cards');
    if (authError) return authError;

    const targetOrgs = await getInsightTargetOrgs(['dispensary']);
    const results = [];

    for (const targetOrg of targetOrgs) {
      const orgId = targetOrg.orgId;

      try {
        const execResults = await executeAutonomousCards(orgId);

        // Build digest for Level 4 cards
        const digest = buildDailyDigest(execResults);

        results.push({
          orgId,
          success: true,
          cardsExecuted: execResults.length,
          successful: execResults.filter((r) => r.success).length,
          hasDigest: digest.length > 0,
        });

        if (digest) {
          logger.info('[Cron] Daily digest generated', { orgId, digest: digest.slice(0, 200) });
        }
      } catch (error) {
        logger.error('[Cron] Auto-escalation failed', { error, orgId });
        results.push({
          orgId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Cron] Auto-escalation cron failed', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// Cloud Scheduler sends POST
export async function POST(request: NextRequest) {
  return GET(request);
}
