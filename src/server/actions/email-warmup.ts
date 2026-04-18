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
import type { WarmupStatus, WarmupLog, WarmupScheduleType } from '@/server/services/email-warmup-types';
import { requireUser } from '@/server/auth/auth';
import {
    type ActorContextLike,
    isSuperRole,
    isValidDocumentId,
    resolveActorOrgId,
} from '@/server/auth/actor-context';
import { logger } from '@/lib/logger';

// Removed re-export of Warmup types to avoid Turbopack reference errors

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_LOG_DAYS = 90;
const MAX_WARMUP_SEND_COUNT = 10_000;
const WARMUP_SCHEDULE_TYPES: ReadonlySet<WarmupScheduleType> = new Set([
    'conservative',
    'standard',
    'aggressive',
]);

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
    const intValue = Math.floor(parsed);
    return Math.min(max, Math.max(min, intValue));
}

function assertValidScheduleType(scheduleType: unknown): asserts scheduleType is WarmupScheduleType {
    if (!WARMUP_SCHEDULE_TYPES.has(scheduleType as WarmupScheduleType)) {
        throw new Error('Invalid warmup schedule type');
    }
}

async function verifyWarmupOrgAccess(orgId: string): Promise<void> {
    if (!DOCUMENT_ID_REGEX.test(orgId) || !isValidDocumentId(orgId)) {
        throw new Error('orgId is required');
    }

    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const role = (user as { role?: string }).role;
    const actorOrgId = resolveActorOrgId(user as ActorContextLike);

    if (isSuperRole(role)) {
        return;
    }

    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

/**
 * Get current warm-up status for the caller's org.
 */
export async function getMyWarmupStatus(orgId: string): Promise<any> {
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
        assertValidScheduleType(scheduleType);
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
export async function getEmailWarmupLogs(orgId: string, days = 14): Promise<any[]> {
    try {
        await verifyWarmupOrgAccess(orgId);
        const safeDays = clampInt(days, 1, MAX_LOG_DAYS, 14);
        return await getWarmupLogsInternal(orgId, safeDays);
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
        const safeCount = clampInt(count, 0, MAX_WARMUP_SEND_COUNT, 0);
        await verifyWarmupOrgAccess(orgId);
        return await recordWarmupSendInternal(orgId, safeCount);
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

// Removed re-exports of getDailyLimit and isWarmupActive to comply with 'use server' rules
