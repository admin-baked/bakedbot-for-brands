/**
 * GET /api/ezal/vector-search/stats?tenantId=xxx
 *
 * Returns LanceDB store statistics for a tenant.
 * Useful for monitoring data ingestion health and storage usage.
 *
 * Query params:
 *   tenantId  string  — tenant ID
 *
 * Auth: Firebase ID token OR CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/firebase/server-client';
import { getStoreStats } from '@/server/services/ezal/lancedb-store';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
        try {
            await verifyIdToken(authHeader.replace('Bearer ', ''));
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // ── Parse query params ────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    try {
        const stats = await getStoreStats(tenantId);

        return NextResponse.json({
            success: true,
            tenantId,
            uri: process.env.LANCEDB_URI || '/tmp/bakedbot-lancedb',
            storage: (process.env.LANCEDB_URI || '').startsWith('gs://') ? 'gcs' : 'local',
            ...stats,
        });
    } catch (error) {
        logger.error('[VectorSearch] Stats query failed', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Failed to get stats' },
            { status: 500 }
        );
    }
}
