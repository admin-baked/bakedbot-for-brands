/**
 * GET /api/cron/ezal-optimize
 *
 * Cron endpoint: Optimizes LanceDB tables for all active tenants.
 * Compacts small files, prunes old versions (>7 days), rebuilds indices.
 *
 * Schedule: Daily at 3:00 AM UTC
 * Auth: CRON_SECRET (Bearer token)
 *
 * Cloud Scheduler setup:
 *   gcloud scheduler jobs create http ezal-lancedb-optimize \
 *     --schedule="0 3 * * *" \
 *     --uri="https://YOUR_DOMAIN/api/cron/ezal-optimize" \
 *     --http-method=GET \
 *     --headers="Authorization=Bearer CRON_SECRET_VALUE" \
 *     --time-zone="America/New_York" \
 *     --attempt-deadline=300s
 */

import { NextRequest, NextResponse } from 'next/server';
import { optimizeTables, getStoreStats } from '@/server/services/ezal/lancedb-store';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorizeCron(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json(
            { success: false, error: 'Server misconfiguration: CRON_SECRET not set' },
            { status: 500 }
        );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    return null;
}

export async function GET(req: NextRequest) {
    const authError = authorizeCron(req);
    if (authError) return authError;

    const startTime = Date.now();

    try {
        logger.info('[Cron:EzalOptimize] Starting LanceDB optimization');

        // Get list of active tenants from Firestore
        const { firestore } = await createServerClient();
        const tenantsSnap = await firestore.collection('tenants').limit(100).get();
        const tenantIds = tenantsSnap.docs.map(doc => doc.id);

        const results: Array<{
            tenantId: string;
            stats: { productCount: number; pricePointCount: number; insightCount: number };
            optimized: boolean;
            error?: string;
        }> = [];

        for (const tenantId of tenantIds) {
            try {
                const stats = await getStoreStats(tenantId);
                // Only optimize if there's data
                if (stats.tables.length > 0) {
                    await optimizeTables(tenantId);
                    results.push({
                        tenantId,
                        stats: {
                            productCount: stats.productCount,
                            pricePointCount: stats.pricePointCount,
                            insightCount: stats.insightCount,
                        },
                        optimized: true,
                    });
                }
            } catch (err) {
                results.push({
                    tenantId,
                    stats: { productCount: 0, pricePointCount: 0, insightCount: 0 },
                    optimized: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        const elapsed = Date.now() - startTime;
        const optimized = results.filter(r => r.optimized).length;

        logger.info('[Cron:EzalOptimize] Complete', {
            tenantsChecked: tenantIds.length,
            tenantsOptimized: optimized,
            elapsedMs: elapsed,
        });

        return NextResponse.json({
            success: true,
            tenantsChecked: tenantIds.length,
            tenantsOptimized: optimized,
            elapsedMs: elapsed,
            results,
        });
    } catch (error) {
        logger.error('[Cron:EzalOptimize] Failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Optimization failed' },
            { status: 500 }
        );
    }
}
