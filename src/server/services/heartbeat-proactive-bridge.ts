import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckResult } from '@/types/heartbeat';
import {
    createInboxArtifactId,
    createInboxThreadId,
    type InboxArtifactProactiveMetadata,
} from '@/types/inbox';
import type { ProactiveSeverity, ProactiveTaskRecord, ProactiveWorkflowKey } from '@/types/proactive';
import { appendProactiveEvent } from './proactive-event-log';
import { recordProactiveOutcome } from './proactive-outcome-service';
import { getResolvedProactiveSnoozeHours, isProactiveWorkflowEnabled } from './proactive-settings';
import {
    attachProactiveTaskEvidence,
    createOrReuseProactiveTask,
    linkTaskToInbox,
    transitionProactiveTask,
} from './proactive-task-service';
import { upsertCommitment } from './proactive-commitment-service';

type SupportedHeartbeatBridgeCheckId =
    | 'birthday_today'
    | 'birthday_upcoming'
    | 'new_customer_surge';

interface HeartbeatBridgeCandidate {
    checkId: SupportedHeartbeatBridgeCheckId;
    workflowKey: ProactiveWorkflowKey;
    agentKey: string;
    threadKey: string;
    threadType: 'customer_health' | 'churn_risk' | 'performance';
    threadTitle: string;
    preview: string;
    taskTitle: string;
    taskSummary: string;
    severity: ProactiveSeverity;
    businessObjectType: string;
    businessObjectId: string;
    dedupeKey: string;
    dueAt: Date;
    commitmentTitle: string;
    artifactType: 'health_scorecard';
}

function getDateBucket(now: Date): string {
    return now.toISOString().slice(0, 10);
}

function getWeekBucket(now: Date): string {
    const copy = new Date(now);
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() - day + 1);
    return copy.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function getCountFromHeartbeatData(data: Record<string, unknown> | undefined): number {
    if (!data) {
        return 0;
    }

    const directCount = toNumber(data.count);
    if (directCount !== null) {
        return Math.max(0, Math.round(directCount));
    }

    const birthdays = Array.isArray(data.birthdays) ? data.birthdays.length : 0;
    const customers = Array.isArray(data.customers) ? data.customers.length : 0;
    const todayCount = toNumber(data.todayCount);

    if (todayCount !== null) {
        return Math.max(0, Math.round(todayCount));
    }

    return Math.max(birthdays, customers);
}

function clampSeverityFromCount(count: number, highThreshold: number): ProactiveSeverity {
    if (count >= highThreshold) {
        return 'high';
    }
    if (count >= 3) {
        return 'medium';
    }
    return 'low';
}

export function getHeartbeatBridgeCandidate(
    orgId: string,
    result: HeartbeatCheckResult,
    now: Date = new Date()
): HeartbeatBridgeCandidate | null {
    const data = result.data ?? {};
    const dateBucket = getDateBucket(now);
    const weekBucket = getWeekBucket(now);

    switch (result.checkId as SupportedHeartbeatBridgeCheckId) {
        case 'birthday_today': {
            const count = getCountFromHeartbeatData(data);
            if (count <= 0) {
                return null;
            }

            return {
                checkId: 'birthday_today',
                workflowKey: 'vip_retention_watch',
                agentKey: 'mrs_parker',
                threadKey: 'heartbeat_customer_occasions',
                threadType: 'customer_health',
                threadTitle: 'Customer Occasion Watch',
                preview: result.message,
                taskTitle: result.title,
                taskSummary: result.message,
                severity: clampSeverityFromCount(count, 5),
                businessObjectType: 'customer_segment',
                businessObjectId: 'birthdays_today',
                dedupeKey: `heartbeat:birthday_today:${orgId}:${dateBucket}`,
                dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                commitmentTitle: 'Review today\'s birthday outreach opportunities',
                artifactType: 'health_scorecard',
            };
        }
        case 'birthday_upcoming': {
            const count = getCountFromHeartbeatData(data);
            if (count <= 0) {
                return null;
            }

            return {
                checkId: 'birthday_upcoming',
                workflowKey: 'vip_retention_watch',
                agentKey: 'mrs_parker',
                threadKey: 'heartbeat_customer_occasions',
                threadType: 'customer_health',
                threadTitle: 'Customer Occasion Watch',
                preview: result.message,
                taskTitle: result.title,
                taskSummary: result.message,
                severity: clampSeverityFromCount(count, 8),
                businessObjectType: 'customer_segment',
                businessObjectId: 'birthdays_upcoming',
                dedupeKey: `heartbeat:birthday_upcoming:${orgId}:${weekBucket}`,
                dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
                commitmentTitle: 'Review upcoming birthday campaign opportunities',
                artifactType: 'health_scorecard',
            };
        }
        case 'new_customer_surge': {
            const todayCount = toNumber(data.todayCount);
            const weeklyAvg = toNumber(data.weeklyAvg);
            if (todayCount === null || todayCount <= 0) {
                return null;
            }

            const ratio = weeklyAvg && weeklyAvg > 0 ? todayCount / weeklyAvg : todayCount;
            const severity: ProactiveSeverity = ratio >= 3 || todayCount >= 10
                ? 'high'
                : todayCount >= 5
                    ? 'medium'
                    : 'low';

            return {
                checkId: 'new_customer_surge',
                workflowKey: 'daily_dispensary_health',
                agentKey: 'craig',
                threadKey: 'heartbeat_customer_growth',
                threadType: 'customer_health',
                threadTitle: 'Customer Growth Watch',
                preview: result.message,
                taskTitle: result.title,
                taskSummary: result.message,
                severity,
                businessObjectType: 'customer_growth',
                businessObjectId: 'new_customer_surge',
                dedupeKey: `heartbeat:new_customer_surge:${orgId}:${dateBucket}`,
                dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                commitmentTitle: 'Review new customer surge and acquisition follow-up',
                artifactType: 'health_scorecard',
            };
        }
        default:
            return null;
    }
}

