/**
 * WeedMaps Image Sync Cron Endpoint
 *
 * POST /api/cron/weedmaps-image-sync
 *
 * Triggers a WeedMaps → Firebase Storage product image sync for one org.
 * Builds (or reuses) the NY brand image catalog then matches to Firestore products.
 *
 * Usage:
 *   curl -X POST https://bakedbot.ai/api/cron/weedmaps-image-sync \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"orgId":"org_thrive_syracuse"}'
 *
 * Optional body fields:
 *   forceRebuild  boolean  Re-scrape WeedMaps even if catalog is fresh (default: false)
 *   dryRun        boolean  Match products but do NOT write (default: false)
 *   allOrgs       boolean  Run for all orgs with POS config (default: false)
 *
 * Cloud Scheduler:
 *   Schedule: 0 3 * * *  (daily 3:00 AM ET — low traffic window)
 *   gcloud scheduler jobs create http weedmaps-image-sync \
 *     --schedule="0 3 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/weedmaps-image-sync" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{\"allOrgs\":true}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWeedmapsImageSync } from '@/server/services/product-images/weedmaps-image-sync';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes (catalog build takes ~2-3 min for 100 dispensaries)

export async function POST(request: NextRequest) {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
        orgId?: string;
        forceRebuild?: boolean;
        dryRun?: boolean;
        allOrgs?: boolean;
    } = {};

    try {
        body = await request.json();
    } catch {
        // body is optional
    }

    const { forceRebuild = false, dryRun = false, allOrgs = false } = body;

    try {
        // Single org mode
        if (body.orgId && !allOrgs) {
            logger.info('[WMImageSyncCron] Single org sync', { orgId: body.orgId, forceRebuild, dryRun });
            const result = await runWeedmapsImageSync(body.orgId, { forceRebuild, dryRun });
            return NextResponse.json({ success: true, result });
        }

        // All orgs mode — run for every org that has products
        if (allOrgs) {
            const db = getAdminFirestore();
            const orgsSnap = await db.collection('organizations').get();
            const orgIds = orgsSnap.docs.map(d => d.id);

            logger.info('[WMImageSyncCron] All-orgs sync', { count: orgIds.length });

            const results = [];
            for (const orgId of orgIds) {
                try {
                    // Only rebuild catalog on the first org; reuse cached for the rest
                    const isFirst = results.length === 0;
                    const result = await runWeedmapsImageSync(orgId, {
                        forceRebuild: isFirst && forceRebuild,
                        dryRun,
                    });
                    results.push(result);
                } catch (err) {
                    logger.warn('[WMImageSyncCron] Org sync failed', { orgId, err: String(err) });
                    results.push({ orgId, error: String(err) });
                }
            }

            const totalUpdated = results.reduce((sum, r) => sum + ('productsUpdated' in r ? (r.productsUpdated || 0) : 0), 0);
            return NextResponse.json({ success: true, orgsProcessed: results.length, totalUpdated, results });
        }

        return NextResponse.json(
            { error: 'Provide orgId or set allOrgs=true' },
            { status: 400 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[WMImageSyncCron] Sync failed', { err: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
