/**
 * Email Domain Warm-up Service
 *
 * Manages a 28-day ramp-up schedule to build sender reputation
 * before bulk campaign sends. Prevents cold-send spam flags.
 *
 * Ramp-up curves:
 *   conservative: 50→200→1000→5000 (weekly steps)
 *   standard:     50→200→1000→5000 (3-day/7-day/14-day steps)
 *   aggressive:   100→500→2000→unlimited (shorter steps)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type WarmupScheduleType = 'conservative' | 'standard' | 'aggressive';

export interface WarmupStatus {
    active: boolean;
    startDate?: Date;
    scheduleType?: WarmupScheduleType;
    currentDay?: number;
    dailyLimit?: number;
    sentToday?: number;
    remainingToday?: number;
    percentComplete?: number;
    completesOn?: Date;
}

export interface WarmupLog {
    date: string; // YYYY-MM-DD
    sent: number;
    limit: number;
    orgId: string;
    updatedAt: Date;
}

// --------------------------------------------------------------------------
// Ramp-up curve definitions
// --------------------------------------------------------------------------

interface WarmupStep {
    maxDay: number;   // Last day this step applies (inclusive)
    dailyLimit: number;
}

const WARMUP_CURVES: Record<WarmupScheduleType, WarmupStep[]> = {
    conservative: [
        { maxDay: 7,  dailyLimit: 50 },
        { maxDay: 14, dailyLimit: 200 },
        { maxDay: 21, dailyLimit: 1_000 },
        { maxDay: 28, dailyLimit: 5_000 },
        { maxDay: Infinity, dailyLimit: Infinity },
    ],
    standard: [
        { maxDay: 3,  dailyLimit: 50 },
        { maxDay: 7,  dailyLimit: 200 },
        { maxDay: 14, dailyLimit: 1_000 },
        { maxDay: 21, dailyLimit: 5_000 },
        { maxDay: Infinity, dailyLimit: Infinity },
    ],
    aggressive: [
        { maxDay: 2,  dailyLimit: 100 },
        { maxDay: 5,  dailyLimit: 500 },
        { maxDay: 10, dailyLimit: 2_000 },
        { maxDay: Infinity, dailyLimit: Infinity },
    ],
};

export const WARMUP_DURATION_DAYS = 28;

// --------------------------------------------------------------------------
// Core functions
// --------------------------------------------------------------------------

/**
 * Get the daily send limit for today given a start date and schedule type.
 */
export function getDailyLimit(startDate: Date, scheduleType: WarmupScheduleType): number {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const curve = WARMUP_CURVES[scheduleType];

    for (const step of curve) {
        if (daysSinceStart <= step.maxDay) {
            return step.dailyLimit;
        }
    }

    return Infinity;
}

/**
 * Check if warm-up is still active (within 28-day window).
 */
export function isWarmupActive(startDate: Date): boolean {
    const now = new Date();
    const msElapsed = now.getTime() - startDate.getTime();
    const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
    return daysElapsed < WARMUP_DURATION_DAYS;
}

/**
 * Get today's date as YYYY-MM-DD (UTC).
 */
export function getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
}

// --------------------------------------------------------------------------
// Firestore CRUD
// --------------------------------------------------------------------------

/**
 * Get current warm-up status for an org.
 */
