/**
 * Linus Dream Cron — Self-Improvement Loop
 *
 * Runs a Dream session: introspect → hypothesize → test → report.
 * Supports per-job model selection via ?model= query param or POST body.
 *
 * Schedule (America/Chicago):
 *   12 AM — opus     (deepest reasoning, overnight)
 *    2 AM — gemini-pro (different training distribution)
 *    4 AM — sonnet   (tool-use optimized analysis)
 *   10 AM — glm      (cheap daytime check-in)
 *    3 PM — gemini-flash (lightweight pulse)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { DreamModel } from '@/server/services/letta/dream-loop';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const VALID_MODELS: DreamModel[] = ['glm', 'gemini-flash', 'gemini-pro', 'haiku', 'sonnet', 'opus'];

async function handler(req: NextRequest): Promise<NextResponse> {
    // Auth
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[LinusDream] CRON_SECRET not configured');
        return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Read model from query param or POST body
    let model: DreamModel = 'glm';
    const queryModel = req.nextUrl.searchParams.get('model');
    if (queryModel && VALID_MODELS.includes(queryModel as DreamModel)) {
        model = queryModel as DreamModel;
    } else if (req.method === 'POST') {
        try {
            const body = await req.json();
            if (body?.model && VALID_MODELS.includes(body.model)) {
                model = body.model;
            }
        } catch {
            // No body or invalid JSON — use default
        }
    }

    const startTime = Date.now();
    logger.info('[LinusDream] Starting scheduled dream session', { model });

    try {
        const { runDreamSession } = await import('@/server/services/letta/dream-loop');
        const session = await runDreamSession('Linus', model);

        // Post to Slack
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'auto-escalator',
            channelName: 'linus-cto',
            fallbackText: `Dream Session: ${session.hypotheses.length} hypotheses, ${session.hypotheses.filter(h => h.testResult === 'confirmed').length} confirmed`,
            blocks: [
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: session.report },
                },
            ],
        });

        const duration = Date.now() - startTime;
        const confirmed = session.hypotheses.filter(h => h.testResult === 'confirmed').length;

        logger.info(`[LinusDream] Complete: ${session.hypotheses.length} hypotheses, ${confirmed} confirmed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            model: session.model,
            hypotheses: session.hypotheses.length,
            confirmed,
            duration_ms: duration,
        });
    } catch (error) {
        logger.error('[LinusDream] Cron failed:', error as Record<string, unknown>);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
