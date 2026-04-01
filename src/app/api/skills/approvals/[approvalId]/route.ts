/**
 * Skill Approval API
 *
 * REST endpoint for the UI to approve or reject skill artifacts.
 * PATCH with editedPayload to approve with revisions.
 *
 * GET  /api/skills/approvals/[approvalId]
 * PATCH /api/skills/approvals/[approvalId]
 *   Body: { action: 'approve' | 'reject', rejectionReason?: string, editedPayload?: SkillArtifactPayload }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    getSkillApproval,
    approveSkillArtifact,
    rejectSkillArtifact,
} from '@/server/services/skill-policy-gate';
import { recordSkillOutcome, computeEditDistanceScore } from '@/server/services/skill-outcome-tracker';
import { getSkillArtifact } from '@/server/services/skill-artifacts';
import type { SkillArtifactPayload } from '@/types/skill-artifact';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ approvalId: string }> }
): Promise<NextResponse> {
    try {
        const user = await requireUser();
        const { approvalId } = await params;

        const approval = await getSkillApproval(approvalId);
        if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (approval.orgId !== user.currentOrgId && user.role !== 'super_user') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(approval);
    } catch (err) {
        logger.error('[skills/approvals] GET error', { err });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ approvalId: string }> }
): Promise<NextResponse> {
    try {
        const user = await requireUser();
        const { approvalId } = await params;

        const approval = await getSkillApproval(approvalId);
        if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        if (approval.orgId !== user.currentOrgId && user.role !== 'super_user') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (approval.status !== 'pending') {
            return NextResponse.json({ error: `Approval already ${approval.status}` }, { status: 409 });
        }

        const body = await req.json();
        const { action, rejectionReason, editedPayload } = body as {
            action: 'approve' | 'reject';
            rejectionReason?: string;
            editedPayload?: SkillArtifactPayload;
        };

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
        }

        const artifactCreatedAt = await getArtifactCreatedAt(approval.orgId, approval.artifactId);

        if (action === 'approve') {
            // Fetch original artifact before approving (needed for edit-distance; do it here to avoid
            // a second getSkillApproval read inside approveSkillArtifact)
            const originalArtifact = await getSkillArtifact(approval.orgId, approval.artifactId);
            const resolved = await approveSkillArtifact(approvalId, user.uid, editedPayload, approval);
            const editDistanceScore = editedPayload && originalArtifact
                ? computeEditDistanceScore(originalArtifact.payload, editedPayload)
                : undefined;

            await recordSkillOutcome({
                orgId: approval.orgId,
                skillName: approval.skillName,
                artifactId: approval.artifactId,
                approvalId,
                outcomeType: editedPayload ? 'approved_with_edits' : 'approved',
                approvalPosture: approval.approvalPosture,
                riskLevel: approval.riskLevel,
                wasEdited: !!editedPayload,
                editDistanceScore,
                timeToResolutionMs: artifactCreatedAt ? Date.now() - artifactCreatedAt : undefined,
                resolvedBy: user.uid,
            });

            return NextResponse.json(resolved);
        } else {
            if (!rejectionReason) {
                return NextResponse.json({ error: 'rejectionReason required for reject' }, { status: 400 });
            }

            const resolved = await rejectSkillArtifact(approvalId, user.uid, rejectionReason, approval);

            await recordSkillOutcome({
                orgId: approval.orgId,
                skillName: approval.skillName,
                artifactId: approval.artifactId,
                approvalId,
                outcomeType: 'rejected',
                approvalPosture: approval.approvalPosture,
                riskLevel: approval.riskLevel,
                wasEdited: false,
                rejectionReason,
                timeToResolutionMs: artifactCreatedAt ? Date.now() - artifactCreatedAt : undefined,
                resolvedBy: user.uid,
            });

            return NextResponse.json(resolved);
        }
    } catch (err) {
        logger.error('[skills/approvals] PATCH error', { err });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

async function getArtifactCreatedAt(orgId: string, artifactId: string): Promise<number | null> {
    try {
        const artifact = await getSkillArtifact(orgId, artifactId);
        if (!artifact?.createdAt) return null;
        return artifact.createdAt.toMillis();
    } catch {
        return null;
    }
}
