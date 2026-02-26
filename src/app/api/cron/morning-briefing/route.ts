/**
 * Morning Briefing Cron Endpoint
 *
 * Cloud Scheduler job (manual creation):
 *   Name:     morning-briefing
 *   Schedule: 0 13 * * *  (8 AM EST = 1 PM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/morning-briefing
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Generates an AnalyticsBriefing for every active org and posts it to their
 * dedicated Daily Briefing inbox thread as an `analytics_briefing` artifact.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { requireCronSecret } from '@/server/auth/cron';
import { postMorningBriefingToInbox } from '@/server/services/morning-briefing';

export const dynamic = 'force-dynamic';

/**
 * Collect unique orgIds from active dispensary/brand admin users.
 * Returns at most 50 distinct orgIds (rate-limit safety).
 */
async function getActiveOrgIds(): Promise<string[]> {
    const db = getAdminFirestore();
    const orgIds = new Set<string>();

    for (const role of ['dispensary_admin', 'brand_admin']) {
        try {
            const snap = await db
                .collection('users')
                .where('role', '==', role)
                .where('status', '==', 'active')
                .limit(50)
                .get();
            for (const doc of snap.docs) {
                const data = doc.data();
                const orgId = data.orgId || data.currentOrgId;
                if (orgId && typeof orgId === 'string') {
                    orgIds.add(orgId);
                }
                if (orgIds.size >= 50) break;
            }
        } catch (err) {
            logger.warn('[MorningBriefingCron] Failed to fetch users for role', {
                role,
                error: String(err),
            });
        }
        if (orgIds.size >= 50) break;
    }

    return Array.from(orgIds);
}

/**
 * Process orgs in batches of 10 using Promise.allSettled.
 */
async function processBatch(orgIds: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < orgIds.length; i += 10) {
        const batch = orgIds.slice(i, i + 10);
        const results = await Promise.allSettled(
            batch.map(orgId => postMorningBriefingToInbox(orgId))
        );
        results.forEach((result, idx) => {
            const orgId = batch[idx];
            if (result.status === 'fulfilled') {
                success.push(orgId);
            } else {
                failed.push(orgId);
                logger.error('[MorningBriefingCron] Failed for org', {
                    orgId,
                    error: String(result.reason),
                });
            }
        });
    }

    return { success, failed };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'morning-briefing');
    if (authError) return authError;

    logger.info('[MorningBriefingCron] Starting morning briefing job');

    try {
        const orgIds = await getActiveOrgIds();
        logger.info('[MorningBriefingCron] Processing orgs', { count: orgIds.length });

        if (orgIds.length === 0) {
            return NextResponse.json({
                success: true,
                orgsProcessed: 0,
                errors: [],
                message: 'No active orgs found',
            });
        }

        const { success, failed } = await processBatch(orgIds);

        logger.info('[MorningBriefingCron] Completed', {
            orgsProcessed: success.length,
            failed: failed.length,
        });

        return NextResponse.json({
            success: true,
            orgsProcessed: success.length,
            errors: failed,
        });
    } catch (error) {
        logger.error('[MorningBriefingCron] Unexpected error', { error: String(error) });
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
