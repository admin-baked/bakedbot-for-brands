/**
 * Brand Website Image Sync Cron Endpoint
 *
 * POST /api/cron/brand-website-image-sync
 *
 * Scrapes brand official websites to find product images for items that
 * Leafly couldn't match (edibles, branded products, unique formulations).
 *
 * Usage:
 *   curl -X POST https://bakedbot.ai/api/cron/brand-website-image-sync \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dryRun": true}'
 *
 * Optional body fields:
 *   brandSlug  string   Process a single brand (e.g. "jaunty")
 *   dryRun     boolean  Match but do NOT write (default: false)
 *   maxBrands  number   Limit how many brands to process
 *   retailerId string   Retailer to scope brands to (default: retail_thrive_syracuse)
 *
 * Cloud Scheduler:
 *   Schedule: 0 3 * * *  (daily 3:00 AM ET — low traffic window)
 *   gcloud scheduler jobs create http brand-website-image-sync \
 *     --schedule="0 3 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/brand-website-image-sync" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { runBrandWebsiteImageSync } from '@/server/services/product-images/brand-website-image-sync';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
        brandSlug?: string;
        dryRun?: boolean;
        maxBrands?: number;
        retailerId?: string;
    } = {};

    try {
        body = await request.json();
    } catch {
        // body is optional
    }

    const { brandSlug, dryRun = false, maxBrands, retailerId } = body;

    try {
        logger.info('[BrandImgSyncCron] Starting brand website image sync', {
            brandSlug, dryRun, maxBrands, retailerId,
        });

        const result = await runBrandWebsiteImageSync({
            brandSlug,
            dryRun,
            maxBrands,
            retailerId,
        });

        logger.info('[BrandImgSyncCron] Sync complete', {
            brandsProcessed: result.brandsProcessed,
            websitesFound: result.websitesFound,
            productsUpdated: result.productsUpdated,
            durationMs: result.durationMs,
        });

        return NextResponse.json({ success: true, result });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[BrandImgSyncCron] Sync failed', { err: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
