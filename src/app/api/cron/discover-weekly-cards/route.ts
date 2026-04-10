/**
 * Cron: Discover Weekly Cards
 *
 * Runs every Monday at 6:00 AM ET.
 * Uses Claude to analyze POS data, competitive intel, and Reddit trends
 * to propose 3 new briefing card types per dispensary org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { discoverNewCards } from '@/server/services/insights/card-discovery-service';
import { getInsightTargetOrgs } from '@/server/services/insights/target-orgs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120; // LLM calls may take time

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized attempt to discover-weekly-cards');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetOrgs = await getInsightTargetOrgs(['dispensary']);
    const results = [];

    for (const targetOrg of targetOrgs) {
      const orgId = targetOrg.orgId;

      try {
        logger.info('[Cron] Discovering weekly cards', { orgId });
        const definitions = await discoverNewCards(orgId);

        results.push({
          orgId,
          success: true,
          cardsDiscovered: definitions.length,
          titles: definitions.map((d) => d.title),
        });

        logger.info('[Cron] Weekly cards discovered', {
          orgId,
          count: definitions.length,
        });
      } catch (error) {
        logger.error('[Cron] Failed to discover cards', { error, orgId });
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
    logger.error('[Cron] Weekly card discovery cron failed', { error });
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
