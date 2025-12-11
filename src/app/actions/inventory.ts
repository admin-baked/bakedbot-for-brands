'use server';

import { iheartService } from "@/server/services/iheart";
import { revalidatePath } from "next/cache";

export async function syncInventoryAction(orgId: string): Promise<{ success: boolean; count: number; error?: string }> {
    if (!orgId) {
        return { success: false, count: 0, error: "Organization ID is required" };
    }

    try {
        const result = await iheartService.syncMenu(orgId);

        if (result.success) {
            revalidatePath(`/dashboard/inventory`);
        }

        return result;
    } catch (error) {
        console.error("Failed to sync inventory:", error);
        return { success: false, count: 0, error: String(error) };
    }
}
