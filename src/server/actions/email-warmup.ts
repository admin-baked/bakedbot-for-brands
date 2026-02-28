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

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_LOG_DAYS = 90;
const MAX_WARMUP_SEND_COUNT = 10_000;
const WARMUP_SCHEDULE_TYPES: ReadonlySet<WarmupScheduleType> = new Set([
    'conservative',
    'standard',
    'aggressive',
]);

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocumentId(value: unknown): value is string {
    return typeof value === 'string' && DOCUMENT_ID_REGEX.test(value);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
    const intValue = Math.floor(parsed);
    return Math.min(max, Math.max(min, intValue));
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || null;
}

function assertValidScheduleType(scheduleType: unknown): asserts scheduleType is WarmupScheduleType {
    if (!WARMUP_SCHEDULE_TYPES.has(scheduleType as WarmupScheduleType)) {
        throw new Error('Invalid warmup schedule type');
    }
}

async function verifyWarmupOrgAccess(orgId: string): Promise<void> {
    if (!isValidDocumentId(orgId)) {
        throw new Error('orgId is required');
    }

    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const role = (user as { role?: string }).role;
    const actorOrgId = getActorOrgId(user);

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
export async function getEmailWarmupLogs(orgId: string, days = 14): Promise<WarmupLog[]> {
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

export { getDailyLimit, isWarmupActive };
