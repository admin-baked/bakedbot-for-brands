/**
 * Cleanup Brands Cron Endpoint
 * GET /api/cron/cleanup-brands
 *
 * Deletes all brand SEO pages from the seo_pages_brand collection.
 * Runs during the early-morning low-traffic window before SEO regeneration jobs.
 *
 * Cloud Scheduler:
 *   Schedule: 0 2 * * *  (daily 2:00 AM ET)
 *   gcloud scheduler jobs create http cleanup-brands \
 *     --schedule="0 2 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/cleanup-brands" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminFirestore();
        logger.info('[Cleanup] Deleting all brand SEO pages...');

        const snapshot = await db.collection('seo_pages_brand').get();

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No pages to delete' });
        }

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();
        logger.info(`[Cleanup] Deleted ${count} pages`);

        return NextResponse.json({
            success: true,
            deleted: count,
            message: 'Successfully deleted all brand SEO pages'
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[Cleanup] Error', { error });
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
