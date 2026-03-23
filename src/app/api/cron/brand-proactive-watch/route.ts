/**
 * Brand Proactive Watch Cron
 *
 * Runs weekly (Friday 9 AM UTC) to surface market intelligence for brand operators.
 * Executes two proactive workflows per org:
 *   1. competitor_creative_watch — product launches, pricing shifts, strategy changes
 *   2. market_narrative_watch   — weekly market trends + recommendations
 *
 * Both workflows are disabled by default; enable per org via proactive settings.
 *
 * Cloud Scheduler config:
 *   Schedule: 0 9 * * 5  (Friday 9 AM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/brand-proactive-watch
 *   Method:   POST
 *   Headers:  Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { runCompetitorCreativeWatch } from '@/server/services/competitor-creative-watch';
import { runMarketNarrativeWatch } from '@/server/services/market-narrative-watch';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        logger.warn('[Cron] Unauthorized brand-proactive-watch attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[Cron] Brand proactive watch started');

        const db = getAdminFirestore();
        const tenantsSnap = await db.collection('tenants').get();

        const results = [];

        for (const tenantDoc of tenantsSnap.docs) {
            const orgId = tenantDoc.id;
            try {
                const [creative, narrative] = await Promise.all([
                    runCompetitorCreativeWatch(orgId),
                    runMarketNarrativeWatch(orgId),
                ]);
                results.push({ orgId, creative, narrative });
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                logger.error('[Cron] Brand proactive watch failed for org', { orgId, error });
                results.push({ orgId, error });
            }
        }

        const duration = Date.now() - startTime;
        const activeOrgs = results.filter((r) => !r.error).length;

        logger.info('[Cron] Brand proactive watch complete', {
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
        logger.error('[Cron] Brand proactive watch job failed', { error, duration });
        return NextResponse.json(
            { error: 'Brand proactive watch failed', details: error, duration },
            { status: 500 },
        );
    }
}

/**
 * GET — manual trigger for a single org
 * Usage: GET /api/cron/brand-proactive-watch?secret=<CRON_SECRET>&orgId=<orgId>
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

        logger.info('[Cron] Manual brand proactive watch trigger', { orgId });

        const [creative, narrative] = await Promise.all([
            runCompetitorCreativeWatch(orgId),
            runMarketNarrativeWatch(orgId),
        ]);

        return NextResponse.json({ orgId, creative, narrative });
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Cron] Manual brand proactive watch trigger failed', { error });
        return NextResponse.json({ error: 'Manual trigger failed', details: error }, { status: 500 });
    }
}
