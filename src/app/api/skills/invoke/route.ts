/**
 * Skill Invoke API
 *
 * REST endpoint to invoke the skill router — used by the UI, agents,
 * playbook triggers, and proactive monitors.
 *
 * POST /api/skills/invoke
 * Body: { signal: SkillSignal }
 * Returns: SkillRouterResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { routeSkillSignal } from '@/server/services/skill-router';
import type { SkillSignal } from '@/types/skill-signal';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireUser();
        const body = await req.json();
        const signal: SkillSignal = body.signal;

        if (!signal?.kind || !signal?.orgId) {
            return NextResponse.json({ error: 'Missing signal.kind or signal.orgId' }, { status: 400 });
        }

        // Enforce org scoping — users can only invoke skills for their own org
        if (signal.orgId !== user.currentOrgId && user.role !== 'super_user') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Stamp the triggeredBy with the authenticated user
        const authoredSignal: SkillSignal = { ...signal, triggeredBy: user.uid };

        const result = await routeSkillSignal(authoredSignal);

        logger.info('[skills/invoke] routed', {
            orgId: signal.orgId,
            kind: signal.kind,
            status: result.status,
            artifactId: result.artifactId,
        });

        return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 });
    } catch (err) {
        logger.error('[skills/invoke] error', { err });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
