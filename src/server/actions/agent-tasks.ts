'use server';

/**
 * Agent Task Queue — Server Actions
 *
 * CRUD for `agent_tasks` Firestore collection. Designed for agent-to-agent
 * task handoff. Tasks are markdown-friendly so humans can read them in the
 * dashboard and agents can consume them via tools.
 *
 * Auth:
 * - createTask: any authenticated user OR cron/API with secret
 * - claimTask / completeTask / listTasks: super_user only
 * - createTaskInternal: server-only (no auth — for crons/agents)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    AgentTask,
    AgentTaskStatus,
    AgentTaskStoplight,
    TaskStep,
    TaskHumanFeedback,
    CreateAgentTaskInput,
} from '@/types/agent-task';
import { statusToStoplight } from '@/types/agent-task';

const COLLECTION = 'agent_tasks';

// ============================================================================
// INTERNAL (no auth — for crons, agents, API routes)
// ============================================================================

export async function createTaskInternal(
    input: CreateAgentTaskInput
): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const now = new Date().toISOString();

        const task: Omit<AgentTask, 'id'> = {
            title: input.title,
            body: input.body,
            status: 'open',
            stoplight: 'gray',
            priority: input.priority || 'normal',
            category: input.category || 'other',
            reportedBy: input.reportedBy,
            assignedTo: input.assignedTo || null,
            triggeredBy: input.triggeredBy,
            orgId: input.orgId,
            filePath: input.filePath,
            errorSnippet: input.errorSnippet,
            relatedCommit: input.relatedCommit,
            steps: [],
            // Revenue fields (optional)
            ...(input.goalId            && { goalId: input.goalId }),
            ...(input.businessAgent     && { businessAgent: input.businessAgent }),
            ...(input.playbookId        && { playbookId: input.playbookId }),
            ...(input.estimatedImpactUSD !== undefined && { estimatedImpactUSD: input.estimatedImpactUSD }),
            createdAt: now,
            updatedAt: now,
        };

        const ref = await db.collection(COLLECTION).add(task);

        logger.info('[AgentTasks] Task created', {
            taskId: ref.id,
            title: input.title,
            reportedBy: input.reportedBy,
            priority: task.priority,
        });

        return { success: true, taskId: ref.id };
    } catch (err) {
        logger.error('[AgentTasks] Failed to create task', {
            error: err instanceof Error ? err.message : String(err),
            title: input.title,
        });
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

// ============================================================================
// AUTHENTICATED ACTIONS (super_user)
// ============================================================================

export async function listAgentTasks(options?: {
    status?: AgentTaskStatus | AgentTaskStatus[];
    assignedTo?: string;
    limit?: number;
}): Promise<{ success: boolean; tasks: AgentTask[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        let query: FirebaseFirestore.Query = db.collection(COLLECTION);

        if (options?.status) {
            const statuses = Array.isArray(options.status) ? options.status : [options.status];
            query = query.where('status', 'in', statuses);
        }

        if (options?.assignedTo) {
            query = query.where('assignedTo', '==', options.assignedTo);
        }

        query = query.orderBy('createdAt', 'desc').limit(options?.limit || 50);

        const snap = await query.get();
        const tasks: AgentTask[] = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as AgentTask));

        return { success: true, tasks };
    } catch (err) {
        logger.error('[AgentTasks] Failed to list tasks', {
            error: err instanceof Error ? err.message : String(err),
        });
        return { success: true, tasks: [], error: err instanceof Error ? err.message : String(err) };
    }
}

export async function claimTask(
    taskId: string,
    claimedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = db.collection(COLLECTION).doc(taskId);
        const doc = await ref.get();

        if (!doc.exists) {
            return { success: false, error: 'Task not found' };
        }

        const data = doc.data() as AgentTask;
        if (data.status !== 'open') {
            return { success: false, error: `Task is ${data.status}, not open` };
        }

        const now = new Date().toISOString();
        await ref.update({
            status: 'claimed',
            assignedTo: claimedBy,
            claimedAt: now,
            updatedAt: now,
        });

        logger.info('[AgentTasks] Task claimed', { taskId, claimedBy });
        return { success: true };
    } catch (err) {
        logger.error('[AgentTasks] Failed to claim task', {
            error: err instanceof Error ? err.message : String(err),
            taskId,
        });
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

export async function updateTaskStatus(
    taskId: string,
    status: AgentTaskStatus,
    note?: { resolutionNote?: string; resolvedCommit?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = db.collection(COLLECTION).doc(taskId);
        const doc = await ref.get();

        if (!doc.exists) {
            return { success: false, error: 'Task not found' };
        }

        const now = new Date().toISOString();
        const update: Record<string, unknown> = {
            status,
            stoplight: statusToStoplight(status),
            updatedAt: now,
        };

        if (status === 'in_progress') {
            const current = doc.data() as AgentTask;
            if (!current.startedAt) update.startedAt = now;
        }

        if (status === 'done' || status === 'wont_fix') {
            update.resolvedAt = now;
        }

        if (note?.resolutionNote) {
            update.resolutionNote = note.resolutionNote;
        }
        if (note?.resolvedCommit) {
            update.resolvedCommit = note.resolvedCommit;
        }

        await ref.update(update);

        logger.info('[AgentTasks] Task status updated', { taskId, status });
        return { success: true };
    } catch (err) {
        logger.error('[AgentTasks] Failed to update task', {
            error: err instanceof Error ? err.message : String(err),
            taskId,
        });
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

// ============================================================================
// STOPLIGHT + STEP + FEEDBACK (server-only, no auth — for crons/agents)
// ============================================================================

/** Fetch a single task by ID */
export async function getTaskById(taskId: string): Promise<{ success: boolean; task?: AgentTask; error?: string }> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection(COLLECTION).doc(taskId).get();
        if (!doc.exists) return { success: false, error: 'Task not found' };
        return { success: true, task: { id: doc.id, ...doc.data() } as AgentTask };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Append a step to the task's step log and update the Slack card */
