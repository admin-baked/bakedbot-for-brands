/**
 * NY Outreach Pre-Enrich Cron
 *
 * Runs daily at 6 AM EST (11 AM UTC), 2 hours before the morning briefing.
 * Enriches the next batch of unenriched NY leads with email/website data via
 * Jina web scraping + Apollo.io fallback.
 *
 * Goal: by the time the super user opens their dashboard at 8–9 AM,
 * enriched leads are already waiting in the queue, ready for draft generation.
 *
 * Cloud Scheduler:
 *   Name:     ny-outreach-pre-enrich
 *   Schedule: 0 11 * * 1-5    (6 AM EST = 11 AM UTC, weekdays)
 *   URL:      /api/cron/ny-outreach-pre-enrich
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { enrichLeadBatch } from '@/server/services/ny-outreach/lead-enrichment';
import { getApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';

export const dynamic = 'force-dynamic';

/** How many leads to enrich per run — keeps within Jina + Apollo rate limits */
const BATCH_SIZE = 20;

/** Don't enrich if Apollo has fewer than this many credits remaining */
const MIN_APOLLO_CREDITS = 5;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-outreach-pre-enrich');
    if (authError) return authError;

    logger.info('[PreEnrich] Starting pre-morning enrichment run', { batchSize: BATCH_SIZE });

    try {
        const db = getAdminFirestore();

        // Step 1: Check how many unenriched leads exist
        const unenrichedSnap = await db.collection('ny_dispensary_leads')
            .where('enriched', '==', false)
            .count()
            .get();
        const totalUnenriched = unenrichedSnap.data().count;

        if (totalUnenriched === 0) {
            logger.info('[PreEnrich] No unenriched leads — queue is fully enriched');
            return NextResponse.json({
                success: true,
                summary: { totalUnenriched: 0, enriched: 0, withEmail: 0, message: 'Queue already enriched' },
            });
        }

        // Step 2: Guard Apollo credits
        const credits = await getApolloCreditStatus();
        if (credits.remaining <= MIN_APOLLO_CREDITS) {
            logger.warn('[PreEnrich] Apollo credits too low — skipping enrichment', {
                remaining: credits.remaining,
                minimum: MIN_APOLLO_CREDITS,
            });
            return NextResponse.json({
                success: true,
                summary: {
                    totalUnenriched,
                    enriched: 0,
                    withEmail: 0,
                    message: `Apollo credits too low (${credits.remaining} remaining) — skipped enrichment`,
                    apolloCredits: credits,
                },
            });
        }

        // Step 3: Run enrichment batch
        const result = await enrichLeadBatch(BATCH_SIZE);

        logger.info('[PreEnrich] Enrichment complete', {
            totalUnenriched,
            enriched: result.enriched,
            withEmail: result.withEmail,
            apolloCreditsUsed: credits.used,
        });

        return NextResponse.json({
            success: true,
            summary: {
                totalUnenriched,
                enriched: result.enriched,
                withEmail: result.withEmail,
                emailRate: result.enriched > 0
                    ? `${Math.round((result.withEmail / result.enriched) * 100)}%`
                    : '0%',
                apolloCreditsRemaining: credits.remaining,
                message: result.withEmail > 0
                    ? `Found ${result.withEmail} emails from ${result.enriched} leads — ready for draft generation`
                    : `Enriched ${result.enriched} leads — no emails found this batch`,
            },
            results: result.results.slice(0, 10), // Return first 10 for visibility
        });

    } catch (error) {
        logger.error('[PreEnrich] Unexpected error', { error: String(error) });
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Cloud Scheduler sends POST — also allow GET for manual testing
export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
