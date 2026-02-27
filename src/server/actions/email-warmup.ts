'use server';

/**
 * Email Warm-up Server Actions
 *
 * Wrappers for client → server communication for email warm-up config.
 * Uses email-warmup service internally.
 */

import {
    getWarmupStatus as getWarmupStatusInternal,
    startWarmup as startWarmupInternal,
    pauseWarmup as pauseWarmupInternal,
    getWarmupLogs as getWarmupLogsInternal,
    recordWarmupSend as recordWarmupSendInternal,
    getDailyLimit,
    isWarmupActive,
} from '@/server/services/email-warmup';
import type { WarmupStatus, WarmupLog, WarmupScheduleType } from '@/server/services/email-warmup';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export type { WarmupStatus, WarmupLog, WarmupScheduleType };

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        uid?: string;
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.uid || null;
}

async function verifyWarmupOrgAccess(orgId: string): Promise<void> {
    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const role = (user as { role?: string }).role;
    const actorOrgId = getActorOrgId(user);

    if (!isSuperRole(role) && actorOrgId && actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

/**
 * Get current warm-up status for the caller's org.
 */
export async function getMyWarmupStatus(orgId: string): Promise<WarmupStatus> {
    try {
        await verifyWarmupOrgAccess(orgId);
        return await getWarmupStatusInternal(orgId);
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
        await verifyWarmupOrgAccess(orgId);
        return await startWarmupInternal(orgId, scheduleType);
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
        await verifyWarmupOrgAccess(orgId);
        return await pauseWarmupInternal(orgId);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Get warm-up send logs for the last N days.
 */
export async function getEmailWarmupLogs(orgId: string, days = 14): Promise<WarmupLog[]> {
    try {
        await verifyWarmupOrgAccess(orgId);
        return await getWarmupLogsInternal(orgId, days);
    } catch (error) {
        logger.error('[WARMUP_ACTION] getEmailWarmupLogs failed', { error });
        return [];
    }
}

export async function recordWarmupSend(orgId: string, count: number): Promise<{
    success: boolean;
    limitReached: boolean;
    sentToday: number;
    dailyLimit: number;
}> {
    try {
        await verifyWarmupOrgAccess(orgId);
        return await recordWarmupSendInternal(orgId, count);
    } catch (error) {
        logger.error('[WARMUP_ACTION] recordWarmupSend failed', { error });
        return {
            success: false,
            limitReached: false,
            sentToday: 0,
            dailyLimit: Infinity,
        };
    }
}

export { getDailyLimit, isWarmupActive };