export async function logTaskStep(
    taskId: string,
    step: Omit<TaskStep, 'completedAt'> & { completedAt?: string },
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = db.collection(COLLECTION).doc(taskId);
        const doc = await ref.get();
        if (!doc.exists) return { success: false, error: 'Task not found' };

        const task = { id: doc.id, ...doc.data() } as AgentTask;
        const now = new Date().toISOString();
        const newStep: TaskStep = { ...step, completedAt: step.completedAt || now };
        const steps = [...(task.steps || []), newStep];

        await ref.update({ steps, updatedAt: now });

        // Fire-and-forget card update
        import('@/server/services/agent-task-notifications').then(({ updateTaskCard }) =>
            updateTaskCard({ ...task, steps })
        ).catch(() => undefined);

        return { success: true };
    } catch (err) {
        logger.error('[AgentTasks] Failed to log step', { taskId, error: err instanceof Error ? err.message : String(err) });
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Override the stoplight independently of status (e.g. agent signals blocking) */
export async function updateTaskStoplight(
    taskId: string,
    stoplight: AgentTaskStoplight,
    note?: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const update: Record<string, unknown> = { stoplight, updatedAt: new Date().toISOString() };
        if (note) update.resolutionNote = note;
        await db.collection(COLLECTION).doc(taskId).update(update);
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Submit human feedback and log it to agent_learning_log */
export async function submitTaskFeedback(
    taskId: string,
    feedback: TaskHumanFeedback,
): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        const ref = db.collection(COLLECTION).doc(taskId);
        const doc = await ref.get();
        if (!doc.exists) return { success: false, error: 'Task not found' };

        const task = { id: doc.id, ...doc.data() } as AgentTask;
        const now = new Date().toISOString();

        await ref.update({ humanFeedback: feedback, updatedAt: now });

        // Write to learning log
        import('@/server/services/agent-learning-loop').then(({ logAgentLearning }) =>
            logAgentLearning({
                agentId: task.assignedTo || task.reportedBy,
                action: task.title,
                result: feedback.rating === 'approved' ? 'success' :
                        feedback.rating === 'rejected' ? 'failure' : 'partial',
                category: task.category,
                reason: feedback.note || feedback.rating,
                orgId: task.orgId || null,
                metadata: { taskId, reviewedBy: feedback.reviewedBy, stoplight: task.stoplight },
            })
        ).catch(() => undefined);

        // Update Slack card to show feedback (no more buttons)
        import('@/server/services/agent-task-notifications').then(({ updateTaskCard }) =>
            updateTaskCard({ ...task, humanFeedback: feedback })
        ).catch(() => undefined);

        logger.info('[AgentTasks] Feedback submitted', { taskId, rating: feedback.rating });
        return { success: true };
    } catch (err) {
        logger.error('[AgentTasks] Failed to submit feedback', { taskId, error: err instanceof Error ? err.message : String(err) });
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Get all tasks grouped for the board, keyed by stoplight column */
export async function getAgentBoardTasks(): Promise<{
    success: boolean;
    columns: {
        gray: AgentTask[];
        yellow: AgentTask[];
        orange: AgentTask[];
        green: AgentTask[];
        red: AgentTask[];
    };
    total: number;
    error?: string;
}> {
    const empty: { gray: AgentTask[]; yellow: AgentTask[]; orange: AgentTask[]; green: AgentTask[]; red: AgentTask[] } = {
        gray: [], yellow: [], orange: [], green: [], red: [],
    };
    try {
        const db = getAdminFirestore();
        // Active tasks — all non-terminal + recent terminal
        // Note: no orderBy to avoid requiring composite index; sorted in-memory below
        const [active, recent] = await Promise.all([
            db.collection(COLLECTION)
                .where('status', 'in', ['open', 'claimed', 'in_progress', 'escalated'])
                .limit(100)
                .get(),
            db.collection(COLLECTION)
                .where('status', 'in', ['done', 'wont_fix'])
                .limit(30)
                .get(),
        ]);

        const columns = { ...empty };
        const pushTask = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const task = { id: doc.id, ...doc.data() } as AgentTask;
            const col = task.stoplight || statusToStoplight(task.status);
            if      (col === 'gray')   columns.gray.push(task);
            else if (col === 'yellow') columns.yellow.push(task);
            else if (col === 'orange') columns.orange.push(task);
            else if (col === 'green')  columns.green.push(task);
            else if (col === 'red')    columns.red.push(task);
        };

        active.docs.forEach(pushTask);
        recent.docs.forEach(pushTask);

        // Sort each column by createdAt desc in-memory
        const byCreatedDesc = (a: AgentTask, b: AgentTask) =>
            (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
        for (const col of Object.keys(columns) as (keyof typeof columns)[]) {
            columns[col].sort(byCreatedDesc);
        }

        return { success: true, columns, total: active.size + recent.size };
    } catch (err) {
        logger.error('[AgentTasks] Failed to get board tasks', { error: err instanceof Error ? err.message : String(err) });
        return { success: false, columns: empty, total: 0, error: err instanceof Error ? err.message : String(err) };
    }
}

/** Get the full task board as markdown — ready for dashboard or agent consumption */
export async function getTaskBoardMarkdown(): Promise<{ success: boolean; markdown: string; taskCount: number }> {
    try {
        const { renderTaskBoardMarkdown } = await import('@/types/agent-task');

        const [openResult, doneResult] = await Promise.all([
            listAgentTasks({ status: ['open', 'claimed', 'in_progress'], limit: 50 }),
            listAgentTasks({ status: ['done', 'wont_fix'], limit: 10 }),
        ]);

        const allTasks = [...(openResult.tasks || []), ...(doneResult.tasks || [])];
        const markdown = renderTaskBoardMarkdown(allTasks);

        return { success: true, markdown, taskCount: allTasks.length };
    } catch (err) {
        logger.error('[AgentTasks] Failed to render task board', {
            error: err instanceof Error ? err.message : String(err),
        });
        return { success: true, markdown: '# Agent Task Board\n\n*Error loading tasks.*', taskCount: 0 };
    }
}
