import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InboxArtifactProactiveMetadata, OutreachDraftData } from '@/types/inbox';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';
import type {
    ProactiveSeverity,
    ProactiveTaskRecord,
    ProactiveTaskStatus,
} from '@/types/proactive';
import {
    attachProactiveTaskEvidence,
    createOrReuseProactiveTask,
    linkTaskToInbox,
    transitionProactiveTask,
} from '@/server/services/proactive-task-service';
import { appendProactiveEvent } from '@/server/services/proactive-event-log';
import {
    listOpenCommitments,
    resolveCommitment,
    upsertCommitment,
} from '@/server/services/proactive-commitment-service';
import { recordProactiveOutcome } from '@/server/services/proactive-outcome-service';
import { isProactiveWorkflowEnabled } from '@/server/services/proactive-settings';

type CandidateSegment =
    | 'vip'
    | 'loyal'
    | 'high_value'
    | 'frequent'
    | 'at_risk'
    | 'slipping'
    | 'churned'
    | 'new';

interface VipRetentionCandidate {
    id: string;
    name: string;
    email: string;
    segment: CandidateSegment;
    retentionTier?: string;
    scoreTrend?: string;
    churnRiskLevel?: string;
    lifetimeValue: number;
    orderCount: number;
    daysSinceLastOrder: number;
}

export interface VipRetentionWatchSummary {
    success: boolean;
    orgId: string;
    candidatesEvaluated: number;
    targetedCustomers: number;
    skipped?: boolean;
    reason?: string;
    taskId?: string;
    threadId?: string;
    artifactId?: string;
    error?: string;
}

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function normalizeSegment(value: unknown): CandidateSegment {
    switch (value) {
        case 'vip':
        case 'loyal':
        case 'high_value':
        case 'frequent':
        case 'at_risk':
        case 'slipping':
        case 'churned':
            return value;
        default:
            return 'new';
    }
}

function resolveDisplayName(data: Record<string, unknown>, fallbackId: string): string {
    const composedName = [data.firstName, data.lastName]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .trim();

    const candidates = [
        data.displayName,
        composedName,
        data.firstName,
        data.email,
    ];

    const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return typeof match === 'string' ? match.trim() : fallbackId;
}

function getDaysSinceLastOrder(data: Record<string, unknown>): number {
    if (typeof data.daysSinceLastOrder === 'number' && Number.isFinite(data.daysSinceLastOrder)) {
        return Math.max(0, Math.floor(data.daysSinceLastOrder));
    }

    const lastOrderDate = toDate(data.lastOrderDate);
    if (!lastOrderDate) {
        return 999;
    }

    return Math.max(0, Math.floor((Date.now() - lastOrderDate.getTime()) / 86_400_000));
}

function isRetentionTarget(candidate: VipRetentionCandidate): boolean {
    // Include any repeat customer — even loyal/frequent are worth retaining for
    // smaller dispensaries where the VIP pool is limited.
    const highValue =
        candidate.segment === 'vip' ||
        candidate.segment === 'high_value' ||
        candidate.segment === 'loyal' ||
        candidate.segment === 'frequent' ||
        candidate.lifetimeValue >= 200;
    const needsAttention =
        candidate.daysSinceLastOrder >= 21 ||
        candidate.retentionTier === 'at_risk' ||
        candidate.retentionTier === 'dormant' ||
        candidate.scoreTrend === 'falling' ||
        candidate.churnRiskLevel === 'high' ||
        candidate.churnRiskLevel === 'critical' ||
        candidate.segment === 'at_risk' ||
        candidate.segment === 'slipping' ||
        candidate.segment === 'churned';

    return highValue && needsAttention;
}

function getSeverity(candidates: VipRetentionCandidate[]): ProactiveSeverity {
    const hasCritical = candidates.some(
        (candidate) => candidate.churnRiskLevel === 'critical' || candidate.retentionTier === 'dormant'
    );
    if (hasCritical) {
        return 'critical';
    }

    const totalLtv = candidates.reduce((sum, candidate) => sum + candidate.lifetimeValue, 0);
    if (candidates.length >= 8 || totalLtv >= 10000) {
        return 'high';
    }

    if (candidates.length >= 3 || totalLtv >= 3000) {
        return 'medium';
    }

    return 'low';
}

function getWeekBucket(now: Date): string {
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() - day + 1);
    return utc.toISOString().slice(0, 10);
}

function buildEvidence(candidates: VipRetentionCandidate[]): Array<{ label: string; value: string }> {
    const totalLtv = candidates.reduce((sum, candidate) => sum + candidate.lifetimeValue, 0);
    const maxInactivity = candidates.reduce((max, candidate) => Math.max(max, candidate.daysSinceLastOrder), 0);

    return [
        { label: 'Customers targeted', value: String(candidates.length) },
        { label: 'LTV at risk', value: `$${Math.round(totalLtv).toLocaleString()}` },
        { label: 'Longest inactivity', value: `${maxInactivity} days` },
    ];
}

