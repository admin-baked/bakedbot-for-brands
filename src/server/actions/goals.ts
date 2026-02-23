'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { OrgGoal, GoalMetric, SuggestedGoal } from '@/types/goals';
import { calculateGoalProgress, determineGoalStatus } from '@/types/goals';

/**
 * Verify user has access to goals for a given org.
 * Super Users bypass org membership check (platform-level goals).
 */
async function verifyGoalAccess(orgId: string): Promise<{ authorized: boolean; error?: string }> {
  const session = await requireUser();
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(session.uid).get();
  const userData = userDoc.data();

  // Super Users can manage goals for any org (including platform goals)
  const role = userData?.role as string | undefined;
  if (role === 'super_user' || role === 'super_admin') {
    return { authorized: true };
  }

  // Regular users must be org members
  if (!userData?.orgIds?.includes(orgId)) {
    return { authorized: false, error: 'Unauthorized: not a member of this organization' };
  }

  return { authorized: true };
}

/**
 * Create a new goal
 */
export async function createGoal(
  orgId: string,
  goal: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'>
): Promise<{ success: boolean; goalId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const now = new Date();
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const goalData: OrgGoal = {
      ...goal,
      id: goalId,
      createdAt: now,
      updatedAt: now,
      lastProgressUpdatedAt: now,
    };

    // Calculate initial progress
    goalData.progress = calculateGoalProgress(goalData.metrics);
    goalData.status = determineGoalStatus(
      goalData.progress,
      Math.floor((goalData.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    await db.collection('orgs').doc(orgId).collection('goals').doc(goalId).set(goalData);

    logger.info(`[createGoal] Goal created: ${goalId} for org ${orgId}`, {
      goalId,
      orgId,
      category: goal.category,
      timeframe: goal.timeframe,
    });

    return { success: true, goalId };
  } catch (error) {
    logger.error('[createGoal] Error creating goal:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to create goal' };
  }
}

/**
 * Get all goals for an organization
 */
export async function getOrgGoals(orgId: string): Promise<{
  success: boolean;
  goals?: OrgGoal[];
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const snapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('goals')
      .orderBy('endDate', 'desc')
      .get();

    const goals = snapshot.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastProgressUpdatedAt: data.lastProgressUpdatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
      } as OrgGoal;
    });

    return { success: true, goals };
  } catch (error) {
    logger.error('[getOrgGoals] Error fetching goals:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to fetch goals' };
  }
}

/**
 * Get active goals for an organization
 */
export async function getActiveGoals(orgId: string): Promise<{
  success: boolean;
  goals?: OrgGoal[];
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const snapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('goals')
      .where('status', '==', 'active')
      .get();

    const goals = snapshot.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastProgressUpdatedAt: data.lastProgressUpdatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
      } as OrgGoal;
    });

    return { success: true, goals };
  } catch (error) {
    logger.error('[getActiveGoals] Error fetching active goals:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to fetch active goals' };
  }
}

/**
 * Update goal progress metrics
 */
export async function updateGoalProgress(
  orgId: string,
  goalId: string,
  metrics: GoalMetric[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const goalRef = db.collection('orgs').doc(orgId).collection('goals').doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return { success: false, error: 'Goal not found' };
    }

    const goalData = goalDoc.data() as OrgGoal;
    const now = new Date();

    // Update metrics
    const updatedMetrics = metrics.map(metric => ({
      ...metric,
      // Preserve baseline and target from original
      baselineValue: goalData.metrics.find(m => m.key === metric.key)?.baselineValue || metric.baselineValue,
      targetValue: goalData.metrics.find(m => m.key === metric.key)?.targetValue || metric.targetValue,
    }));

    // Recalculate progress
    const progress = calculateGoalProgress(updatedMetrics);
    const daysRemaining = Math.floor((goalData.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const status = determineGoalStatus(progress, daysRemaining);

    await goalRef.update({
      metrics: updatedMetrics,
      progress,
      status,
      updatedAt: now,
      lastProgressUpdatedAt: now,
    });

    logger.info(`[updateGoalProgress] Goal progress updated: ${goalId}`, {
      goalId,
      orgId,
      progress,
      status,
    });

    return { success: true };
  } catch (error) {
    logger.error('[updateGoalProgress] Error updating goal progress:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to update goal progress' };
  }
}

/**
 * Update goal status
 */
export async function updateGoalStatus(
  orgId: string,
  goalId: string,
  status: OrgGoal['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const goalRef = db.collection('orgs').doc(orgId).collection('goals').doc(goalId);
    const now = new Date();

    await goalRef.update({
      status,
      updatedAt: now,
    });

    logger.info(`[updateGoalStatus] Goal status updated: ${goalId}`, {
      goalId,
      orgId,
      status,
    });

    return { success: true };
  } catch (error) {
    logger.error('[updateGoalStatus] Error updating goal status:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to update goal status' };
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(orgId: string, goalId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    await db.collection('orgs').doc(orgId).collection('goals').doc(goalId).delete();

    logger.info(`[deleteGoal] Goal deleted: ${goalId}`, {
      goalId,
      orgId,
    });

    return { success: true };
  } catch (error) {
    logger.error('[deleteGoal] Error deleting goal:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to delete goal' };
  }
}

/**
 * Activate a goal (mark as active, create BrandObjective for agent integration)
 */
export async function activateGoal(orgId: string, goalId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const goalRef = db.collection('orgs').doc(orgId).collection('goals').doc(goalId);
    const goalDoc = await goalRef.get();

    if (!goalDoc.exists) {
      return { success: false, error: 'Goal not found' };
    }

    const goalData = goalDoc.data() as OrgGoal;
    const now = new Date();

    // Update goal to active
    await goalRef.update({
      status: 'active',
      updatedAt: now,
    });

    // TODO: Phase 3 — Create/update BrandObjective in BrandDomainMemory for agent integration
    // For now, just log that this will be synced
    logger.info(`[activateGoal] Goal activated: ${goalId}`, {
      goalId,
      orgId,
      title: goalData.title,
    });

    return { success: true };
  } catch (error) {
    logger.error('[activateGoal] Error activating goal:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to activate goal' };
  }
}

/**
 * Mark goal as achieved
 */
export async function achieveGoal(orgId: string, goalId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const access = await verifyGoalAccess(orgId);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    const goalRef = db.collection('orgs').doc(orgId).collection('goals').doc(goalId);
    const now = new Date();

    await goalRef.update({
      status: 'achieved',
      progress: 100,
      updatedAt: now,
    });

    logger.info(`[achieveGoal] Goal achieved: ${goalId}`, {
      goalId,
      orgId,
    });

    return { success: true };
  } catch (error) {
    logger.error('[achieveGoal] Error marking goal as achieved:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    return { success: false, error: 'Failed to mark goal as achieved' };
  }
}
