/**
 * Skill Artifacts List API
 *
 * REST endpoint to query skill artifacts for a dashboard or inbox.
 *
 * GET /api/skills/artifacts?status=pending_review&artifactType=campaign_draft_bundle&limit=20
 * Returns: SkillArtifact[]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { getSkillArtifacts } from '@/server/services/skill-artifacts';
import type { SkillArtifactStatus } from '@/types/skill-artifact';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const user = await requireUser();
        const orgId = user.currentOrgId;
        if (!orgId) return NextResponse.json({ error: 'No org context' }, { status: 400 });

        const { searchParams } = req.nextUrl;
        const artifactType = searchParams.get('artifactType') ?? undefined;
        const status = searchParams.get('status') as SkillArtifactStatus | null ?? undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

        const artifacts = await getSkillArtifacts(orgId, { artifactType, status, limit });

        return NextResponse.json({ artifacts, count: artifacts.length });
    } catch (err) {
        logger.error('[skills/artifacts] error', { err });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
