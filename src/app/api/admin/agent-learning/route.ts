/**
 * Agent Learning Docs API
 *
 * GET /api/admin/agent-learning
 *
 * Returns all agent learning documents for dashboard polling.
 * Auth: super_user session (same pattern as agent-board route).
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getAllAgentLearningDocs } from '@/server/services/agent-performance';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const docs = await getAllAgentLearningDocs();
        return NextResponse.json({ docs });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[AgentLearning] GET failed', { error: msg });
        return NextResponse.json({ error: 'Failed to load learning docs' }, { status: 500 });
    }
}
