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

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        if (token !== cronSecret) {
            logger.warn('[CRON] Invalid cron secret attempt');
            return NextResponse.json(
                { error: 'Invalid authorization' },
                { status: 401 }
            );
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

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results: {
                total: results.length,
                successful: successCount,
                failed: failedCount,
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
