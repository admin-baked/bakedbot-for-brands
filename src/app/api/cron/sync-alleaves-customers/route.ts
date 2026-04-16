export const dynamic = 'force-dynamic';
/**
 * Alleaves Customer Sync — Daily Cron
 *
 * Runs every day at 4 AM ET. For every org with an active Alleaves POS config,
 * syncs their customer roster: phone → alleaves_id, LTV fields, segments.
 *
 * Deploy:
 *   gcloud scheduler jobs create http sync-alleaves-customers-cron \
 *     --schedule="0 9 * * *" \
 *     --uri="https://bakedbot.ai/api/cron/sync-alleaves-customers" \
 *     --message-body='{}' \
 *     --headers="Authorization=Bearer $CRON_SECRET" \
 *     --time-zone="America/New_York"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { syncAlleavesCustomersForOrg } from '@/server/services/alleaves/customer-sync';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find all locations with active Alleaves configs
        const firestore = getAdminFirestore();
        const locSnap = await firestore.collection('locations')
            .where('posConfig.provider', '==', 'alleaves')
            .where('posConfig.status', '==', 'active')
            .get();

        if (locSnap.empty) {
            logger.info('[ALLEAVES_CRON] No active Alleaves orgs found');
            return NextResponse.json({ ok: true, processed: 0 });
        }

        // Dedupe by orgId (multiple locations can share an org)
        const orgIds = [...new Set(locSnap.docs.map(d => d.data().orgId as string).filter(Boolean))];
        logger.info('[ALLEAVES_CRON] Syncing orgs', { orgIds });

        const results = await Promise.allSettled(orgIds.map(orgId => syncAlleavesCustomersForOrg(orgId)));

        const summary = results.map((r, i) =>
            r.status === 'fulfilled'
                ? { ...r.value }
                : { orgId: orgIds[i], error: (r.reason as Error).message }
        );

        const failures = summary.filter(s => 'error' in s);
        if (failures.length > 0) {
            logger.warn('[ALLEAVES_CRON] Some orgs failed', { failures });
        }

        logger.info('[ALLEAVES_CRON] Daily sync complete', { total: orgIds.length, failures: failures.length });
        return NextResponse.json({ ok: true, processed: orgIds.length, results: summary });

    } catch (error: any) {
        logger.error('[ALLEAVES_CRON] Fatal error', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) { return GET(req); }
