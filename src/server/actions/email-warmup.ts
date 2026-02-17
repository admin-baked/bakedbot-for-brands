'use server';

/**
 * Email Warm-up Server Actions
 *
 * Wrappers for client → server communication for email warm-up config.
 * Uses email-warmup service internally.
 */

import {
    getWarmupStatus,
    startWarmup,
    pauseWarmup,
    getWarmupLogs,
    recordWarmupSend,
    getDailyLimit,
    isWarmupActive,
} from '@/server/services/email-warmup';
import type { WarmupStatus, WarmupLog, WarmupScheduleType } from '@/server/services/email-warmup';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export type { WarmupStatus, WarmupLog, WarmupScheduleType };

/**
 * Get current warm-up status for the caller's org.
 */
export async function getMyWarmupStatus(orgId: string): Promise<WarmupStatus> {
    try {
        return await getWarmupStatus(orgId);
    } catch (error) {
        logger.error('[WARMUP_ACTION] getMyWarmupStatus failed', { error });
        return { active: false };
    }
}

/**
 * Start email warm-up for the caller's org.
 */
export async function startEmailWarmup(
    orgId: string,
    scheduleType: WarmupScheduleType = 'standard'
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser(['dispensary', 'brand', 'super_user']);
        return await startWarmup(orgId, scheduleType);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Pause email warm-up for the caller's org.
 */
export async function pauseEmailWarmup(orgId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireUser(['dispensary', 'brand', 'super_user']);
        return await pauseWarmup(orgId);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Get warm-up send logs for the last N days.
 */
export async function getEmailWarmupLogs(orgId: string, days = 14): Promise<WarmupLog[]> {
    return getWarmupLogs(orgId, days);
}

export { getDailyLimit, isWarmupActive, recordWarmupSend };
