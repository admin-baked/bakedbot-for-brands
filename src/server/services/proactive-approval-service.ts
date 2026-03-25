/**
 * Proactive Approval Service (PRD §23)
 *
 * Manages the `proactive_approvals` Firestore collection.
 * Supports four policy modes:
 *   - none                  → no gate; execute immediately
 *   - auto_for_low_risk     → auto-approve severity=low; human for medium+
 *   - human_required        → always route to a human
 *   - compliance_then_human → Deebo compliance check first, then human
 *
 * Typical call chain:
 *   1. Workflow service calls `createProactiveApproval()` after `draft_ready`
 *   2. UI or agent resolves via `approveProactiveArtifact()` / `rejectProactiveArtifact()`
 *   3. `sendCampaignFromInbox` (or equivalent) calls `recordApprovalResolved()` on execution
 */

import { FieldValue } from 'firebase-admin/firestore';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type {
    ProactiveApprovalPolicyMode,
    ProactiveApprovalRecord,
    ProactiveApprovalStatus,
    ProactiveSeverity,
    ProactiveWorkflowKey,
} from '@/types/proactive';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function deserializeApproval(id: string, data: FirebaseFirestore.DocumentData): ProactiveApprovalRecord {
    return {
        id,
        taskId: data.taskId,
        tenantId: data.tenantId,
        organizationId: data.organizationId,
        workflowKey: data.workflowKey,
        artifactId: data.artifactId,
        policyMode: data.policyMode,
        status: data.status,
        severity: data.severity,
        compliancePassedAt: data.compliancePassedAt ? firestoreTimestampToDate(data.compliancePassedAt) ?? new Date() : undefined,
        resolvedBy: data.resolvedBy,
        resolvedAt: data.resolvedAt ? firestoreTimestampToDate(data.resolvedAt) ?? new Date() : undefined,
        rejectionReason: data.rejectionReason,
        payload: data.payload ?? {},
        createdAt: firestoreTimestampToDate(data.createdAt) ?? new Date(),
        updatedAt: firestoreTimestampToDate(data.updatedAt) ?? new Date(),
        expiresAt: data.expiresAt ? firestoreTimestampToDate(data.expiresAt) ?? new Date() : undefined,
    };
}

/**
 * Determine the initial status based on policy mode and severity.
 * `auto_for_low_risk` auto-approves low-severity tasks immediately.
 */
