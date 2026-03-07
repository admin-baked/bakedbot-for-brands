/**
 * POST /api/ezal/vector-search
 *
 * Semantic search across competitive products using LanceDB.
 * Returns products ranked by vector similarity to the query.
 *
 * Body:
 *   tenantId      string  — tenant ID (e.g. "org_thrive_syracuse")
 *   query         string  — natural language search query
 *   competitorId? string  — filter by specific competitor
 *   category?     string  — filter by product category
 *   inStockOnly?  boolean — only return in-stock products (default false)
 *   limit?        number  — max results (default 20, max 50)
 *
 * Auth: Firebase ID token OR CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/firebase/server-client';
import { searchProducts } from '@/server/services/ezal/lancedb-store';
import { logger } from '@/lib/logger';
import { ezalVectorSearchSchema } from '@/app/api/schemas';

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

    const parsed = ezalVectorSearchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { tenantId, query, competitorId, category, inStockOnly, limit } = parsed.data;

    logger.info('[VectorSearch] Product search', { tenantId, query, competitorId, category });

    try {
        const startMs = Date.now();
        const results = await searchProducts(tenantId, query, {
            competitorId,
            category,
            inStockOnly,
            limit,
        });
        const durationMs = Date.now() - startMs;

        return NextResponse.json({
            success: true,
            query,
            count: results.length,
            durationMs,
            results,
        });
    } catch (error) {
        logger.error('[VectorSearch] Product search failed', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Search failed' },
            { status: 500 }
        );
    }
}
