export const dynamic = 'force-dynamic';
/**
 * POST /api/errors/client
 *
 * Receives client-side React ErrorBoundary crashes and:
 *   1. Deduplicates — silently drops if the same error was filed in the last 10 min
 *   2. Creates an agent_tasks doc (Linus picks it up in his tool loop)
 *   3. Posts a Slack alert to #linus-incidents
 *
 * Auth: session cookie (requireUser). Dashboard users are always authenticated.
 * Rate: Firestore-based dedup per error message (10 min window, per org).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { createTaskInternal } from '@/server/actions/agent-tasks';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 min

const bodySchema = z.object({
    message: z.string().max(500),
    stack: z.string().max(4000).optional(),
    componentStack: z.string().max(4000).optional(),
    url: z.string().max(500).optional(),
    userAgent: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
    // Auth — user must be logged in (dashboard-only surface)
    let session: { uid: string; email?: string; orgId?: string };
    try {
        const tok = await requireUser();
        session = {
            uid: tok.uid,
            email: typeof tok.email === 'string' ? tok.email : undefined,
            orgId: typeof tok.orgId === 'string' ? tok.orgId : undefined,
        };
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
        body = bodySchema.parse(await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const title = `[Client Error] ${body.message.slice(0, 120)}`;

    // Dedup: same error title filed in the last 10 min by the same org
    try {
        const dupQuery = db.collection('agent_tasks')
            .where('title', '==', title)
            .where('status', '==', 'open')
            .where('createdAt', '>', cutoff)
            .limit(1);
        const dup = await dupQuery.get();
        if (!dup.empty) {
            return NextResponse.json({ success: true, deduplicated: true }, { status: 200 });
        }
    } catch (err) {
        logger.warn('[api/errors/client] dedup query failed — proceeding', { err });
    }

    // Build task body
    const errorDetails = [
        `**URL:** ${body.url ?? 'unknown'}`,
        `**User:** ${session.email ?? session.uid}${session.orgId ? ` (${session.orgId})` : ''}`,
        body.stack ? `\n**Stack:**\n\`\`\`\n${body.stack.slice(0, 1500)}\n\`\`\`` : '',
        body.componentStack ? `\n**Component stack:**\n\`\`\`\n${body.componentStack.slice(0, 800)}\n\`\`\`` : '',
    ].filter(Boolean).join('\n');

    const taskResult = await createTaskInternal({
        title,
        body: `React ErrorBoundary caught an unhandled client-side crash.\n\n${errorDetails}`,
        priority: 'high',
        category: 'bug',
        reportedBy: 'api-errors-client',
        filePath: body.url,
        errorSnippet: body.stack?.slice(0, 300),
    });

    // Slack alert
    try {
        await postLinusIncidentSlack({
            fallbackText: `🚨 Client crash: ${body.message.slice(0, 120)}`,
            source: 'client-error',
            incidentId: taskResult.taskId ?? null,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: '🚨 Client-Side Crash Reported', emoji: true },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*Error*\n${body.message.slice(0, 200)}` },
                        { type: 'mrkdwn', text: `*User*\n${session.email ?? session.uid}` },
                        { type: 'mrkdwn', text: `*URL*\n${body.url ?? 'unknown'}` },
                        { type: 'mrkdwn', text: `*Task*\n${taskResult.taskId ? `#${taskResult.taskId}` : 'n/a'}` },
                    ],
                },
                ...(body.stack ? [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Stack (truncated)*\n\`\`\`${body.stack.slice(0, 600)}\`\`\``,
                    },
                }] : []),
            ],
        });
    } catch (err) {
        logger.warn('[api/errors/client] Slack alert failed', { err });
    }

    return NextResponse.json({ success: true, taskId: taskResult.taskId }, { status: 201 });
}
