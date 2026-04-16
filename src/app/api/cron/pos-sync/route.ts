export const dynamic = 'force-dynamic';
/**
 * POS Sync Cron Job
 *
 * Endpoint to be called by a cron service (e.g., GitHub Actions, Google Cloud Scheduler)
 * to periodically sync customer and order data from POS systems
 *
 * Call frequency: Every 30 minutes recommended
 *
 * Example usage:
 * curl -X POST https://bakedbot.ai/api/cron/pos-sync \
 *   -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllPOSData, syncOrgPOSData } from '@/server/services/pos-sync-service';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    try {
        const authError = await requireCronSecret(request, 'pos-sync');
        if (authError) {
            return authError;
        }

        // Check if specific orgId was provided in query params
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        let results;
        if (orgId) {
            logger.info('[CRON] Starting single org sync', { orgId });
            const result = await syncOrgPOSData(orgId);
            results = [result];
        } else {
            logger.info('[CRON] Starting batch sync for all orgs');
            results = await syncAllPOSData();
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;
        const menuProductsCount = results.reduce((sum, r) => sum + (r.menuProductsCount ?? 0), 0);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: {
                total: results.length,
                successful: successCount,
                failed: failedCount,
                menuProductsCount,
            },
            details: results,
        });
    } catch (error: any) {
        logger.error('[CRON] POS sync failed', { error: error.message });
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) { return POST(request); }
