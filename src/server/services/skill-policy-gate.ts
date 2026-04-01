/**
 * Skill Policy Gate (Layer 4)
 *
 * Enforces approval postures at runtime. Pattern mirrors proactive-approval-service.ts.
 *
 * Call chain:
 *   1. skill-router calls enforceApprovalPosture() after saveSkillArtifact()
 *   2. Returns EnforcementResult — router acts on it
 *   3. UI/API calls approveSkillArtifact() / rejectSkillArtifact()
 *   4. Approval route triggers recordSkillOutcome() (Layer 5)
 *
 * Collection: skill_approvals/{approvalId}  (top-level, mirrors proactive_approvals)
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import { updateSkillArtifactStatus } from '@/server/services/skill-artifacts';
import type { SkillArtifact, SkillArtifactPayload, ApprovalPosture } from '@/types/skill-artifact';
import type {
    SkillApprovalRecord,
    SkillApprovalStatus,
    EnforcementResult,
    CreateSkillApprovalInput,
} from '@/types/skill-approval';

// ============ TTL ============

const APPROVAL_TTL_HOURS = 72;

// ============ Enforcement ============

/**
 * Enforce the approval posture for a saved artifact.
 * For postures requiring human action, creates a skill_approvals record and
 * batch-writes the approvalId back to the artifact atomically.
 */
export async function enforceApprovalPosture(
    artifact: SkillArtifact,
    orgId: string
): Promise<EnforcementResult> {
    const posture = artifact.approvalPosture;

    switch (posture) {
        case 'inform_only':
        case 'recommend_only':
            return { allowed: true, requiresHuman: false, reason: `${posture} — no execution gate` };

        case 'execute_within_limits': {
            if (artifact.riskLevel === 'low') {
                return { allowed: true, requiresHuman: false, reason: 'execute_within_limits + low risk → auto_approved' };
            }
            // medium/high risk falls through to human gate
            const approvalId = await createApprovalRecord(artifact, orgId, 'pending');
            return { allowed: false, requiresHuman: true, approvalId, reason: 'execute_within_limits + medium/high risk → pending human review' };
        }

        case 'draft_only': {
            const approvalId = await createApprovalRecord(artifact, orgId, 'pending');
            return { allowed: false, requiresHuman: true, approvalId, reason: 'draft_only — awaiting human approval before any send' };
        }

        case 'always_escalate': {
            const approvalId = await createApprovalRecord(artifact, orgId, 'pending');
            return { allowed: false, requiresHuman: true, approvalId, reason: 'always_escalate — mandatory human sign-off' };
        }

        default:
            return { allowed: false, requiresHuman: true, reason: `unknown posture '${posture}' — blocking by default` };
    }
}

// ============ CRUD ============

export async function createSkillApproval(input: CreateSkillApprovalInput): Promise<SkillApprovalRecord> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + APPROVAL_TTL_HOURS * 60 * 60 * 1000);

    const record: Omit<SkillApprovalRecord, 'id'> = {
        orgId: input.orgId,
        artifactId: input.artifactId,
        skillName: input.skillName,
        approvalPosture: input.approvalPosture,
        riskLevel: input.riskLevel,
        status: 'pending',
        wasEdited: false,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await db.collection('skill_approvals').add(record);
    logger.info('[skill-policy-gate] approval created', { approvalId: docRef.id, artifactId: input.artifactId });
    return { id: docRef.id, ...record };
}

export async function approveSkillArtifact(
    approvalId: string,
    resolvedBy: string,
    editedPayload?: SkillArtifactPayload,
    existing?: SkillApprovalRecord  // pass if already fetched to avoid a second read
): Promise<SkillApprovalRecord> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const wasEdited = editedPayload !== undefined;

    await db.collection('skill_approvals').doc(approvalId).update({
        status: 'approved',
        resolvedBy,
        resolvedAt: now,
        wasEdited,
        ...(wasEdited ? { editedPayload } : {}),
        updatedAt: now,
    });

    const approval = existing ?? await getSkillApproval(approvalId);
    if (!approval) throw new Error(`skill_approvals/${approvalId} not found after update`);

    await updateSkillArtifactStatus(approval.orgId, approval.artifactId, 'approved', resolvedBy);
    logger.info('[skill-policy-gate] approved', { approvalId, resolvedBy, wasEdited });
    return { ...approval, status: 'approved', resolvedBy, resolvedAt: now, wasEdited };
}

export async function rejectSkillArtifact(
    approvalId: string,
    resolvedBy: string,
    rejectionReason: string,
    existing?: SkillApprovalRecord  // pass if already fetched to avoid a second read
): Promise<SkillApprovalRecord> {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    await db.collection('skill_approvals').doc(approvalId).update({
        status: 'rejected',
        resolvedBy,
        resolvedAt: now,
        rejectionReason,
        updatedAt: now,
    });

    const approval = existing ?? await getSkillApproval(approvalId);
    if (!approval) throw new Error(`skill_approvals/${approvalId} not found after update`);

    await updateSkillArtifactStatus(approval.orgId, approval.artifactId, 'rejected', resolvedBy);
    logger.info('[skill-policy-gate] rejected', { approvalId, resolvedBy, rejectionReason });
    return { ...approval, status: 'rejected', resolvedBy, resolvedAt: now, rejectionReason };
}

export async function getSkillApproval(approvalId: string): Promise<SkillApprovalRecord | null> {
    const doc = await getAdminFirestore().collection('skill_approvals').doc(approvalId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SkillApprovalRecord;
}

export async function listPendingSkillApprovals(orgId: string): Promise<SkillApprovalRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await (getAdminFirestore().collection('skill_approvals') as any)
        .where('orgId', '==', orgId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SkillApprovalRecord));
}

/**
 * Mark expired pending approvals. Called by the skill-metrics-rollup cron.
 */
export async function autoExpireSkillApprovals(): Promise<number> {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await (db.collection('skill_approvals') as any)
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .limit(100)
        .get();

    if (snap.empty) return 0;

    const batch = db.batch();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const doc of snap.docs as any[]) {
        batch.update(doc.ref, { status: 'expired', updatedAt: now });
    }
    await batch.commit();

    logger.info('[skill-policy-gate] expired approvals', { count: snap.size });
    return snap.size;
}

// ============ Internal helpers ============

async function createApprovalRecord(
    artifact: SkillArtifact,
    orgId: string,
    status: SkillApprovalStatus
): Promise<string> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + APPROVAL_TTL_HOURS * 60 * 60 * 1000);

    const record: Omit<SkillApprovalRecord, 'id'> = {
        orgId,
        artifactId: artifact.id,
        skillName: artifact.skillName,
        approvalPosture: artifact.approvalPosture,
        riskLevel: artifact.riskLevel,
        status,
        wasEdited: false,
        expiresAt,
        createdAt: now,
        updatedAt: now,
    };

    // Atomic batch: create approval + write approvalId back to artifact
    const batch = db.batch();
    const approvalRef = db.collection('skill_approvals').doc(generateId());
    batch.set(approvalRef, record);
    batch.update(
        db.collection('agent_artifacts').doc(orgId).collection('artifacts').doc(artifact.id),
        { approvalId: approvalRef.id, updatedAt: now }
    );
    await batch.commit();

    logger.info('[skill-policy-gate] approval record created', {
        approvalId: approvalRef.id,
        artifactId: artifact.id,
        posture: artifact.approvalPosture,
        status,
    });

    return approvalRef.id;
}
