export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import {
    handleCustomerOnboardingSignal,
    listDueCustomerOnboardingRunIds,
} from '@/server/services/customer-onboarding';

export const maxDuration = 120;

async function handleReviewSequence() {
    const runIds = await listDueCustomerOnboardingRunIds(50);
    let completed = 0;
    let failed = 0;

    const results = await Promise.all(
        runIds.map((runId) => handleCustomerOnboardingSignal({
            type: 'review_sequence_tick',
            runId,
        })),
    );

    results.forEach((result) => {
        if (result.success) {
            completed += 1;
        } else {
            failed += 1;
        }
    });

    logger.info('[ReviewSequence] Run complete', {
        processed: runIds.length,
        completed,
        failed,
    });

    return {
        processed: runIds.length,
        completed,
        failed,
    };
}

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'review-sequence');
    if (authError) {
        return authError;
    }

    try {
        const stats = await handleReviewSequence();
        return NextResponse.json({ success: true, ...stats });
    } catch (error) {
        logger.error('[CRON review-sequence] Error', { error: String(error) });
        return NextResponse.json({ error: 'Review sequence cron failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
