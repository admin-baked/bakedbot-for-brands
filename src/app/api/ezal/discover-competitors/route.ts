/**
 * POST /api/ezal/discover-competitors
 *
 * Auto-discovers local dispensary competitors for an org using Jina Search + Reranker.
 * Optionally registers them in Firestore.
 *
 * Body:
 *   orgId    string  — tenant ID (e.g. "org_thrive_syracuse")
 *   city     string  — city name (e.g. "Syracuse")
 *   state    string  — two-letter state (e.g. "NY")
 *   zip      string  — zip code for Competitor records
 *   orgName? string  — own brand name (excluded from results)
 *   maxNew?  number  — max competitors to register (default 5)
 *   apply?   boolean — false = dry run; true = write to Firestore (default false)
 *
 * Auth: requires Firebase ID token (Authorization: Bearer <token>)
 *       OR CRON_SECRET for automated triggers
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/firebase/server-client';
import { autoSetupCompetitors, discoverCompetitorsByLocation } from '@/server/services/ezal/competitor-discovery';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    // ── Auth: user token OR cron secret ──────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { orgId, city, state, zip, orgName, maxNew, apply } = body as {
        orgId?: string;
        city?: string;
        state?: string;
        zip?: string;
        orgName?: string;
        maxNew?: number;
        apply?: boolean;
    };

    if (!orgId || !city || !state) {
        return NextResponse.json(
            { error: 'Missing required fields: orgId, city, state' },
            { status: 400 }
        );
    }

    logger.info('[DiscoverCompetitors] Request received', { orgId, city, state, apply });

    try {
        if (apply) {
            // Full pipeline with registration
            const result = await autoSetupCompetitors(orgId, {
                city,
                state,
                zip: zip || '',
                orgName,
                maxNew: maxNew ?? 5,
                apply: true,
            });

            return NextResponse.json({
                success: true,
                dry: false,
                orgId,
                registered: result.registered.map(r => ({
                    competitorId: r.competitor.id,
                    name: r.competitor.name,
                    url: r.url,
                    dataSourceId: r.dataSource.id,
                })),
                skipped: result.skipped,
                errors: result.errors,
            });
        } else {
            // Dry run — search + rerank only, no writes
            const discovery = await discoverCompetitorsByLocation(orgId, { city, state, orgName });

            return NextResponse.json({
                success: true,
                dry: true,
                orgId,
                query: discovery.query,
                searchMs: discovery.searchMs,
                rerankMs: discovery.rerankMs,
                totalMs: discovery.totalMs,
                discovered: discovery.discovered.map(d => ({
                    name: d.name,
                    url: d.url,
                    domain: d.domain,
                    relevanceScore: d.relevanceScore,
                    isDirect: d.isDirect,
                    isPosStorefront: d.isPosStorefront,
                    alreadyTracked: d.alreadyTracked,
                    existingId: d.existingId,
                })),
            });
        }
    } catch (error: any) {
        logger.error('[DiscoverCompetitors] Failed', { orgId, error: error.message });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
