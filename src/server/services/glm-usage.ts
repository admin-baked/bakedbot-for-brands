/**
 * GLM Usage Tracking Service
 *
 * Tracks GLM/z.ai API usage for monitoring and alerting.
 * Pattern follows Apollo credit tracking approach.
 *
 * Firestore: system_config/glm_usage
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// Firestore document path for GLM usage tracking
const GLM_USAGE_DOC_PATH = 'system_config/glm_usage';

// =============================================================================
// Types
// =============================================================================

export interface GLMUsageStatus {
    used: number;              // Total GLM calls/tokens this cycle
    limit: number;            // Monthly limit from z.ai (e.g., 1,000,000 tokens)
    remaining: number;          // Calculated (limit - used)
    cycleStart: number;         // Timestamp when current cycle started
    cycleEnd: number;           // Timestamp when cycle resets
    lastUpdated: number;         // Timestamp of last update
    percentUsed: number;        // (used / limit) * 100
    provider: 'glm' | 'anthropic';  // Currently active provider
}

// Default cycle limit (will be updated from z.ai API if available)
const DEFAULT_MONTHLY_LIMIT = 1_000_000_000; // 1B tokens (placeholder, adjust as needed

// =============================================================================
// Core: Read Usage Status
// =============================================================================

/**
 * Read current GLM usage from Firestore.
 * Initializes document if it doesn't exist.
 */
export async function getGLMUsageStatus(): Promise<GLMUsageStatus> {
    try {
        const db = getAdminFirestore();
        const doc = await db.doc(GLM_USAGE_DOC_PATH).get();

        if (!doc.exists) {
            // First call — initialize with default cycle
            const now = new Date();
            const cycleEnd = new Date(now);
            cycleEnd.setMonth(cycleEnd.getMonth() + 1); // Next month
            cycleEnd.setDate(1); // First day of next month

            const initial: GLMUsageStatus = {
                used: 0,
                limit: DEFAULT_MONTHLY_LIMIT,
                remaining: DEFAULT_MONTHLY_LIMIT,
                cycleStart: now.getTime(),
                cycleEnd: cycleEnd.getTime(),
                lastUpdated: now.getTime(),
                percentUsed: 0,
                provider: 'glm',
            };
            await db.doc(GLM_USAGE_DOC_PATH).set(initial);
            return initial;
        }

        const data = doc.data() as GLMUsageStatus;
        const used = data.used ?? 0;
        const limit = data.limit ?? DEFAULT_MONTHLY_LIMIT;

        return {
            used,
            limit,
            remaining: Math.max(0, limit - used),
            cycleStart: data.cycleStart,
            cycleEnd: data.cycleEnd,
            lastUpdated: data.lastUpdated ?? Date.now(),
            percentUsed: Math.round((used / limit) * 100),
            provider: data.provider ?? 'glm',
        };
    } catch (err) {
        logger.error('[GLM Usage] Failed to read usage status', { error: String(err) });
        // Return a safe default — don't block GLM calls
        return {
            used: 0,
            limit: DEFAULT_MONTHLY_LIMIT,
            remaining: DEFAULT_MONTHLY_LIMIT,
            cycleStart: Date.now(),
            cycleEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days default
            lastUpdated: Date.now(),
            percentUsed: 0,
            provider: 'glm',
        };
    }
}

// =============================================================================
// Core: Increment Usage
// =============================================================================

/**
 * Increment GLM usage counter in Firestore.
 * Called after each successful GLM API call.
 */
export async function incrementGLMUsage(count: number = 1): Promise<void> {
    try {
        const db = getAdminFirestore();
        const ref = db.doc(GLM_USAGE_DOC_PATH);
        const doc = await ref.get();

        if (!doc.exists) {
            await ref.set({
                used: count,
                limit: DEFAULT_MONTHLY_LIMIT,
                cycleStart: Date.now(),
                cycleEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
                lastUpdated: Date.now(),
                percentUsed: 0,
                provider: 'glm',
            });
        } else {
            const current = (doc.data()?.used ?? 0) + count;
            await ref.update({
                used: current,
                lastUpdated: Date.now(),
                percentUsed: Math.round((current / (doc.data()?.limit ?? DEFAULT_MONTHLY_LIMIT)) * 100),
            });
        }

        logger.info('[GLM Usage] Usage incremented', { count, newTotal: (doc.data()?.used ?? 0) + count });
    } catch (err) {
        logger.error('[GLM Usage] Failed to increment usage', { error: String(err) });
        // Don't throw — usage tracking shouldn't block GLM calls
    }
}

// =============================================================================
// Core: Set Provider (Switch GLM ↔ Anthropic)
// =============================================================================

/**
 * Set the active AI provider.
 * This tracks the user's selection but actual API switching
 * is controlled by the presence of ZAI_API_KEY environment variable.
 */
export async function setGLMProvider(provider: 'glm' | 'anthropic'): Promise<void> {
    try {
        const db = getAdminFirestore();
        const ref = db.doc(GLM_USAGE_DOC_PATH);

        await ref.update({
            provider,
            lastUpdated: Date.now(),
        });

        logger.info('[GLM Usage] Provider switched', { provider });
    } catch (err) {
        logger.error('[GLM Usage] Failed to set provider', { error: String(err) });
        throw err;
    }
}

// =============================================================================
// Core: Reset Cycle
// =============================================================================

/**
 * Reset the GLM usage cycle (called when monthly limit resets).
 * Typically this happens automatically when z.ai resets quotas.
 */
export async function resetGLMCycle(newLimit?: number): Promise<void> {
    try {
        const db = getAdminFirestore();
        const ref = db.doc(GLM_USAGE_DOC_PATH);

        const now = new Date();
        const nextCycleEnd = new Date(now);
        nextCycleEnd.setMonth(nextCycleEnd.getMonth() + 1);
        nextCycleEnd.setDate(1);

        const limit = newLimit ?? DEFAULT_MONTHLY_LIMIT;

        await ref.update({
            used: 0,
            limit,
            cycleStart: now.getTime(),
            cycleEnd: nextCycleEnd.getTime(),
            lastUpdated: now.getTime(),
            percentUsed: 0,
        });

        logger.info('[GLM Usage] Cycle reset', { limit });
    } catch (err) {
        logger.error('[GLM Usage] Failed to reset cycle', { error: String(err) });
        throw err;
    }
}

// =============================================================================
// Helper: Check Cycle Reset
// =============================================================================

/**
 * Check if the GLM cycle should be reset based on cycleEnd timestamp.
 * Returns true if cycle has ended.
 */
export function shouldResetCycle(cycleEnd: number): boolean {
    return Date.now() > cycleEnd;
}

// =============================================================================
// Helper: Calculate Days Until Reset
// =============================================================================

/**
 * Calculate days remaining until cycle reset.
 */
export function getDaysUntilReset(cycleEnd: number): number {
    const msUntilReset = cycleEnd - Date.now();
    return Math.max(0, Math.ceil(msUntilReset / (24 * 60 * 60 * 1000)));
}
