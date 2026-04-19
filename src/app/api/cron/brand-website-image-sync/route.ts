export const dynamic = 'force-dynamic';
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
import { DiscoveryService } from '@/server/services/firecrawl';
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

    const { brandSlug, dryRun = false, retailerId } = body;

    // Credit pre-flight: each brand costs ~5 credits (1 search + up to 4 page scrapes).
    // Cap brands processed so we keep 300 credits in reserve.
    const discovery = DiscoveryService.getInstance();
    const remaining = await discovery.getRemainingCredits();
    const creditCappedMax = Math.max(0, Math.floor((remaining - 300) / 5));
    const maxBrands = body.maxBrands !== undefined
        ? Math.min(body.maxBrands, creditCappedMax)
        : creditCappedMax;

    if (maxBrands === 0 && !dryRun) {
        logger.warn('[BrandImgSyncCron] Skipping — Firecrawl credits too low', { remaining });
        return NextResponse.json({ success: true, skipped: true, reason: 'insufficient_credits', remaining });
    }

    try {
        logger.info('[BrandImgSyncCron] Starting brand website image sync', {
            brandSlug, dryRun, maxBrands, retailerId, remaining,
        });

        const result = await runBrandWebsiteImageSync({
            brandSlug,
            dryRun,
            maxBrands: brandSlug ? undefined : maxBrands, // single-brand runs ignore cap
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

export async function GET(request: NextRequest) { return POST(request); }
