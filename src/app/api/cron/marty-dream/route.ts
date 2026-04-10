export const dynamic = 'force-dynamic';
/**
 * Marty Dream Cron — CEO Self-Improvement Loop
 *
 * Runs a Dream session for Marty: introspect → hypothesize → test → report.
 * Posts results to #ceo Slack channel.
 *
 * Schedule: 11 PM ET (end of day reflection), 6 AM ET (morning prep)
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http marty-dream-evening \
 *     --schedule="0 23 * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/marty-dream" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{"model":"sonnet"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import type { DreamModel } from '@/server/services/letta/dream-loop';

export const maxDuration = 120;

const VALID_MODELS: DreamModel[] = ['glm', 'gemini-flash', 'gemini-pro', 'haiku', 'sonnet', 'opus'];

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
    if (queryModel && VALID_MODELS.includes(queryModel as DreamModel)) {
        model = queryModel as DreamModel;
    } else if (req.method === 'POST') {
        try {
            const body = await req.json();
            if (body?.model && VALID_MODELS.includes(body.model)) {
                model = body.model;
            }
        } catch { /* default */ }
    }

    logger.info('[MartyDream] Starting dream session', { model });

    try {
        const { runDreamSession } = await import('@/server/services/letta/dream-loop');
        const session = await runDreamSession('Marty', model);

        // Post to #ceo channel
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'marty-ceo-briefing',
            channelName: 'ceo',
            fallbackText: `Marty Dream: ${session.hypotheses.length} hypotheses, ${session.hypotheses.filter(h => h.testResult === 'confirmed').length} confirmed`,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: '💭 Marty Dream Session' },
                },
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: session.report },
                },
            ],
        });

        // Log learnings to Marty's learning loop
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        for (const h of session.hypotheses) {
            await db.collection('marty_learning_log').add({
                action: `Dream hypothesis: ${h.hypothesis}`,
                result: h.testResult === 'confirmed' ? 'success' : 'failure',
                reason: h.testEvidence || h.testResult,
                nextStep: h.testResult === 'confirmed' ? 'Apply this insight' : 'Investigate further',
                category: 'dream',
                timestamp: Date.now(),
                createdAt: Date.now(),
            });
        }

        return NextResponse.json({
            success: true,
            model,
            hypotheses: session.hypotheses.length,
            confirmed: session.hypotheses.filter(h => h.testResult === 'confirmed').length,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[MartyDream] Failed', { error: msg, model });
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) { return handler(req); }
export async function GET(req: NextRequest) { return handler(req); }
