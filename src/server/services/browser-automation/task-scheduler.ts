/**
 * BakedBot AI in Chrome - Task Scheduler
 *
 * Schedules and manages recurring browser automation tasks.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { workflowRecorder } from './workflow-recorder';
import { browserSessionManager } from './session-manager';
import type {
  BrowserTask,
  BrowserTaskCreate,
  TaskSchedule,
  TaskStatus,
  WorkflowRunResult,
} from '@/types/browser-automation';

const TASKS_COLLECTION = 'browser_tasks';

// Simple cron-like patterns to next run time
const SCHEDULE_PATTERNS = {
  daily: (time: string, timezone: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  },
  weekly: (time: string, daysOfWeek: number[], timezone: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const currentDay = now.getDay();

    // Find next matching day
    let daysUntilNext = Infinity;
    for (const day of daysOfWeek) {
      let diff = day - currentDay;
      if (diff < 0) diff += 7;
      if (diff === 0) {
        // Same day, check if time has passed
        const todayAtTime = new Date(now);
        todayAtTime.setHours(hours, minutes, 0, 0);
        if (todayAtTime > now) {
          daysUntilNext = 0;
          break;
        }
        diff = 7;
      }
      if (diff < daysUntilNext) {
        daysUntilNext = diff;
      }
    }

    const next = new Date(now);
    next.setDate(next.getDate() + daysUntilNext);
    next.setHours(hours, minutes, 0, 0);
    return next;
  },
  monthly: (time: string, dayOfMonth: number, timezone: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setDate(dayOfMonth);
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  },
};

export class TaskScheduler {
  /**
   * Schedule a new browser task
   */
  async scheduleTask(
    userId: string,
    taskCreate: BrowserTaskCreate
  ): Promise<BrowserTask> {
    try {
      const now = Timestamp.now();
      const timezone = taskCreate.schedule.timezone || 'America/Los_Angeles';

      const schedule: TaskSchedule = {
        ...taskCreate.schedule,
        timezone,
      };

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(schedule);

      const task: Omit<BrowserTask, 'id'> = {
        userId,
        workflowId: taskCreate.workflowId,
        name: taskCreate.name,
        description: taskCreate.description,
        schedule,
        status: 'scheduled',
        enabled: taskCreate.enabled !== false,
        nextRunAt: nextRunAt ? Timestamp.fromDate(nextRunAt) : undefined,
        createdAt: now,
        updatedAt: now,
        runCount: 0,
      };

      const docRef = await getAdminFirestore().collection(TASKS_COLLECTION).add(task);

      logger.info('[TaskScheduler] Created task', {
        taskId: docRef.id,
        userId,
        name: taskCreate.name,
        nextRunAt: nextRunAt?.toISOString(),
      });

      return { id: docRef.id, ...task };
    } catch (error) {
      logger.error('[TaskScheduler] Failed to create task', { error, userId });
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    updates: Partial<Pick<BrowserTask, 'name' | 'description' | 'schedule' | 'enabled' | 'workflowId'>>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      const nextRunAt = this.calculateNextRun(updates.schedule);
      updateData.nextRunAt = nextRunAt ? Timestamp.fromDate(nextRunAt) : null;
    }

    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update(updateData);
    logger.info('[TaskScheduler] Updated task', { taskId });
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
      status: 'cancelled',
      enabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info('[TaskScheduler] Cancelled task', { taskId });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).delete();
    logger.info('[TaskScheduler] Deleted task', { taskId });
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<BrowserTask | null> {
    const doc = await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as BrowserTask;
  }

  /**
   * List tasks for user
   */
  async listTasks(userId: string, options?: { limit?: number }): Promise<BrowserTask[]> {
    let query = getAdminFirestore()
      .collection(TASKS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as BrowserTask));
  }

  /**
   * Get tasks due for execution
   */
  async getDueTasks(): Promise<BrowserTask[]> {
    const now = Timestamp.now();

    const snapshot = await getAdminFirestore()
      .collection(TASKS_COLLECTION)
      .where('status', '==', 'scheduled')
      .where('enabled', '==', true)
      .where('nextRunAt', '<=', now)
      .limit(10)
      .get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as BrowserTask));
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<WorkflowRunResult> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Mark as running
    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
      status: 'running',
      updatedAt: FieldValue.serverTimestamp(),
    });

    try {
      logger.info('[TaskScheduler] Executing task', { taskId, name: task.name });

      // Create a session for the task
      const sessionResult = await browserSessionManager.createSession(task.userId, {
        taskDescription: `Scheduled task: ${task.name}`,
      });

      if (!sessionResult.success || !sessionResult.data) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      const sessionId = sessionResult.data.id;
      let result: WorkflowRunResult;

      if (task.workflowId) {
        // Run the associated workflow
        result = await workflowRecorder.runWorkflow(task.workflowId, sessionId);
      } else {
        // No workflow - just mark as complete
        result = {
          workflowId: '',
          success: true,
          stepsCompleted: 0,
          totalSteps: 0,
          duration: 0,
        };
      }

      // End the session
      await browserSessionManager.endSession(sessionId);

      // Calculate next run time
      const nextRunAt = task.schedule.type === 'once'
        ? null
        : this.calculateNextRun(task.schedule);

      // Update task status
      await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
        status: result.success ? 'scheduled' : 'failed',
        lastRunAt: FieldValue.serverTimestamp(),
        nextRunAt: nextRunAt ? Timestamp.fromDate(nextRunAt) : null,
        result,
        runCount: FieldValue.increment(1),
        retryCount: result.success ? 0 : FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (task.schedule.type === 'once') {
        // Mark one-time tasks as completed
        await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
          status: 'completed',
        });
      }

      logger.info('[TaskScheduler] Task executed', {
        taskId,
        success: result.success,
        nextRunAt: nextRunAt?.toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('[TaskScheduler] Task execution failed', { error, taskId });

      // Update task status
      await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
        status: 'failed',
        lastRunAt: FieldValue.serverTimestamp(),
        result: {
          workflowId: task.workflowId || '',
          success: false,
          stepsCompleted: 0,
          totalSteps: 0,
          error: error instanceof Error ? error.message : 'Task failed',
          duration: 0,
        },
        retryCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      throw error;
    }
  }

  /**
   * Run a task immediately (manual trigger)
   */
  async runNow(taskId: string): Promise<WorkflowRunResult> {
    return this.executeTask(taskId);
  }

  /**
   * Enable a task
   */
  async enableTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');

    const nextRunAt = this.calculateNextRun(task.schedule);

    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
      enabled: true,
      status: 'scheduled',
      nextRunAt: nextRunAt ? Timestamp.fromDate(nextRunAt) : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[TaskScheduler] Enabled task', { taskId });
  }

  /**
   * Disable a task
   */
  async disableTask(taskId: string): Promise<void> {
    await getAdminFirestore().collection(TASKS_COLLECTION).doc(taskId).update({
      enabled: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[TaskScheduler] Disabled task', { taskId });
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: TaskSchedule): Date | null {
    if (schedule.type === 'once') {
      if (schedule.runAt) {
        return schedule.runAt.toDate();
      }
      return null;
    }

    const time = schedule.time || '09:00';
    const timezone = schedule.timezone || 'America/Los_Angeles';

    switch (schedule.type) {
      case 'daily':
        return SCHEDULE_PATTERNS.daily(time, timezone);

      case 'weekly':
        const daysOfWeek = schedule.daysOfWeek || [1]; // Default to Monday
        return SCHEDULE_PATTERNS.weekly(time, daysOfWeek, timezone);

      case 'monthly':
        const dayOfMonth = schedule.dayOfMonth || 1; // Default to 1st
        return SCHEDULE_PATTERNS.monthly(time, dayOfMonth, timezone);

      case 'cron':
        // For complex cron, we'd need a cron parser
        // For now, default to daily at the specified time
        return SCHEDULE_PATTERNS.daily(time, timezone);

      default:
        return null;
    }
  }
}

// Export singleton instance
export const taskScheduler = new TaskScheduler();