function buildDraftData(candidates: VipRetentionCandidate[]): OutreachDraftData {
    return {
        channel: 'email',
        subject: "We miss you — come back to {{orgName}}",
        body: [
            'Hi {{firstName}},',
            '',
            "It's been a while since we've seen you at {{orgName}}, and we wanted to reach out personally.",
            '',
            "We appreciate your loyalty and put together a reason to come back this week — stop by or reply to this email and we'll take care of you.",
            '',
            'See you soon,',
            '{{orgName}}',
        ].join('\n'),
        htmlBody: [
            '<p>Hi {{firstName}},</p>',
            "<p>It's been a while since we've seen you at {{orgName}}, and we wanted to reach out personally.</p>",
            "<p>We appreciate your loyalty and put together a reason to come back this week — stop by or reply to this email and we'll take care of you.</p>",
            '<p>See you soon,<br />{{orgName}}</p>',
        ].join(''),
        targetSegments: Array.from(new Set(candidates.map((candidate) => candidate.segment))),
        targetCustomerIds: candidates.map((candidate) => candidate.id),
        estimatedRecipients: candidates.length,
        sendStatus: 'idle',
        complianceStatus: 'pending',
    };
}

function getSummary(candidates: VipRetentionCandidate[]): string {
    const totalLtv = candidates.reduce((sum, candidate) => sum + candidate.lifetimeValue, 0);
    return `${candidates.length} at-risk customer${candidates.length === 1 ? '' : 's'} identified for win-back, with $${Math.round(totalLtv).toLocaleString()} in lifetime value at risk.`;
}

async function safelyTransitionTask(
    task: ProactiveTaskRecord,
    nextStatus: ProactiveTaskStatus,
    reason: string
): Promise<ProactiveTaskRecord> {
    try {
        return await transitionProactiveTask(task.id, nextStatus, reason);
    } catch (error) {
        logger.warn('[VipRetentionWatch] Proactive task transition skipped', {
            taskId: task.id,
            nextStatus,
            reason,
            error: error instanceof Error ? error.message : String(error),
        });
        return task;
    }
}

async function ensureVipRetentionThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();

    if (existingThreadId) {
        const existingThread = await db.collection('inbox_threads').doc(existingThreadId).get();
        if (existingThread.exists) {
            return existingThreadId;
        }
    }

    const orgThreads = await db
        .collection('inbox_threads')
        .where('orgId', '==', orgId)
        .limit(50)
        .get();

    const existing = orgThreads.docs.find(
        (doc) => doc.data()?.metadata?.proactiveWorkflowKey === 'vip_retention_watch'
    );
    if (existing) {
        return existing.id;
    }

    const threadId = createInboxThreadId();
    await db.collection('inbox_threads').doc(threadId).set({
        id: threadId,
        orgId,
        userId: 'system',
        type: 'churn_risk',
        status: 'active',
        title: 'VIP Retention Watch',
        preview: 'Mrs. Parker is watching for at-risk VIPs',
        primaryAgent: 'mrs_parker',
        assignedAgents: ['mrs_parker', 'deebo'],
        artifactIds: [],
        messages: [],
        metadata: {
            proactiveWorkflowKey: 'vip_retention_watch',
            isProactiveThread: true,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    });

    return threadId;
}

async function upsertRetentionArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    severity: ProactiveSeverity;
    candidates: VipRetentionCandidate[];
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, severity, candidates, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();
    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'vip_retention_watch',
        severity,
        evidence: buildEvidence(candidates),
        requiresApproval: true,
        nextActionLabel: 'Review draft',
    };

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'outreach_draft',
        status: 'draft',
        data: buildDraftData(candidates),
        rationale: 'Proactive VIP retention draft created from weekly churn-risk scan.',
        proactive,
        createdBy: 'system',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (existingArtifactId) {
        await db.collection('inbox_artifacts').doc(artifactId).update(payload);
    } else {
        await db.collection('inbox_artifacts').doc(artifactId).set({
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
        });
    }

    await db.collection('inbox_threads').doc(threadId).set({
        artifactIds: FieldValue.arrayUnion(artifactId),
        status: 'active',
        preview: `${candidates.length} VIP retention draft${candidates.length === 1 ? '' : 's'} ready for review`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

async function loadVipRetentionCandidates(orgId: string): Promise<VipRetentionCandidate[]> {
    const db = getAdminFirestore();
    const snap = await db.collection('customers').where('orgId', '==', orgId).get();

    return snap.docs
        .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const email = typeof data.email === 'string' ? data.email.trim() : '';
            if (!email) {
                return null;
            }

            const candidate: VipRetentionCandidate = {
                id: doc.id,
                name: resolveDisplayName(data, doc.id),
                email,
                segment: normalizeSegment(data.segment),
                retentionTier: typeof data.retentionTier === 'string' ? data.retentionTier : undefined,
                scoreTrend: typeof data.scoreTrend === 'string' ? data.scoreTrend : undefined,
                churnRiskLevel: typeof data.churnRiskLevel === 'string' ? data.churnRiskLevel : undefined,
                lifetimeValue: typeof data.lifetimeValue === 'number'
                    ? data.lifetimeValue
                    : typeof data.totalSpent === 'number'
                        ? data.totalSpent
                        : 0,
                orderCount: typeof data.orderCount === 'number' ? data.orderCount : 0,
                daysSinceLastOrder: getDaysSinceLastOrder(data),
            };

            return isRetentionTarget(candidate) ? candidate : null;
        })
        .filter((candidate): candidate is VipRetentionCandidate => candidate !== null)
        .sort((left, right) => {
            if (right.lifetimeValue !== left.lifetimeValue) {
                return right.lifetimeValue - left.lifetimeValue;
            }
            return right.daysSinceLastOrder - left.daysSinceLastOrder;
        })
        .slice(0, 10);
}

