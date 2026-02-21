/**
 * Cron: Generate Regulatory Compliance Insights
 *
 * Runs daily to generate insights for Deebo
 * (regulatory changes, compliance deadlines, jurisdiction-specific alerts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { RegulatoryInsightsGenerator } from '@/server/services/insights/generators/regulatory-insights-generator';
import { notifySlackOnCriticalInsights } from '@/server/services/insights/insight-notifier';
import { createThreadsFromInsights } from '@/server/actions/create-insight-thread';
import { getAdminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Requires Node.js runtime for Firestore

export async function GET(request: NextRequest) {
  try {
    // Auth: Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized cron attempt to regulatory insights');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all dispensary and brand orgs
    const db = getAdminFirestore();
    const tenantsSnapshot = await db
      .collection('tenants')
      .where('type', 'in', ['dispensary', 'brand'])
      .get();

    const results = [];

    // Generate insights for each org
    for (const doc of tenantsSnapshot.docs) {
      const orgId = doc.id;

      try {
        logger.info('[Cron] Generating regulatory insights', { orgId });

        const generator = new RegulatoryInsightsGenerator(orgId);
        const insights = await generator.generate();

        // Send Slack notifications for critical insights
        const slackResult = await notifySlackOnCriticalInsights(orgId, insights);

        // Auto-create threads for critical insights
        const threadResult = await createThreadsFromInsights(orgId, insights);

        results.push({
          orgId,
          success: true,
          insightsGenerated: insights.length,
          slackNotified: slackResult.notified,
          criticalCount: slackResult.count,
          threadsCreated: threadResult.created,
        });

        logger.info('[Cron] Regulatory insights generated', {
          orgId,
          count: insights.length,
          slackNotified: slackResult.notified,
          threadsCreated: threadResult.created,
        });
      } catch (error) {
        logger.error('[Cron] Failed to generate regulatory insights', { error, orgId });
        results.push({
          orgId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: results.length,
        results,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[Cron] Regulatory insights cron failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}

// Support POST for Cloud Scheduler
export async function POST(request: NextRequest) {
  return GET(request);
}
