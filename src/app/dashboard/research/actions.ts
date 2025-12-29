'use server';

import { researchService } from "@/server/services/research-service";
import { revalidatePath } from "next/cache";

export async function createResearchTaskAction(userId: string, brandId: string, query: string) {
  try {
      const taskId = await researchService.createTask(userId, brandId, query);
      revalidatePath('/dashboard/research');
      return { success: true, taskId };
  } catch (error: any) {
      console.error("Failed to create research task:", error);
      return { success: false, error: error.message };
  }
}

export async function getResearchTasksAction(brandId: string) {
    try {
        const tasks = await researchService.getTasksByBrand(brandId);
        return { success: true, tasks };
    } catch (error: any) {
        console.error("Failed to fetch research tasks:", error);
        return { success: false, error: error.message };
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
            resultReportId: task.resultReportId,
            error: task.error
        };
    } catch (error: any) {
        console.error("Failed to fetch research task status:", error);
        return { success: false, error: error.message };
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
    } catch (error: any) {
        console.error("Failed to fetch research report:", error);
        return { success: false, error: error.message };
    }
}
