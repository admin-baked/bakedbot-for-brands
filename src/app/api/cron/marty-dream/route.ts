export const dynamic = 'force-dynamic';
/**
 * Marty Dream Cron — CEO Self-Improvement Loop
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { isDreamModel, type DreamModel } from '@/server/services/letta/dream-loop';

export const maxDuration = 120;

async function handler(req: NextRequest): Promise<NextResponse> {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let model: DreamModel = 'glm';
    const queryModel = req.nextUrl.searchParams.get('model');
    if (isDreamModel(queryModel)) {
        model = queryModel;
    } else if (req.method === 'POST') {
        try {
            const body = await req.json();
            if (isDreamModel(body?.model)) {
                model = body.model;
            }
        } catch {
            // default
        }
    }

    logger.info('[MartyDream] Starting dream session', { model });

    try {
        const { runDreamSession, notifyDreamReview } = await import('@/server/services/letta/dream-loop');
        const session = await runDreamSession('Marty', model);
        await notifyDreamReview(session);

        return NextResponse.json({
            success: true,
            model,
            hypotheses: session.hypotheses.length,
            confirmed: session.hypotheses.filter(h => h.testResult === 'confirmed').length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[MartyDream] Failed', { error: message, model });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) { return handler(req); }
export async function GET(req: NextRequest) { return handler(req); }