function buildHeartbeatEvidence(result: HeartbeatCheckResult): Array<{ label: string; value: string }> {
    const data = result.data ?? {};
    const evidence: Array<{ label: string; value: string }> = [
        { label: 'Signal', value: result.title },
        { label: 'Summary', value: result.message },
    ];

    const count = getCountFromHeartbeatData(data);
    if (count > 0) {
        evidence.push({ label: 'Count', value: String(count) });
    }

    const weeklyAvg = toNumber(data.weeklyAvg);
    if (weeklyAvg !== null) {
        evidence.push({ label: 'Weekly avg', value: weeklyAvg.toFixed(1) });
    }

    return evidence;
}

function buildHeartbeatArtifactData(result: HeartbeatCheckResult): Record<string, unknown> {
    return {
        source: 'heartbeat',
        generatedAt: new Date().toISOString(),
        checkId: result.checkId,
        title: result.title,
        message: result.message,
        status: result.status,
        priority: result.priority,
        actionUrl: result.actionUrl,
        actionLabel: result.actionLabel,
        ...((result.data ?? {}) as Record<string, unknown>),
    };
}

async function safelyTransitionTask(
    task: ProactiveTaskRecord,
    nextStatus: Parameters<typeof transitionProactiveTask>[1],
    reason: string
): Promise<ProactiveTaskRecord> {
    try {
        return await transitionProactiveTask(task.id, nextStatus, reason);
    } catch (error) {
        logger.warn('[HeartbeatProactiveBridge] Proactive task transition skipped', {
            taskId: task.id,
            nextStatus,
            reason,
            error: error instanceof Error ? error.message : String(error),
        });
        return task;
    }
}

