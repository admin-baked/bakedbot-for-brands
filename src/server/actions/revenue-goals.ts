'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { decomposeRevenueGoal } from '@/server/agents/marty-decomp';
import { createTaskInternal } from './agent-tasks';
import type { RevenueGoal, CreateRevenueGoalInput } from '@/types/revenue-goal';
import type { AgentTaskCategory, AgentTaskPriority } from '@/types/agent-task';

const COLLECTION = 'revenue_goals';

export async function getActiveRevenueGoals(): Promise<RevenueGoal[]> {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION)
        .where('status', 'in', ['active', 'draft'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RevenueGoal));
}

export async function getRevenueGoalById(id: string): Promise<RevenueGoal | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as RevenueGoal;
}

/**
 * Create a goal + immediately ask Marty to decompose it into tasks.
 * Called from the board UI "Set Revenue Goal" modal.
 */
export async function createGoalAndDecompose(
    input: CreateRevenueGoalInput
): Promise<{ success: true; goal: RevenueGoal } | { success: false; error: string }> {
    try {
        await requireSuperUser();
    } catch {
        return { success: false, error: 'Unauthorized' };
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // 1. Write draft goal immediately so UI can show it
    const goalRef = await db.collection(COLLECTION).add({
        ...input,
        status: 'draft',
        taskIds: [],
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
    });

    try {
        // 2. Marty decomposes the goal via Claude
        const decomp = await decomposeRevenueGoal(input, 0);

        // 3. Create all tasks in parallel
        const taskResults = await Promise.all(
            decomp.tasks.map(t =>
                createTaskInternal({
                    title: t.title,
                    body: `${t.body}\n\n**Rationale:** ${t.rationale}`,
                    priority: t.priority as AgentTaskPriority,
                    category: t.category as AgentTaskCategory,
                    reportedBy: 'marty',
                    assignedTo: t.businessAgent,
                    triggeredBy: 'agent',
                    goalId: goalRef.id,
                    businessAgent: t.businessAgent,
                    playbookId: t.playbookId ?? undefined,
                    estimatedImpactUSD: t.estimatedImpactUSD,
                })
            )
        );

        const taskIds = taskResults
            .filter(r => r.success && r.taskId)
            .map(r => r.taskId!);

        // 4. Activate goal with task IDs and decomp reasoning
        await goalRef.update({
            status: 'active',
            taskIds,
            estimatedTotalImpactUSD: decomp.estimatedTotalImpactUSD,
            decompositionReasoning: decomp.reasoning,
            updatedAt: new Date().toISOString(),
        });

        const goal = { id: goalRef.id, ...input, status: 'active' as const, taskIds, estimatedTotalImpactUSD: decomp.estimatedTotalImpactUSD, decompositionReasoning: decomp.reasoning, createdBy: 'user' as const, createdAt: now, updatedAt: new Date().toISOString() };

        logger.info('[REVENUE_GOALS] Goal created and decomposed', {
            goalId: goalRef.id,
            taskCount: taskIds.length,
            estimatedImpact: decomp.estimatedTotalImpactUSD,
        });

        return { success: true, goal };
    } catch (err) {
        // Goal exists as draft — don't delete, let user retry decomp
        logger.error('[REVENUE_GOALS] Decomposition failed after goal creation', { goalId: goalRef.id, error: String(err) });
        return { success: false, error: 'Goal saved but decomposition failed. Retry from the board.' };
    }
}

/**
 * Update currentMRR on all active goals. Called by billing webhooks + orchestrator.
 */
export async function syncCurrentMRR(currentMRR: number): Promise<void> {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION).where('status', '==', 'active').get();
    const now = new Date().toISOString();
    const batch = db.batch();

    for (const doc of snap.docs) {
        const goal = doc.data() as RevenueGoal;
        const update: Partial<RevenueGoal> = { currentMRR, updatedAt: now };
        if (currentMRR >= goal.targetMRR) {
            update.status = 'achieved';
            update.achievedAt = now;
        }
        batch.update(doc.ref, update);
    }

    await batch.commit();
    logger.info('[REVENUE_GOALS] MRR synced', { currentMRR, goalsUpdated: snap.size });
}

/**
 * Internal version — no auth. Called by orchestrator for autonomous spawning.
 */
export async function createGoalInternal(
    input: CreateRevenueGoalInput,
    existingTaskCount: number = 0
): Promise<{ goalId: string; taskIds: string[] }> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const goalRef = await db.collection(COLLECTION).add({
        ...input,
        status: 'draft',
        taskIds: [],
        createdBy: 'marty_auto',
        createdAt: now,
        updatedAt: now,
    });

    const decomp = await decomposeRevenueGoal(input, existingTaskCount);

    const taskResults = await Promise.all(
        decomp.tasks.map(t =>
            createTaskInternal({
                title: t.title,
                body: `${t.body}\n\n**Rationale:** ${t.rationale}`,
                priority: t.priority as AgentTaskPriority,
                category: t.category as AgentTaskCategory,
                reportedBy: 'marty',
                assignedTo: t.businessAgent,
                triggeredBy: 'agent',
                goalId: goalRef.id,
                businessAgent: t.businessAgent,
                playbookId: t.playbookId ?? undefined,
                estimatedImpactUSD: t.estimatedImpactUSD,
            })
        )
    );

    const taskIds = taskResults.filter(r => r.success && r.taskId).map(r => r.taskId!);

    await goalRef.update({
        status: 'active',
        taskIds,
        estimatedTotalImpactUSD: decomp.estimatedTotalImpactUSD,
        decompositionReasoning: decomp.reasoning,
        updatedAt: new Date().toISOString(),
    });

    logger.info('[REVENUE_GOALS] Auto goal created by Marty', { goalId: goalRef.id, taskCount: taskIds.length });
    return { goalId: goalRef.id, taskIds };
}
