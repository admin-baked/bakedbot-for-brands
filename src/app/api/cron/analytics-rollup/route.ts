/**
 * Analytics Rollup Cron Job
 *
 * Endpoint to be called by a cron service (e.g., Google Cloud Scheduler) daily at 3 AM
 * to update sales analytics metrics and trending status for products.
 *
 * Processes:
 * - Recalculate sales velocity (units per day) for all products
 * - Update trending status based on velocity and recency
 * - Decay old sales counts (optional: could implement rolling window here)
 *
 * Call frequency: Daily at 3 AM (off-peak hours to avoid impacting checkout)
 *
 * Example setup in Cloud Scheduler:
 * gcloud scheduler jobs create http analytics-rollup \
 *   --location=us-central1 \
 *   --schedule="0 3 * * *" \
 *   --http-method=POST \
 *   --uri=https://bakedbot.ai/api/cron/analytics-rollup \
 *   --headers="Authorization=Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { Product } from '@/types/products';
import { logger } from '@/lib/logger';
import { runAnalyticsRollup } from '@/server/services/order-analytics';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            logger.error('[CRON] CRON_SECRET is not configured');
            return NextResponse.json(
                { error: 'Server misconfiguration' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            logger.warn('[CRON] Invalid cron secret attempt for analytics-rollup');
            return NextResponse.json(
                { error: 'Invalid authorization' },
                { status: 401 }
            );
        }

        logger.info('[CRON] Starting analytics rollup');

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Query all orgs (via unique orgIds in products collection)
        const productsSnapshot = await db.collection('products').get();

        const orgIds = new Set<string>();
        for (const doc of productsSnapshot.docs) {
            const product = doc.data() as Product;
            if (product.orgId) {
                orgIds.add(product.orgId);
            }
        }

        logger.info('[CRON] Found orgs to process', { count: orgIds.size });

        // Run rollup for each org
        let successCount = 0;
        let failureCount = 0;

        for (const orgId of orgIds) {
            try {
                await runAnalyticsRollup(orgId);
                successCount++;
            } catch (error) {
                logger.error('[CRON] Rollup failed for org', {
                    error: error instanceof Error ? error.message : String(error),
                    orgId,
                });
                failureCount++;
            }
        }

        logger.info('[CRON] Analytics rollup completed', {
            orgsProcessed: successCount,
            orgsFailed: failureCount,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: {
                orgsProcessed: successCount,
                orgsFailed: failureCount,
            },
        });
    } catch (error) {
        logger.error('[CRON] Analytics rollup failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
    logger.info('[CRON] Analytics rollup GET request received');
    return NextResponse.json({
        message: 'Analytics rollup endpoint. Use POST with CRON_SECRET header.',
        example: {
            method: 'POST',
            header: 'Authorization: Bearer $CRON_SECRET',
        },
    });
}
