export const dynamic = 'force-dynamic';
/**
 * Marty Pressure Test Endpoint
 *
 * POST /api/test/marty-pressure
 * Body: { "question": "..." }
 * Auth: Bearer CRON_SECRET
 *
 * Returns Marty's full response including tool usage.
 * Temporary — remove after pressure testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { question?: string } = {};
    try { body = await req.json(); } catch { /* */ }

    const question = body.question;
    if (!question) {
        return NextResponse.json({ error: 'Missing "question" in body' }, { status: 400 });
    }

    logger.info('[MartyPressureTest] Running', { question: question.slice(0, 100) });

    try {
        const { runMarty } = await import('@/server/agents/marty');
        const start = Date.now();

        const response = await runMarty({
            prompt: question,
            maxIterations: 4,
            context: { userId: 'pressure-test', orgId: 'org_bakedbot_internal' },
        });

        const elapsed = Math.round((Date.now() - start) / 1000);

        return NextResponse.json({
            question,
            response: response.content,
            model: response.model,
            toolsUsed: (response.toolExecutions || []).map(t => ({
                name: t.name,
                result: JSON.stringify(t.result).slice(0, 300),
            })),
            elapsed: `${elapsed}s`,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[MartyPressureTest] Failed', { error: msg });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
