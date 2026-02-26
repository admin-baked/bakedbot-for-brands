'use server';

import { researchService } from "@/server/services/research-service";
import { requireUser } from "@/server/auth/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function createResearchTaskAction(query: string) {
  const user = await requireUser();
  const brandId = user.currentOrgId || user.brandId || user.uid;

  try {
      const taskId = await researchService.createTask(user.uid, brandId, query, user.email);
      revalidatePath('/dashboard/research');

      // Self-trigger: fire-and-forget so research starts in seconds (not waiting for Cloud Scheduler)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
          setImmediate(() => {
              fetch(`${appUrl}/api/jobs/research`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${cronSecret}` },
              }).catch((err) => {
                  logger.warn('[Research] Self-trigger fetch failed (Cloud Scheduler is fallback)', {
                      error: String(err),
                  });
              });
          });
      }

      return { success: true, taskId };
  } catch (error: unknown) {
      const err = error as Error;
      logger.error(`[Research] Failed to create research task: ${err.message}`);
      return { success: false, error: err.message };
  }
}

export async function getResearchTasksAction() {
    const user = await requireUser();
    const brandId = user.currentOrgId || user.brandId;

    try {
        let tasks;
        if (brandId) {
            tasks = await researchService.getTasksByBrand(brandId);
        } else {
            tasks = await researchService.getTasksByUser(user.uid);
        }
        return { success: true, tasks };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`[Research] Failed to fetch research tasks: ${err.message}`);
        return { success: false, error: err.message };
    }
}

/**
 * Get the status of a specific research task for real-time polling
 */
export async function getResearchTaskStatusAction(taskId: string) {
    try {
        const task = await researchService.getTask(taskId);
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        return {
            success: true,
            status: task.status,
            progress: task.progress,
            plan: task.plan,
            driveFileId: task.driveFileId,
            resultReportId: task.resultReportId,
            error: task.error
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`[Research] Failed to fetch research task status: ${err.message}`);
        return { success: false, error: err.message };
    }
}

/**
 * Get a completed research report
 */
export async function getResearchReportAction(reportId: string) {
    try {
        const report = await researchService.getReport(reportId);
        if (!report) {
            return { success: false, error: 'Report not found' };
        }
        return { success: true, report };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`[Research] Failed to fetch research report: ${err.message}`);
        return { success: false, error: err.message };
    }
}
