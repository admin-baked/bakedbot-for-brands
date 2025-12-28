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
