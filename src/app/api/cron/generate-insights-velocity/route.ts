/**
 * Cron: Generate Inventory Velocity Insights
 *
 * Runs hourly to generate insights for Money Mike
 * (top sellers, slow movers, expiring products)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { InventoryVelocityGenerator } from '@/server/services/insights/generators/inventory-velocity-generator';
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
      logger.warn('[Cron] Unauthorized cron attempt to velocity insights');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all dispensary orgs
    const db = getAdminFirestore();
    const tenantsSnapshot = await db.collection('tenants').where('type', '==', 'dispensary').get();

    const results = [];

    // Generate insights for each org
    for (const doc of tenantsSnapshot.docs) {
      const orgId = doc.id;

      try {
        logger.info('[Cron] Generating velocity insights', { orgId });

        const generator = new InventoryVelocityGenerator(orgId);
        const insights = await generator.generate();

        results.push({
          orgId,
          success: true,
          insightsGenerated: insights.length,
        });

        logger.info('[Cron] Velocity insights generated', {
          orgId,
          count: insights.length,
        });
      } catch (error) {
        logger.error('[Cron] Failed to generate velocity insights', { error, orgId });
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
    logger.error('[Cron] Velocity insights cron failed', { error });
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
