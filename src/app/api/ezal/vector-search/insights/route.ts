/**
 * POST /api/ezal/vector-search/insights
 *
 * Semantic search across competitive insights using LanceDB.
 * Enables natural language queries like "who's aggressively pricing edibles?"
 *
 * Body:
 *   tenantId  string  — tenant ID
 *   query     string  — natural language search query
 *   severity? string  — filter by severity (low/medium/high/critical)
 *   type?     string  — filter by insight type
 *   limit?    number  — max results (default 20, max 50)
 *
 * Auth: Firebase ID token OR CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/firebase/server-client';
import { searchInsights } from '@/server/services/ezal/lancedb-store';
import { logger } from '@/lib/logger';
import { ezalInsightSearchSchema } from '@/app/api/schemas';
import type { InsightSeverity, InsightType } from '@/types/ezal-discovery';

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

    const parsed = ezalInsightSearchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { tenantId, query, severity, type, limit } = parsed.data;

    logger.info('[VectorSearch] Insight search', { tenantId, query, severity, type });

    try {
        const startMs = Date.now();
        const results = await searchInsights(tenantId, query, {
            severity: severity as InsightSeverity | undefined,
            type: type as InsightType | undefined,
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
        logger.error('[VectorSearch] Insight search failed', {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Search failed' },
            { status: 500 }
        );
    }
}
