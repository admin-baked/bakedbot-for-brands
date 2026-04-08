export const dynamic = 'force-dynamic';
/**
 * Retention Score Cron Job
 *
 * Runs weekly (Monday 3 AM) to compute a 0-100 rule-based retention score
 * for every customer across all orgs. Writes retentionScore, retentionTier,
 * scoreTrend, and scoreBreakdown back to the customers collection.
 *
 * Cloud Scheduler config:
 *   Schedule: 0 3 * * 1  (Monday 3 AM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/retention-score
 *   Method:   POST
 *   Headers:  Authorization: Bearer ${CRON_SECRET}
 *
 * No LLM tokens used — pure rule-based scoring (fast, deterministic, free).
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { RetentionScoreService } from '@/server/services/retention-score';
import { runVipRetentionWatch } from '@/server/services/vip-retention-watch';
import { getAdminFirestore } from '@/firebase/admin';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — no LLM calls, Firestore batches only

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        logger.info('[Cron] Retention score job started');

        // 1. Auth
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
            logger.warn('[Cron] Unauthorized retention score attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Enumerate all orgs
        const db = getAdminFirestore();
        const tenantsSnap = await db.collection('tenants').get();

        const results = [];

        // 3. Score each org
        const service = new RetentionScoreService();

        for (const tenantDoc of tenantsSnap.docs) {
            const orgId = tenantDoc.id;
            try {
                logger.info('[Cron] Scoring retention for org', { orgId });
                const result = await service.scoreOrg(orgId);
                const vipRetention = result.success
                    ? await runVipRetentionWatch(orgId)
                    : undefined;
                results.push(vipRetention ? { ...result, vipRetention } : result);
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                logger.error('[Cron] Retention score failed for org', { orgId, error });
                results.push({ success: false, orgId, error });
            }
        }

        const duration = Date.now() - startTime;
        const totalScored = results.reduce((sum, r) => sum + (('scored' in r ? r.scored : 0)), 0);
        const successOrgs = results.filter((r) => r.success).length;

        logger.info('[Cron] Retention score job complete', {
            totalOrgs: results.length,
            successOrgs,
            totalScored,
            duration,
        });

        return NextResponse.json({
            success: true,
            jobDuration: duration,
            totalOrgs: results.length,
            successOrgs,
            totalScored,
            results,
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Cron] Retention score job failed', { error, duration });
        return NextResponse.json(
            { error: 'Retention score job failed', details: error, duration },
            { status: 500 },
        );
    }
}

/**
 * GET — manual trigger for a single org
 * Usage: GET /api/cron/retention-score?secret=<CRON_SECRET>&orgId=<orgId>
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

        logger.info('[Cron] Manual retention score trigger', { orgId });

        const service = new RetentionScoreService();
        const result = await service.scoreOrg(orgId);
        const vipRetention = result.success
            ? await runVipRetentionWatch(orgId)
            : undefined;

        return NextResponse.json(vipRetention ? { ...result, vipRetention } : result);
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[Cron] Manual retention score trigger failed', { error });
        return NextResponse.json({ error: 'Manual trigger failed', details: error }, { status: 500 });
    }
}
