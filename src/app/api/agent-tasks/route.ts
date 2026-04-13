/**
 * Agent Task Queue — REST API
 *
 * POST /api/agent-tasks          — Create a new task (requires CRON_SECRET or auth)
 * GET  /api/agent-tasks           — List tasks (requires CRON_SECRET or auth)
 * PATCH /api/agent-tasks          — Claim or update a task (requires CRON_SECRET or auth)
 *
 * Designed for CLI/Opencode/external agents to submit findings:
 *
 *   curl -X POST https://bakedbot.ai/api/agent-tasks \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "title": "Gmail token refresh failing",
 *       "body": "getCeoGmailClient() returns null because...",
 *       "priority": "high",
 *       "category": "bug",
 *       "reportedBy": "opencode",
 *       "filePath": "src/server/agents/marty.ts"
 *     }'
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    createTaskInternal,
    listAgentTasks,
    claimTask,
    updateTaskStatus,
    getTaskBoardMarkdown,
} from '@/server/actions/agent-tasks';
import type { AgentTaskStatus } from '@/types/agent-task';

export const dynamic = 'force-dynamic';

function verifyAuth(req: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return false;
    const auth = req.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return false;
    
    // Use timing-safe comparison to prevent timing attacks
    const crypto = require('crypto');
    const providedSecret = auth.slice(7); // Remove "Bearer " prefix
    const secretBuffer = Buffer.from(cronSecret);
    const providedBuffer = Buffer.from(providedSecret);
    
    // Ensure same length for timing-safe comparison
    if (secretBuffer.length !== providedBuffer.length) return false;
    
    return crypto.timingSafeEqual(secretBuffer, providedBuffer);
}

// --- POST: Create a task ---

export async function POST(req: NextRequest) {
    if (!verifyAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        if (!body.title || !body.body || !body.reportedBy) {
            return NextResponse.json(
                { error: 'Missing required fields: title, body, reportedBy' },
                { status: 400 }
            );
        }

        const result = await createTaskInternal({
            title: body.title,
            body: body.body,
            priority: body.priority,
            category: body.category,
            reportedBy: body.reportedBy,
            assignedTo: body.assignedTo,
            filePath: body.filePath,
            errorSnippet: body.errorSnippet,
            relatedCommit: body.relatedCommit,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, taskId: result.taskId }, { status: 201 });
    } catch (err) {
        logger.error('[API:agent-tasks] POST failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// --- GET: List tasks (or get markdown board) ---

export async function GET(req: NextRequest) {
    if (!verifyAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = req.nextUrl.searchParams.get('format');
    const status = req.nextUrl.searchParams.get('status') as AgentTaskStatus | null;
    const assignedTo = req.nextUrl.searchParams.get('assignedTo');

    // ?format=markdown returns the full board as a markdown document
    if (format === 'markdown') {
        const result = await getTaskBoardMarkdown();
        return new NextResponse(result.markdown, {
            status: 200,
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
        });
    }

    const result = await listAgentTasks({
        status: status || undefined,
        assignedTo: assignedTo || undefined,
        limit: 50,
    });

    return NextResponse.json(result);
}

// --- PATCH: Claim or update a task ---

export async function PATCH(req: NextRequest) {
    if (!verifyAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        if (!body.taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
        }

        // Claim action
        if (body.action === 'claim') {
            if (!body.claimedBy) {
                return NextResponse.json({ error: 'Missing claimedBy' }, { status: 400 });
            }
            const result = await claimTask(body.taskId, body.claimedBy);
            return NextResponse.json(result, { status: result.success ? 200 : 400 });
        }

        // Status update action
        if (body.status) {
            const result = await updateTaskStatus(body.taskId, body.status, {
                resolutionNote: body.resolutionNote,
                resolvedCommit: body.resolvedCommit,
            });
            return NextResponse.json(result, { status: result.success ? 200 : 400 });
        }

        return NextResponse.json({ error: 'Provide action=claim or status=<new_status>' }, { status: 400 });
    } catch (err) {
        logger.error('[API:agent-tasks] PATCH failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
