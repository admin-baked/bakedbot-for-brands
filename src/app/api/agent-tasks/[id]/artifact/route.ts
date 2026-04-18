/**
 * Agent Artifact Submission
 *
 * POST /api/agent-tasks/:id/artifact
 *
 * Body: AgentArtifact — agent submits completed work for human review.
 * Moves task to awaiting_approval + purple board column.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { submitArtifact } from '@/server/actions/agent-tasks';
import type { AgentArtifact } from '@/types/agent-task';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AgentArtifact['type'][] = ['document', 'copy', 'research', 'analysis', 'plan', 'spreadsheet', 'outreach'];

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        const body = await req.json() as Partial<AgentArtifact> & { generatedBy?: string };

        if (!body.type || !VALID_TYPES.includes(body.type)) {
            return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
        }
        if (!body.title || !body.content || !body.generatedBy) {
            return NextResponse.json({ error: 'Missing required fields: title, content, generatedBy' }, { status: 400 });
        }

        const artifact: AgentArtifact = {
            type: body.type,
            title: body.title,
            content: body.content,
            generatedBy: body.generatedBy,
            generatedAt: new Date().toISOString(),
        };

        const result = await submitArtifact(id, artifact);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (err) {
        logger.error('[API:agent-tasks/:id/artifact] POST failed', {
            id,
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