export async function getWarmupStatus(orgId: string): Promise<WarmupStatus> {
    try {
        const db = getAdminFirestore();
        const configDoc = await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('email_warmup')
            .get();

        if (!configDoc.exists) {
            return { active: false };
        }

        const config = configDoc.data()!;
        if (!config.active || !config.startDate) {
            return { active: false };
        }

        const startDate = config.startDate.toDate ? config.startDate.toDate() : new Date(config.startDate);
        const scheduleType = (config.scheduleType as WarmupScheduleType) || 'standard';
        const active = isWarmupActive(startDate);

        if (!active) {
            return { active: false };
        }

        const now = new Date();
        const currentDay = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const dailyLimit = getDailyLimit(startDate, scheduleType);
        const completesOn = new Date(startDate.getTime() + WARMUP_DURATION_DAYS * 24 * 60 * 60 * 1000);

        // Read today's log
        const todayKey = getTodayKey();
        const logDoc = await db
            .collection('tenants').doc(orgId)
            .collection('warmup_logs').doc(todayKey)
            .get();

        const sentToday = logDoc.exists ? (logDoc.data()?.sent || 0) : 0;
        const remainingToday = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - sentToday);
        const percentComplete = Math.min(100, Math.round((currentDay / WARMUP_DURATION_DAYS) * 100));

        return {
            active: true,
            startDate,
            scheduleType,
            currentDay,
            dailyLimit,
            sentToday,
            remainingToday,
            percentComplete,
            completesOn,
        };
    } catch (error) {
        logger.error('[EMAIL_WARMUP] getWarmupStatus failed', { error, orgId });
        return { active: false };
    }
}

/**
 * Start a new warm-up schedule for an org.
 */
export async function startWarmup(orgId: string, scheduleType: WarmupScheduleType = 'standard'): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const db = getAdminFirestore();
        await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('email_warmup')
            .set({
                active: true,
                startDate: new Date(),
                scheduleType,
                updatedAt: new Date(),
            });

        logger.info('[EMAIL_WARMUP] Warm-up started', { orgId, scheduleType });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EMAIL_WARMUP] startWarmup failed', { error, orgId });
        return { success: false, error: msg };
    }
}

/**
 * Pause/deactivate warm-up for an org.
 */
export async function pauseWarmup(orgId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminFirestore();
        await db
            .collection('tenants').doc(orgId)
            .collection('settings').doc('email_warmup')
            .set({ active: false, updatedAt: new Date() }, { merge: true });

        logger.info('[EMAIL_WARMUP] Warm-up paused', { orgId });
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
}

/**
 * Record sends for today. Call after batch sending.
 * Returns whether the daily limit has been reached.
 */
export async function recordWarmupSend(orgId: string, count: number): Promise<{
    success: boolean;
    limitReached: boolean;
    sentToday: number;
    dailyLimit: number;
}> {
    try {
        const status = await getWarmupStatus(orgId);
        if (!status.active) {
            return { success: true, limitReached: false, sentToday: 0, dailyLimit: Infinity };
        }

        const db = getAdminFirestore();
        const todayKey = getTodayKey();
        const logRef = db
            .collection('tenants').doc(orgId)
            .collection('warmup_logs').doc(todayKey);

        // Atomic increment
        const logDoc = await logRef.get();
        const currentSent = logDoc.exists ? (logDoc.data()?.sent || 0) : 0;
        const newSent = currentSent + count;
        const dailyLimit = status.dailyLimit ?? Infinity;

        await logRef.set({
            date: todayKey,
            sent: newSent,
            limit: dailyLimit === Infinity ? -1 : dailyLimit,
            orgId,
            updatedAt: new Date(),
        }, { merge: true });

        const limitReached = dailyLimit !== Infinity && newSent >= dailyLimit;

        if (limitReached) {
            logger.warn('[EMAIL_WARMUP] Daily limit reached', { orgId, sent: newSent, limit: dailyLimit });
        }

        return { success: true, limitReached, sentToday: newSent, dailyLimit };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EMAIL_WARMUP] recordWarmupSend failed', { error, orgId });
        return { success: false, limitReached: false, sentToday: 0, dailyLimit: Infinity };
    }
}

/**
 * Get warmup logs for the last N days.
 */
export async function getWarmupLogs(orgId: string, days = 14): Promise<WarmupLog[]> {
    try {
        const db = getAdminFirestore();
        const logs: WarmupLog[] = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const doc = await db
                .collection('tenants').doc(orgId)
                .collection('warmup_logs').doc(key)
                .get();

            if (doc.exists) {
                logs.push(doc.data() as WarmupLog);
            }
        }

        return logs.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        logger.error('[EMAIL_WARMUP] getWarmupLogs failed', { error, orgId });
        return [];
    }
}
