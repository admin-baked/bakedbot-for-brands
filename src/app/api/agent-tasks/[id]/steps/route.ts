/**
 * Agent Task Steps — Append a step to the execution log
 *
 * POST /api/agent-tasks/:id/steps
 *
 * Body: { label, status, notes? }
 * Agents call this as they work through a task so the board stays live.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { logTaskStep } from '@/server/actions/agent-tasks';
import type { TaskStep } from '@/types/agent-task';

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

        if (!body.label || !body.status) {
            return NextResponse.json({ error: 'Missing label or status' }, { status: 400 });
        }

        const step: Omit<TaskStep, 'completedAt'> = {
            label: body.label,
            status: body.status,
            notes: body.notes,
        };

        const result = await logTaskStep(id, step);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (err) {
        logger.error('[API:agent-tasks/:id/steps] POST failed', {
            id,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
