import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
    PROACTIVE_TASK_ALLOWED_TRANSITIONS,
    TERMINAL_PROACTIVE_TASK_STATUSES,
    type ProactiveSeverity,
    type ProactiveTaskEvidenceRecord,
    type ProactiveTaskRecord,
    type ProactiveTaskStatus,
    type ProactiveWorkflowKey,
} from '@/types/proactive';

export const PROACTIVE_TASKS_COLLECTION = 'proactive_tasks';
export const PROACTIVE_TASK_EVIDENCE_COLLECTION = 'proactive_task_evidence';

const DEFAULT_PRIORITY = 50;

function cloneDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
        return (value as { toDate: () => Date }).toDate();
    }
    return undefined;
}

function toTaskRecord(data: Record<string, unknown>, id: string): ProactiveTaskRecord {
    return {
        ...(data as Omit<ProactiveTaskRecord, 'id' | 'createdAt' | 'updatedAt' | 'dueAt' | 'resolvedAt'>),
        id,
        createdAt: cloneDate(data.createdAt) ?? new Date(),
        updatedAt: cloneDate(data.updatedAt) ?? new Date(),
        dueAt: cloneDate(data.dueAt),
        resolvedAt: cloneDate(data.resolvedAt),
    };
}

function toEvidenceRecord(data: Record<string, unknown>, id: string): ProactiveTaskEvidenceRecord {
    return {
        ...(data as Omit<ProactiveTaskEvidenceRecord, 'id' | 'createdAt'>),
        id,
        createdAt: cloneDate(data.createdAt) ?? new Date(),
    };
}

function isActiveTaskStatus(status: ProactiveTaskStatus): boolean {
    return !TERMINAL_PROACTIVE_TASK_STATUSES.includes(status);
}

function ensureTransitionAllowed(current: ProactiveTaskStatus, next: ProactiveTaskStatus): void {
    if (current === next) {
        return;
    }

    const allowed = PROACTIVE_TASK_ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
        throw new Error(`Invalid proactive task transition: ${current} -> ${next}`);
    }
}

export async function createOrReuseProactiveTask(input: {
    tenantId: string;
    organizationId: string;
    workflowKey: ProactiveWorkflowKey;
    agentKey: string;
    title: string;
    summary: string;
    severity: ProactiveSeverity;
    businessObjectType: string;
    businessObjectId: string;
    dedupeKey: string;
    priority?: number;
    dueAt?: Date;
    createdBy?: 'system' | 'agent' | 'user';
}): Promise<ProactiveTaskRecord> {
    const { firestore } = await createServerClient();

    const existingSnap = await firestore
        .collection(PROACTIVE_TASKS_COLLECTION)
        .where('tenantId', '==', input.tenantId)
        .where('dedupeKey', '==', input.dedupeKey)
        .limit(5)
        .get();

    const existingTask = existingSnap.docs
        .map((doc) => toTaskRecord(doc.data() as Record<string, unknown>, doc.id))
        .find((task) => isActiveTaskStatus(task.status));

    if (existingTask) {
        logger.info('[ProactiveTaskService] Reusing proactive task', {
            taskId: existingTask.id,
            tenantId: input.tenantId,
            workflowKey: existingTask.workflowKey,
            dedupeKey: input.dedupeKey,
        });
        return existingTask;
    }

    const docRef = firestore.collection(PROACTIVE_TASKS_COLLECTION).doc();
    const now = new Date();
    const task: ProactiveTaskRecord = {
        id: docRef.id,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        workflowKey: input.workflowKey,
        agentKey: input.agentKey,
        status: 'detected',
        priority: input.priority ?? DEFAULT_PRIORITY,
        severity: input.severity,
        title: input.title,
        summary: input.summary,
        businessObjectType: input.businessObjectType,
        businessObjectId: input.businessObjectId,
        dedupeKey: input.dedupeKey,
        dueAt: input.dueAt,
        createdBy: input.createdBy ?? 'system',
        createdAt: now,
        updatedAt: now,
    };

    await docRef.set(task);

    logger.info('[ProactiveTaskService] Created proactive task', {
        taskId: task.id,
        tenantId: task.tenantId,
        workflowKey: task.workflowKey,
        dedupeKey: task.dedupeKey,
    });

    return task;
}

