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
    CreateAgentTaskInput,
} from '@/types/agent-task';

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
            priority: input.priority || 'normal',
            category: input.category || 'other',
            reportedBy: input.reportedBy,
            assignedTo: input.assignedTo || null,
            filePath: input.filePath,
            errorSnippet: input.errorSnippet,
            relatedCommit: input.relatedCommit,
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
            updatedAt: now,
        };

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
