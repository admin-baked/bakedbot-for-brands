'use server';

/**
 * GLM Settings Server Actions
 *
 * Server actions for GLM model provider management.
 * All actions gated by super_user role.
 */

import { requireSuperUser } from '@/server/auth/auth';
import {
    getGLMUsageStatus,
    setGLMProvider,
    type GLMUsageStatus,
} from '@/server/services/glm-usage';
import { logger } from '@/lib/logger';

// Re-export for UI
export type { GLMUsageStatus };

/**
 * Get current GLM usage status.
 * Returns usage data for display in dashboard.
 */
export async function getGLMUsageAction(): Promise<{
    success: boolean;
    data?: GLMUsageStatus;
    error?: string;
}> {
    try {
        await requireSuperUser();
        const status = await getGLMUsageStatus();
        return { success: true, data: status };
    } catch (error) {
        logger.error('[GLM Actions] Failed to get usage', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Set the active AI provider (GLM or Anthropic).
 *
 * Note: This only tracks the user's preference in Firestore.
 * Actual API switching is controlled by ZAI_API_KEY environment variable presence.
 */
export async function setGLMProviderAction(provider: 'glm' | 'anthropic'): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        await requireSuperUser();
        await setGLMProvider(provider);
        logger.info('[GLM Actions] Provider switched', { provider });
        return { success: true };
    } catch (error) {
        logger.error('[GLM Actions] Failed to set provider', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Update GLM cycle information.
 *
 * Used to manually update the monthly limit and reset cycle
 * when z.ai quota changes.
 */
export async function updateGLMCycleAction(limit?: number): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        await requireSuperUser();
        const { resetGLMCycle } = await import('@/server/services/glm-usage');
        await resetGLMCycle(limit);
        logger.info('[GLM Actions] Cycle updated', { limit });
        return { success: true };
    } catch (error) {
        logger.error('[GLM Actions] Failed to update cycle', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
