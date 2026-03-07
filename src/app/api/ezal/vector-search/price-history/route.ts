/**
 * POST /api/ezal/vector-search/price-history
 *
 * Query price history for a competitive product from LanceDB.
 * Returns time-series data for charting and trend analysis.
 *
 * Body:
 *   tenantId   string  — tenant ID
 *   productId  string  — LanceDB product ID (format: competitorId__externalProductId)
 *   days?      number  — lookback window (default 30, max 365)
 *   limit?     number  — max records (default 500, max 1000)
 *
 * Auth: Firebase ID token OR CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/firebase/server-client';
import { getPriceHistory } from '@/server/services/ezal/lancedb-store';
import { logger } from '@/lib/logger';
import { ezalPriceHistorySchema } from '@/app/api/schemas';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
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

    // ── Parse & validate ──────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = ezalPriceHistorySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { tenantId, productId, days, limit } = parsed.data;

    logger.info('[VectorSearch] Price history query', { tenantId, productId, days });

    try {
        const startMs = Date.now();
        const history = await getPriceHistory(tenantId, productId, { days, limit });
        const durationMs = Date.now() - startMs;

        return NextResponse.json({
            success: true,
            productId,
            days,
            count: history.length,
            durationMs,
            history,
        });
    } catch (error) {
        logger.error('[VectorSearch] Price history query failed', {
            tenantId,
            productId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Query failed' },
            { status: 500 }
        );
    }
}
