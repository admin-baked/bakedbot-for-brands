/**
 * Grower Proactive Watch Cron
 *
 * Runs weekly (Monday 5 AM UTC, after retention-score at 3 AM) to surface
 * inventory intelligence for grower operators:
 *   1. yield_anomaly_watch        — detects stockouts and stale product listings
 *   2. wholesale_availability_prep — packages available inventory as buyer outreach draft
 *
 * Both workflows are disabled by default; enable per org via proactive settings.
 *
 * Cloud Scheduler config:
 *   Schedule: 0 5 * * 1  (Monday 5 AM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/grower-proactive-watch
 *   Method:   POST
 *   Headers:  Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { runYieldAnomalyWatch } from '@/server/services/yield-anomaly-watch';
import { runWholesaleAvailabilityPrep } from '@/server/services/wholesale-availability-prep';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        logger.warn('[Cron] Unauthorized grower-proactive-watch attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[Cron] Grower proactive watch started');

        const db = getAdminFirestore();
        const tenantsSnap = await db.collection('tenants').get();

        const results = [];

        for (const tenantDoc of tenantsSnap.docs) {
            const orgId = tenantDoc.id;
            try {
                const [yield_, wholesale] = await Promise.all([
                    runYieldAnomalyWatch(orgId),
                    runWholesaleAvailabilityPrep(orgId),
                ]);
                results.push({ orgId, yield: yield_, wholesale });
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                logger.error('[Cron] Grower proactive watch failed for org', { orgId, error });
                results.push({ orgId, error });
            }
        }

        const duration = Date.now() - startTime;
        const activeOrgs = results.filter((r) => !r.error).length;

        logger.info('[Cron] Grower proactive watch complete', {
            totalOrgs: results.length,
            activeOrgs,
            duration,
        });

        return NextResponse.json({
            success: true,
            jobDuration: duration,
            totalOrgs: results.length,
            activeOrgs,
            results,
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Cron] Grower proactive watch failed', { error, duration });
        return NextResponse.json(
            { error: 'Grower proactive watch failed', details: error, duration },
            { status: 500 },
        );
    }
}

/**
 * GET — manual trigger for a single org
 * Usage: GET /api/cron/grower-proactive-watch?secret=<CRON_SECRET>&orgId=<orgId>
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const orgId = searchParams.get('orgId');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || secret !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!orgId) {
            return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
        }

        logger.info('[Cron] Manual grower proactive watch trigger', { orgId });

        const [yield_, wholesale] = await Promise.all([
            runYieldAnomalyWatch(orgId),
            runWholesaleAvailabilityPrep(orgId),
        ]);

        return NextResponse.json({ orgId, yield: yield_, wholesale });
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Cron] Manual grower proactive watch trigger failed', { error });
        return NextResponse.json({ error: 'Manual trigger failed', details: error }, { status: 500 });
    }
}