async function ensureHeartbeatBridgeThread(orgId: string, candidate: HeartbeatBridgeCandidate): Promise<string> {
    const db = getAdminFirestore();
    const existingThreads = await db
        .collection('inbox_threads')
        .where('orgId', '==', orgId)
        .limit(100)
        .get();

    const existing = existingThreads.docs.find(
        (doc) => doc.data()?.metadata?.heartbeatBridgeKey === candidate.threadKey
    );
    if (existing) {
        return existing.id;
    }

    const threadId = createInboxThreadId();
    await db.collection('inbox_threads').doc(threadId).set({
        id: threadId,
        orgId,
        userId: 'system',
        type: candidate.threadType,
        status: 'active',
        title: candidate.threadTitle,
        preview: candidate.preview,
        primaryAgent: candidate.agentKey,
        assignedAgents: [candidate.agentKey],
        artifactIds: [],
        messages: [],
        metadata: {
            heartbeatBridgeKey: candidate.threadKey,
            isProactiveThread: true,
            proactiveWorkflowKey: candidate.workflowKey,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    });

    return threadId;
}

async function upsertHeartbeatArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    candidate: HeartbeatBridgeCandidate;
    result: HeartbeatCheckResult;
    existingArtifactId?: string;
}): Promise<string> {
    const db = getAdminFirestore();
    const artifactId = input.existingArtifactId ?? createInboxArtifactId();
    const proactive: InboxArtifactProactiveMetadata = {
        taskId: input.taskId,
        workflowKey: input.candidate.workflowKey,
        severity: input.candidate.severity,
        evidence: buildHeartbeatEvidence(input.result),
        nextActionLabel: input.result.actionLabel || 'Review signal',
    };

    const payload = {
        id: artifactId,
        threadId: input.threadId,
        orgId: input.orgId,
        type: input.candidate.artifactType,
        status: 'draft',
        data: buildHeartbeatArtifactData(input.result),
        rationale: `Heartbeat proactively surfaced ${input.result.checkId} and converted it into a durable follow-up item.`,
        proactive,
        createdBy: 'system',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.existingArtifactId) {
        await db.collection('inbox_artifacts').doc(artifactId).update(payload);
    } else {
        await db.collection('inbox_artifacts').doc(artifactId).set({
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
        });
    }

    await db.collection('inbox_threads').doc(input.threadId).set({
        artifactIds: FieldValue.arrayUnion(artifactId),
        status: 'active',
        preview: input.result.message,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

export async function bridgeHeartbeatResultsToProactiveRuntime(
    orgId: string,
    results: HeartbeatCheckResult[]
): Promise<{ processed: number; skipped: number; taskIds: string[] }> {
    const taskIds: string[] = [];
    let processed = 0;
    let skipped = 0;

    for (const result of results) {
        const candidate = getHeartbeatBridgeCandidate(orgId, result);
        if (!candidate) {
            skipped += 1;
            continue;
        }

        const enabled = await isProactiveWorkflowEnabled(orgId, candidate.workflowKey);
        if (!enabled) {
            logger.info('[HeartbeatProactiveBridge] Workflow disabled for candidate', {
                orgId,
                checkId: candidate.checkId,
                workflowKey: candidate.workflowKey,
            });
            skipped += 1;
            continue;
        }

        try {
            let task = await createOrReuseProactiveTask({
                tenantId: orgId,
                organizationId: orgId,
                workflowKey: candidate.workflowKey,
                agentKey: candidate.agentKey,
                title: candidate.taskTitle,
                summary: candidate.taskSummary,
                severity: candidate.severity,
                businessObjectType: candidate.businessObjectType,
                businessObjectId: candidate.businessObjectId,
                dedupeKey: candidate.dedupeKey,
                dueAt: candidate.dueAt,
                createdBy: 'system',
            });

            task = await safelyTransitionTask(task, 'triaged', 'heartbeat_signal_detected');
            task = await safelyTransitionTask(task, 'investigating', 'heartbeat_signal_written_back');
            task = await safelyTransitionTask(task, 'draft_ready', 'heartbeat_signal_ready_for_review');

            const threadId = await ensureHeartbeatBridgeThread(orgId, candidate);
            const artifactId = await upsertHeartbeatArtifact({
                orgId,
                threadId,
                taskId: task.id,
                candidate,
                result,
                existingArtifactId: task.artifactId,
            });

            await linkTaskToInbox(task.id, { threadId, artifactId });

            await attachProactiveTaskEvidence(task.id, {
                taskId: task.id,
                tenantId: task.tenantId,
                evidenceType: `heartbeat_${candidate.checkId}`,
                refId: artifactId,
                payload: {
                    checkId: result.checkId,
                    title: result.title,
                    message: result.message,
                    status: result.status,
                    priority: result.priority,
                    actionUrl: result.actionUrl ?? null,
                    actionLabel: result.actionLabel ?? null,
                    data: result.data ?? {},
                },
            });

            await appendProactiveEvent({
                tenantId: task.tenantId,
                organizationId: task.organizationId,
                taskId: task.id,
                actorType: 'system',
                eventType: `heartbeat.${candidate.checkId}.bridged`,
                businessObjectType: candidate.businessObjectType,
                businessObjectId: candidate.businessObjectId,
                payload: {
                    threadId,
                    artifactId,
                    sourceStatus: result.status,
                    sourcePriority: result.priority,
                },
            });

            const snoozeHours = await getResolvedProactiveSnoozeHours(orgId);
            await upsertCommitment({
                tenantId: task.tenantId,
                organizationId: task.organizationId,
                taskId: task.id,
                commitmentType: 'follow_up',
                title: candidate.commitmentTitle,
                dueAt: new Date(Date.now() + snoozeHours * 60 * 60 * 1000),
                payload: {
                    threadId,
                    artifactId,
                    checkId: candidate.checkId,
                },
            });

            await recordProactiveOutcome({
                tenantId: task.tenantId,
                organizationId: task.organizationId,
                taskId: task.id,
                workflowKey: candidate.workflowKey,
                outcomeType: 'executed',
                payload: {
                    threadId,
                    artifactId,
                    checkId: candidate.checkId,
                },
            });

            processed += 1;
            taskIds.push(task.id);
        } catch (error) {
            skipped += 1;
            logger.error('[HeartbeatProactiveBridge] Failed to bridge heartbeat result', {
                orgId,
                checkId: candidate.checkId,
                workflowKey: candidate.workflowKey,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    logger.info('[HeartbeatProactiveBridge] Bridge run complete', {
        orgId,
        processed,
        skipped,
        taskIds,
    });

    return {
        processed,
        skipped,
        taskIds,
    };
}
