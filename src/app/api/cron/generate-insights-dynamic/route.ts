/**
 * Cron: Generate Dynamic Insights
 *
 * Runs every 2 hours. Executes all active discovered card definitions
 * for each dispensary org, producing fresh InsightCards in the standard pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { DynamicCardGenerator } from '@/server/services/insights/generators/dynamic-card-generator';
import {
  getActiveCardDefinitions,
  markDefinitionGenerated,
} from '@/server/services/insights/card-discovery-service';
import { notifySlackOnCriticalInsights } from '@/server/services/insights/insight-notifier';
import { createThreadsFromInsights } from '@/server/actions/create-insight-thread';
import { getInsightTargetOrgs } from '@/server/services/insights/target-orgs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized attempt to generate-insights-dynamic');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetOrgs = await getInsightTargetOrgs(['dispensary']);
    const results = [];

    for (const targetOrg of targetOrgs) {
      const orgId = targetOrg.orgId;

      try {
        const definitions = await getActiveCardDefinitions(orgId);

        if (definitions.length === 0) {
          results.push({ orgId, success: true, insightsGenerated: 0, skipped: true });
          continue;
        }

        let totalInsights = 0;

        for (const def of definitions) {
          try {
            const generator = new DynamicCardGenerator(orgId, def);
            const insights = await generator.generate();

            if (insights.length > 0) {
              totalInsights += insights.length;
              await markDefinitionGenerated(orgId, def.slug);

              // Notify on critical insights
              await notifySlackOnCriticalInsights(orgId, insights);
              await createThreadsFromInsights(orgId, insights);
            }
          } catch (err) {
            logger.error('[Cron] Dynamic card generation failed for definition', {
              error: err,
              orgId,
              title: def.title,
            });
          }
        }

        results.push({
          orgId,
          success: true,
          definitionsProcessed: definitions.length,
          insightsGenerated: totalInsights,
        });

        logger.info('[Cron] Dynamic insights generated', {
          orgId,
          definitions: definitions.length,
          insights: totalInsights,
        });
      } catch (error) {
        logger.error('[Cron] Failed to generate dynamic insights', { error, orgId });
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
    logger.error('[Cron] Dynamic insights cron failed', { error });
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