export async function getProactiveTask(taskId: string): Promise<ProactiveTaskRecord | null> {
    if (!taskId) {
        return null;
    }

    const { firestore } = await createServerClient();
    const doc = await firestore.collection(PROACTIVE_TASKS_COLLECTION).doc(taskId).get();

    if (!doc.exists) {
        return null;
    }

    return toTaskRecord(doc.data() as Record<string, unknown>, doc.id);
}

export async function transitionProactiveTask(
    taskId: string,
    nextStatus: ProactiveTaskStatus,
    reason?: string
): Promise<ProactiveTaskRecord> {
    const { firestore } = await createServerClient();
    const docRef = firestore.collection(PROACTIVE_TASKS_COLLECTION).doc(taskId);
    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error(`Proactive task not found: ${taskId}`);
    }

    const existingTask = toTaskRecord(doc.data() as Record<string, unknown>, doc.id);
    ensureTransitionAllowed(existingTask.status, nextStatus);

    if (existingTask.status === nextStatus) {
        return existingTask;
    }

    const updatedAt = new Date();
    const resolvedAt = TERMINAL_PROACTIVE_TASK_STATUSES.includes(nextStatus) ? updatedAt : undefined;
    const patch: Partial<ProactiveTaskRecord> = {
        status: nextStatus,
        updatedAt,
        resolvedAt,
    };

    await docRef.update(patch);

    logger.info('[ProactiveTaskService] Transitioned proactive task', {
        taskId,
        from: existingTask.status,
        to: nextStatus,
        reason,
    });

    return {
        ...existingTask,
        ...patch,
    };
}

export async function attachProactiveTaskEvidence(
    taskId: string,
    evidence: Omit<ProactiveTaskEvidenceRecord, 'id' | 'createdAt'>
): Promise<ProactiveTaskEvidenceRecord> {
    const { firestore } = await createServerClient();
    const taskDoc = await firestore.collection(PROACTIVE_TASKS_COLLECTION).doc(taskId).get();

    if (!taskDoc.exists) {
        throw new Error(`Cannot attach evidence to missing proactive task: ${taskId}`);
    }

    const docRef = firestore.collection(PROACTIVE_TASK_EVIDENCE_COLLECTION).doc();
    const record: ProactiveTaskEvidenceRecord = {
        id: docRef.id,
        ...evidence,
        createdAt: new Date(),
    };

    await docRef.set(record);

    logger.info('[ProactiveTaskService] Attached proactive task evidence', {
        taskId,
        evidenceId: record.id,
        evidenceType: record.evidenceType,
    });

    return toEvidenceRecord(record as unknown as Record<string, unknown>, record.id);
}

export async function linkTaskToInbox(
    taskId: string,
    input: {
        threadId?: string;
        artifactId?: string;
        approvalId?: string;
        workflowExecutionId?: string;
    }
): Promise<void> {
    const { firestore } = await createServerClient();
    const docRef = firestore.collection(PROACTIVE_TASKS_COLLECTION).doc(taskId);
    const taskDoc = await docRef.get();

    if (!taskDoc.exists) {
        throw new Error(`Cannot link inbox data for missing proactive task: ${taskId}`);
    }

    const patch: Partial<ProactiveTaskRecord> = {
        updatedAt: new Date(),
    };

    if (input.threadId) {
        patch.threadId = input.threadId;
    }
    if (input.artifactId) {
        patch.artifactId = input.artifactId;
    }
    if (input.approvalId) {
        patch.approvalId = input.approvalId;
    }
    if (input.workflowExecutionId) {
        patch.workflowExecutionId = input.workflowExecutionId;
    }

    await docRef.update(patch);

    logger.info('[ProactiveTaskService] Linked proactive task to inbox/runtime refs', {
        taskId,
        threadId: input.threadId,
        artifactId: input.artifactId,
        approvalId: input.approvalId,
        workflowExecutionId: input.workflowExecutionId,
    });
}