function resolveInitialStatus(
    policyMode: ProactiveApprovalPolicyMode,
    severity: ProactiveSeverity,
): ProactiveApprovalStatus {
    if (policyMode === 'none') return 'auto_approved';
    if (policyMode === 'auto_for_low_risk' && severity === 'low') return 'auto_approved';
    return 'pending';
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createProactiveApproval(input: {
    taskId: string;
    tenantId: string;
    organizationId: string;
    workflowKey: ProactiveWorkflowKey;
    artifactId?: string;
    policyMode: ProactiveApprovalPolicyMode;
    severity: ProactiveSeverity;
    payload?: Record<string, unknown>;
    /** How long until the approval expires (ms). Default: 7 days. */
    ttlMs?: number;
    /**
     * If provided, atomically writes `approvalId` back to this task document
     * in the same batch — eliminates a separate sequential Firestore write.
     */
    linkedTaskId?: string;
}): Promise<ProactiveApprovalRecord> {
    const db = getAdminFirestore();
    const id = `apr_${generateId()}`;
    const status = resolveInitialStatus(input.policyMode, input.severity);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.ttlMs ?? 7 * 86_400_000));

    const doc: Omit<ProactiveApprovalRecord, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
        updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
    } = {
        id,
        taskId: input.taskId,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        workflowKey: input.workflowKey,
        artifactId: input.artifactId,
        policyMode: input.policyMode,
        status,
        severity: input.severity,
        payload: input.payload ?? {},
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.linkedTaskId) {
        // Batch: write approval + back-link approvalId onto the task atomically
        const batch = db.batch();
        batch.set(db.collection('proactive_approvals').doc(id), doc);
        batch.update(db.collection('proactive_tasks').doc(input.linkedTaskId), {
            approvalId: id,
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
    } else {
        await db.collection('proactive_approvals').doc(id).set(doc);
    }

    logger.info('[ProactiveApproval] Created', {
        id, taskId: input.taskId, policyMode: input.policyMode, status,
    });

    return {
        ...doc,
        createdAt: now,
        updatedAt: now,
    } as ProactiveApprovalRecord;
}

export async function getProactiveApproval(approvalId: string): Promise<ProactiveApprovalRecord | null> {
    const db = getAdminFirestore();
    const doc = await db.collection('proactive_approvals').doc(approvalId).get();
    if (!doc.exists) return null;
    return deserializeApproval(doc.id, doc.data()!);
}

export async function listPendingApprovals(orgId: string): Promise<ProactiveApprovalRecord[]> {
    const db = getAdminFirestore();
    const snap = await db
        .collection('proactive_approvals')
        .where('organizationId', '==', orgId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    return snap.docs.map((d) => deserializeApproval(d.id, d.data()));
}

export async function approveProactiveArtifact(
    approvalId: string,
    resolvedBy: string,
): Promise<ProactiveApprovalRecord> {
    const db = getAdminFirestore();
    const ref = db.collection('proactive_approvals').doc(approvalId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error(`Approval ${approvalId} not found`);

    const current = deserializeApproval(doc.id, doc.data()!);
    if (current.status !== 'pending') {
        throw new Error(`Cannot approve approval in status '${current.status}'`);
    }

    await ref.update({
        status: 'approved',
        resolvedBy,
        resolvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[ProactiveApproval] Approved', { approvalId, resolvedBy });

    return { ...current, status: 'approved', resolvedBy, resolvedAt: new Date() };
}

export async function rejectProactiveArtifact(
    approvalId: string,
    resolvedBy: string,
    rejectionReason?: string,
): Promise<ProactiveApprovalRecord> {
    const db = getAdminFirestore();
    const ref = db.collection('proactive_approvals').doc(approvalId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error(`Approval ${approvalId} not found`);

    const current = deserializeApproval(doc.id, doc.data()!);
    if (current.status !== 'pending') {
        throw new Error(`Cannot reject approval in status '${current.status}'`);
    }

    await ref.update({
        status: 'rejected',
        resolvedBy,
        rejectionReason: rejectionReason ?? null,
        resolvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[ProactiveApproval] Rejected', { approvalId, resolvedBy, rejectionReason });

    return { ...current, status: 'rejected', resolvedBy, rejectionReason, resolvedAt: new Date() };
}

/**
 * Mark compliance as passed (for `compliance_then_human` policy).
 * Does NOT transition to approved — still requires human action after this.
 */
export async function markCompliancePassed(approvalId: string): Promise<void> {
    const db = getAdminFirestore();
    await db.collection('proactive_approvals').doc(approvalId).update({
        compliancePassedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info('[ProactiveApproval] Compliance passed', { approvalId });
}

/**
 * Expire stale pending approvals. Called periodically (or on read).
 * Returns the number of approvals expired.
 */
export async function expireStalePendingApprovals(orgId?: string): Promise<number> {
    const db = getAdminFirestore();
    const now = new Date();

    const base = db
        .collection('proactive_approvals')
        .where('status', '==', 'pending')
        .where('expiresAt', '<', now);

    const snap = await (orgId
        ? base.where('organizationId', '==', orgId)
        : base
    ).limit(100).get();
    if (snap.empty) return 0;

    const batch = db.batch();
    for (const doc of snap.docs) {
        batch.update(doc.ref, {
            status: 'expired',
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();

    logger.info('[ProactiveApproval] Expired stale approvals', { count: snap.size, orgId });
    return snap.size;
}

// ---------------------------------------------------------------------------
// Policy resolution helper
// ---------------------------------------------------------------------------

/**
 * Returns the effective approval policy for a workflow/org combination.
 * Defaults: `wholesale_availability_prep` → `human_required`; all others → `auto_for_low_risk`.
 */
export function resolveApprovalPolicy(
    workflowKey: ProactiveWorkflowKey,
    orgOverride?: ProactiveApprovalPolicyMode,
): ProactiveApprovalPolicyMode {
    if (orgOverride) return orgOverride;

    // Workflows that require explicit human sign-off before sending
    const humanRequired: ProactiveWorkflowKey[] = [
        'wholesale_availability_prep',
        'vip_retention_watch',
        'product_launch_prep',
        'retail_partner_outreach_watch',
    ];

    if (humanRequired.includes(workflowKey)) return 'human_required';
    return 'auto_for_low_risk';
}
