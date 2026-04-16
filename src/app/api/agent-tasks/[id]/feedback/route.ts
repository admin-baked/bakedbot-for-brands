/**
 * Agent Task Feedback — Human review endpoint
 *
 * POST /api/agent-tasks/:id/feedback
 *
 * Body: { rating: 'approved' | 'needs_improvement' | 'rejected', note?, reviewedBy }
 *
 * Writes to agent_tasks.humanFeedback + agent_learning_log.
 * Called by the board UI and by the Slack interactions webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { submitTaskFeedback } from '@/server/actions/agent-tasks';
import type { TaskHumanFeedback } from '@/types/agent-task';

export const dynamic = 'force-dynamic';

function verifyAuth(req: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return false;
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return false;
    const crypto = require('crypto');
    const provided = Buffer.from(auth.slice(7));
    const expected = Buffer.from(cronSecret);
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    if (!verifyAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();

        if (!body.rating || !body.reviewedBy) {
            return NextResponse.json({ error: 'Missing rating or reviewedBy' }, { status: 400 });
        }

        const VALID_RATINGS = ['approved', 'needs_improvement', 'rejected'];
        if (!VALID_RATINGS.includes(body.rating)) {
            return NextResponse.json({ error: 'rating must be approved | needs_improvement | rejected' }, { status: 400 });
        }

        const feedback: TaskHumanFeedback = {
            rating: body.rating,
            note: body.note,
            reviewedBy: body.reviewedBy,
            reviewedAt: new Date().toISOString(),
        };

        const result = await submitTaskFeedback(id, feedback);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (err) {
        logger.error('[API:agent-tasks/:id/feedback] POST failed', {
            id,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
