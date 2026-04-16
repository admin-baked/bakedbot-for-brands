/**
 * Agent Task — Single task GET/PATCH
 *
 * GET  /api/agent-tasks/:id          — fetch one task
 * PATCH /api/agent-tasks/:id         — update stoplight or status
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getTaskById, updateTaskStatus, updateTaskStoplight } from '@/server/actions/agent-tasks';
import type { AgentTaskStoplight, AgentTaskStatus } from '@/types/agent-task';

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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const result = await getTaskById(id);
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result.task);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    if (!verifyAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        if (body.stoplight) {
            const result = await updateTaskStoplight(id, body.stoplight as AgentTaskStoplight, body.note);
            return NextResponse.json(result, { status: result.success ? 200 : 400 });
        }

        if (body.status) {
            const result = await updateTaskStatus(id, body.status as AgentTaskStatus, {
                resolutionNote: body.resolutionNote,
                resolvedCommit: body.resolvedCommit,
            });
            return NextResponse.json(result, { status: result.success ? 200 : 400 });
        }

        return NextResponse.json({ error: 'Provide stoplight or status' }, { status: 400 });
    } catch (err) {
        logger.error('[API:agent-tasks/:id] PATCH failed', {
            id,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
