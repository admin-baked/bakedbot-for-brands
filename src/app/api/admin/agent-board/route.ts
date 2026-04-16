/**
 * Agent Board Data API — Board state grouped by stoplight column
 *
 * GET /api/admin/agent-board
 * GET /api/admin/agent-board?agentId=craig&orgId=org_thrive_syracuse
 *
 * Returns tasks bucketed into 5 columns: gray / yellow / orange / green / red
 * Auth: super_user session (same pattern as other admin routes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getAgentBoardTasks } from '@/server/actions/agent-tasks';
import { getAgentFeedbackSummary } from '@/server/services/agent-learning-loop';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = req.nextUrl.searchParams.get('agentId') || undefined;
    const orgId   = req.nextUrl.searchParams.get('orgId')   || undefined;

    try {
        const boardResult = await getAgentBoardTasks();

        // Apply filters if provided
        if (agentId || orgId) {
            const filter = (t: { assignedTo?: string | null; reportedBy?: string; orgId?: string }) =>
                (!agentId || t.assignedTo === agentId || t.reportedBy === agentId) &&
                (!orgId || t.orgId === orgId);

            boardResult.columns.gray   = boardResult.columns.gray.filter(filter);
            boardResult.columns.yellow = boardResult.columns.yellow.filter(filter);
            boardResult.columns.orange = boardResult.columns.orange.filter(filter);
            boardResult.columns.green  = boardResult.columns.green.filter(filter);
            boardResult.columns.red    = boardResult.columns.red.filter(filter);
        }

        // Include per-agent feedback summaries (7-day window)
        const allAgents = [
            ...boardResult.columns.gray.map(t => t.assignedTo || t.reportedBy),
            ...boardResult.columns.yellow.map(t => t.assignedTo || t.reportedBy),
            ...boardResult.columns.orange.map(t => t.assignedTo || t.reportedBy),
            ...boardResult.columns.green.map(t => t.assignedTo || t.reportedBy),
            ...boardResult.columns.red.map(t => t.assignedTo || t.reportedBy),
        ].filter((a): a is string => Boolean(a));
        const agentIds = [...new Set(allAgents)];

        const feedbackSummaries = await Promise.all(
            agentIds.map(id => getAgentFeedbackSummary(id, 7).then(s => ({ agentId: id, ...s }))),
        );

        return NextResponse.json({
            ...boardResult,
            feedbackSummaries,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        logger.error('[API:admin/agent-board] GET failed', {
            error: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
