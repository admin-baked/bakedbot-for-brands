/**
 * Skill Artifacts Service
 *
 * Persists named skill output objects to Firestore and creates inbox
 * notifications when an artifact requires human review or approval.
 *
 * Collection path: agent_artifacts/{orgId}/artifacts/{artifactId}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type {
    SkillArtifact,
    SkillArtifactStatus,
    CreateSkillArtifactInput,
    ApprovalPosture,
} from '@/types/skill-artifact';

// ============ Collection helpers ============

function artifactsCol(orgId: string) {
    return getAdminFirestore()
        .collection('agent_artifacts')
        .doc(orgId)
        .collection('artifacts');
}

// ============ Status derivation ============

/** Postures that place an artifact in pending_review and trigger an inbox notification. */
const POSTURES_REQUIRING_REVIEW: ApprovalPosture[] = ['draft_only', 'always_escalate'];

function initialStatus(posture: ApprovalPosture): SkillArtifactStatus {
    return POSTURES_REQUIRING_REVIEW.includes(posture) ? 'pending_review' : 'reviewed';
}

function requiresInboxNotification(posture: ApprovalPosture): boolean {
    return POSTURES_REQUIRING_REVIEW.includes(posture);
}

// ============ Core operations ============

/**
 * Persist a skill artifact to Firestore.
 * For draft_only and always_escalate artifacts, also fires an inbox notification.
 */
export async function saveSkillArtifact(input: CreateSkillArtifactInput): Promise<SkillArtifact> {
    const now = Timestamp.now();

    const artifact: Omit<SkillArtifact, 'id'> = {
        orgId: input.orgId,
        skillName: input.skillName,
        artifactType: input.artifactType,
        approvalPosture: input.approvalPosture,
        riskLevel: input.riskLevel,
        status: initialStatus(input.approvalPosture),
        payload: input.payload,
        producedBy: input.producedBy,
        triggeredBy: input.triggeredBy,
        threadId: input.threadId,
        downstreamConsumers: input.downstreamConsumers,
        reviewNote: input.reviewNote,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await artifactsCol(input.orgId).add(artifact);
    const saved: SkillArtifact = { id: docRef.id, ...artifact };

    logger.info('[skill-artifacts] saved', {
        orgId: input.orgId,
        artifactId: docRef.id,
        skillName: input.skillName,
        artifactType: input.artifactType,
        status: artifact.status,
    });

    if (requiresInboxNotification(input.approvalPosture)) {
        await createInboxNotification(saved, now);
    }

    return saved;
}

/**
 * Fetch all artifacts for an org, optionally filtered by type and/or status.
 */
export async function getSkillArtifacts(
    orgId: string,
    filters?: { artifactType?: string; status?: SkillArtifactStatus; limit?: number }
): Promise<SkillArtifact[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = artifactsCol(orgId).orderBy('createdAt', 'desc');

    if (filters?.artifactType) {
        query = query.where('artifactType', '==', filters.artifactType);
    }
    if (filters?.status) {
        query = query.where('status', '==', filters.status);
    }

    query = query.limit(filters?.limit ?? 50);

    const snap = await query.get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as SkillArtifact));
}

/**
 * Fetch a single artifact by id.
 */
export async function getSkillArtifact(orgId: string, artifactId: string): Promise<SkillArtifact | null> {
    const doc = await artifactsCol(orgId).doc(artifactId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SkillArtifact;
}

/**
 * Update the status of an artifact (e.g., after human approval or rejection).
 */
export async function updateSkillArtifactStatus(
    orgId: string,
    artifactId: string,
    status: SkillArtifactStatus,
    reviewedBy?: string
): Promise<void> {
    const now = Timestamp.now();
    const update: Partial<SkillArtifact> = {
        status,
        updatedAt: now,
    };
    if (reviewedBy) {
        update.reviewedBy = reviewedBy;
        update.reviewedAt = now;
    }

    await artifactsCol(orgId).doc(artifactId).update(update);

    logger.info('[skill-artifacts] status updated', { orgId, artifactId, status, reviewedBy });
}

/** Set the content hash on an artifact after its prompt/payload has been built. */
export async function updateSkillArtifactContentHash(
    orgId: string,
    artifactId: string,
    contentHash: string
): Promise<void> {
    await artifactsCol(orgId).doc(artifactId).update({ contentHash, updatedAt: Timestamp.now() });
}

// ============ Inbox notification ============

/**
 * Create an inbox notification item so the operator sees the artifact
 * with approve/reject affordances.
 *
 * Uses the existing `inbox_notifications` collection pattern.
 */
async function createInboxNotification(
    artifact: SkillArtifact,
    createdAt: ReturnType<typeof Timestamp.now>
): Promise<void> {
    const urgency = artifact.riskLevel === 'high' ? 'high' : 'normal';

    const notification = {
        orgId: artifact.orgId,
        type: 'skill_artifact_review',
        title: skillArtifactTitle(artifact),
        body: artifact.reviewNote ?? `${artifact.skillName} produced a ${artifact.artifactType} requiring your review.`,
        urgency,
        artifactId: artifact.id,
        artifactType: artifact.artifactType,
        skillName: artifact.skillName,
        approvalPosture: artifact.approvalPosture,
        threadId: artifact.threadId ?? null,
        status: 'unread',
        actions: notificationActions(artifact.approvalPosture),
        createdAt,
    };

    await getAdminFirestore().collection('inbox_notifications').add(notification);

    logger.info('[skill-artifacts] inbox notification created', {
        orgId: artifact.orgId,
        artifactId: artifact.id,
        approvalPosture: artifact.approvalPosture,
    });
}

function skillArtifactTitle(artifact: SkillArtifact): string {
    const labels: Record<string, string> = {
        campaign_draft_bundle: 'Campaign draft ready for review',
        campaign_brief: 'Campaign brief ready for Craig',
        competitor_watch_report: 'Competitive intelligence report',
        competitor_promo_watch_report: 'Competitor promo alert',
        menu_gap_analysis: 'Menu gap analysis',
        ops_memo: 'Daily ops briefing',
        diagnosis_report: 'Promo diagnosis report',
        account_tier_review: 'Retail account tier review',
        aging_risk_report: 'Inventory aging risk — action required',
        partner_velocity_report: 'Partner velocity analysis',
    };
    return labels[artifact.artifactType] ?? `${artifact.skillName} output ready`;
}

function notificationActions(posture: ApprovalPosture): string[] {
    switch (posture) {
        case 'draft_only':
            return ['approve', 'reject', 'request_revision'];
        case 'always_escalate':
            return ['approve', 'reject'];
        default:
            return ['acknowledge'];
    }
}
