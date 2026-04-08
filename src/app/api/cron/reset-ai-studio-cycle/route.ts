export const dynamic = 'force-dynamic';
/**
 * AI Studio Monthly Billing Cycle Reset
 *
 * Resets AI Studio credit balances at the start of each billing cycle:
 * - Calculates eligible rollover (max 25% of included monthly credits)
 * - Creates/updates new balance doc for the current cycle
 * - Resets all used-credit counters
 * - Preserves top-up balances (top-ups expire only on policy change)
 *
 * Cloud Scheduler: 0 0 1 * * (1st of each month, midnight UTC)
 * POST /api/cron/reset-ai-studio-cycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { resetAIStudioBillingCycle } from '@/server/services/ai-studio-billing-service';

export async function GET(req: NextRequest) {
    return handler(req);
}

export async function POST(req: NextRequest) {
    return handler(req);
}

async function handler(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    logger.info('[AIStudioReset] Monthly billing cycle reset started');

    try {
        const db = getAdminFirestore();

        // Find all orgs with an entitlement doc
        const entitlementSnaps = await db.collection('org_ai_studio_entitlements').get();
        const orgIds = entitlementSnaps.docs.map((d) => d.id);

        logger.info('[AIStudioReset] Processing orgs', { count: orgIds.length });

        const results = await Promise.allSettled(
            orgIds.map((orgId) => resetAIStudioBillingCycle(orgId))
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        if (failed > 0) {
            const errors = results
                .map((r, i) =>
                    r.status === 'rejected' ? { orgId: orgIds[i], reason: r.reason } : null
                )
                .filter(Boolean);
            logger.error('[AIStudioReset] Some orgs failed to reset', { failed, errors });
        }

        const duration = Date.now() - startTime;
        logger.info('[AIStudioReset] Cycle reset complete', { succeeded, failed, duration });

        return NextResponse.json({
            success: true,
            orgsProcessed: orgIds.length,
            succeeded,
            failed,
            durationMs: duration,
            timestamp: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[AIStudioReset] Fatal error during reset', { err });
        return NextResponse.json(
            { error: 'Cycle reset failed', message },
            { status: 500 }
        );
    }
}