export async function runVipRetentionWatch(orgId: string): Promise<VipRetentionWatchSummary> {
    try {
        const enabled = await isProactiveWorkflowEnabled(orgId, 'vip_retention_watch');
        if (!enabled) {
            logger.info('[VipRetentionWatch] Workflow disabled by proactive pilot settings', { orgId });
            return {
                success: true,
                orgId,
                candidatesEvaluated: 0,
                targetedCustomers: 0,
                skipped: true,
                reason: 'workflow_disabled',
            };
        }

        const candidates = await loadVipRetentionCandidates(orgId);
        if (candidates.length === 0) {
            logger.info('[VipRetentionWatch] No actionable VIP retention candidates', { orgId });
            return {
                success: true,
                orgId,
                candidatesEvaluated: 0,
                targetedCustomers: 0,
            };
        }

        const now = new Date();
        const weekBucket = getWeekBucket(now);
        const severity = getSeverity(candidates);
        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'vip_retention_watch',
            agentKey: 'mrs_parker',
            title: `VIP retention watch for week of ${weekBucket}`,
            summary: getSummary(candidates),
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `vip_retention:${orgId}:${weekBucket}`,
            dueAt: new Date(now.getTime() + 3 * 86_400_000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task, 'triaged', 'cohort_identified');
        task = await safelyTransitionTask(task, 'investigating', 'draft_preparation_started');
        task = await safelyTransitionTask(task, 'draft_ready', 'draft_prepared');

        const threadId = await ensureVipRetentionThread(orgId, task.threadId);
        const artifactId = await upsertRetentionArtifact({
            orgId,
            threadId,
            taskId: task.id,
            severity,
            candidates,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'vip_retention_candidates',
            refId: artifactId,
            payload: {
                weekBucket,
                targetedCustomers: candidates.map((candidate) => ({
                    id: candidate.id,
                    name: candidate.name,
                    segment: candidate.segment,
                    retentionTier: candidate.retentionTier ?? null,
                    daysSinceLastOrder: candidate.daysSinceLastOrder,
                    lifetimeValue: candidate.lifetimeValue,
                })),
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'vip_retention.draft_ready',
            businessObjectType: task.businessObjectType,
            businessObjectId: task.businessObjectId,
            payload: {
                artifactId,
                threadId,
                targetedCustomerIds: candidates.map((candidate) => candidate.id),
            },
        });

        const commitmentTitle = `Review VIP retention draft for week of ${weekBucket}`;
        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: commitmentTitle,
            dueAt: new Date(now.getTime() + 2 * 86_400_000),
            payload: {
                artifactId,
                threadId,
                targetedCustomerIds: candidates.map((candidate) => candidate.id),
            },
        });

        const openCommitments = await listOpenCommitments({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
        });
        for (const commitment of openCommitments) {
            if (commitment.title !== commitmentTitle) {
                await resolveCommitment(commitment.id, 'resolved');
            }
        }

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'vip_retention_watch',
            outcomeType: 'executed',
            payload: {
                artifactId,
                threadId,
                targetedCustomers: candidates.length,
            },
        });

        logger.info('[VipRetentionWatch] Draft synced to proactive runtime', {
            orgId,
            taskId: task.id,
            threadId,
            artifactId,
            targetedCustomers: candidates.length,
        });

        return {
            success: true,
            orgId,
            candidatesEvaluated: candidates.length,
            targetedCustomers: candidates.length,
            taskId: task.id,
            threadId,
            artifactId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[VipRetentionWatch] Failed to run workflow', { orgId, error: message });
        return {
            success: false,
            orgId,
            candidatesEvaluated: 0,
            targetedCustomers: 0,
            error: message,
        };
    }
}
