'use server';

/**
 * Heartbeat Server Actions
 *
 * CRUD operations for heartbeat configuration and manual triggers.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type {
    HeartbeatConfig,
    HeartbeatRole,
    HeartbeatCheckId,
    HeartbeatCheckResult,
    TenantHeartbeatConfig,
} from '@/types/heartbeat';
import {
    buildDefaultConfig,
    getChecksForRole,
    HEARTBEAT_CHECKS,
} from '@/types/heartbeat';
import {
    executeHeartbeat,
    getTenantHeartbeatConfig,
    saveTenantHeartbeatConfig,
} from '@/server/services/heartbeat';

// =============================================================================
// GET CONFIGURATION
// =============================================================================

/**
 * Get heartbeat configuration for the current user's tenant
 */
export async function getHeartbeatConfig(): Promise<{
    success: boolean;
    config?: TenantHeartbeatConfig;
    availableChecks?: typeof HEARTBEAT_CHECKS;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;
        const role = determineRole(user.role);

        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const defaultConfig = buildDefaultConfig(role);

        const config: TenantHeartbeatConfig = savedConfig || {
            ...defaultConfig,
            tenantId,
            role,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Get available checks for this role
        const availableChecks = HEARTBEAT_CHECKS.filter(c => c.roles.includes(role));

        return {
            success: true,
            config,
            availableChecks,
        };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get config', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get configuration',
        };
    }
}

// =============================================================================
// UPDATE CONFIGURATION
// =============================================================================

/**
 * Update heartbeat configuration
 */
export async function updateHeartbeatConfig(updates: {
    enabled?: boolean;
    interval?: number;
    activeHours?: { start: number; end: number };
    quietHours?: { start: number; end: number } | null;
    timezone?: string;
    enabledChecks?: HeartbeatCheckId[];
    channels?: ('dashboard' | 'email' | 'sms' | 'whatsapp' | 'push')[];
    suppressAllClear?: boolean;
}): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;
        const role = determineRole(user.role);

        // Validate updates
        if (updates.interval !== undefined && (updates.interval < 5 || updates.interval > 1440)) {
            return { success: false, error: 'Interval must be between 5 and 1440 minutes' };
        }

        if (updates.enabledChecks) {
            const validChecks = getChecksForRole(role).map(c => c.id);
            const invalidChecks = updates.enabledChecks.filter(id => !validChecks.includes(id));
            if (invalidChecks.length > 0) {
                return { success: false, error: `Invalid checks for role: ${invalidChecks.join(', ')}` };
            }
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set(
                {
                    ...updates,
                    role,
                    tenantId,
                    updatedAt: new Date(),
                },
                { merge: true }
            );

        return { success: true };
    } catch (error) {
        logger.error('[Heartbeat] Failed to update config', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update configuration',
        };
    }
}

// =============================================================================
// TOGGLE CHECK
// =============================================================================

/**
 * Toggle a specific check on/off
 */
export async function toggleHeartbeatCheck(
    checkId: HeartbeatCheckId,
    enabled: boolean
): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;
        const role = determineRole(user.role);

        // Get current config
        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const defaultConfig = buildDefaultConfig(role);
        const currentChecks = savedConfig?.enabledChecks || defaultConfig.enabledChecks;

        // Update checks
        let newChecks: HeartbeatCheckId[];
        if (enabled) {
            newChecks = [...new Set([...currentChecks, checkId])];
        } else {
            newChecks = currentChecks.filter(id => id !== checkId);
        }

        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set(
                {
                    enabledChecks: newChecks,
                    updatedAt: new Date(),
                },
                { merge: true }
            );

        return { success: true };
    } catch (error) {
        logger.error('[Heartbeat] Failed to toggle check', { error, checkId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle check',
        };
    }
}

// =============================================================================
// MANUAL TRIGGER
// =============================================================================

/**
 * Manually trigger a heartbeat check (for testing)
 */
export async function triggerHeartbeat(): Promise<{
    success: boolean;
    results?: HeartbeatCheckResult[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;
        const role = determineRole(user.role);

        // Get config
        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const config = savedConfig || buildDefaultConfig(role);

        // Execute with force flag
        const result = await executeHeartbeat({
            tenantId,
            userId: user.uid,
            role,
            config,
            force: true,
        });

        return {
            success: true,
            results: result.results,
        };
    } catch (error) {
        logger.error('[Heartbeat] Failed to trigger', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to trigger heartbeat',
        };
    }
}

// =============================================================================
// GET HISTORY
// =============================================================================

/**
 * Get recent heartbeat execution history
 */
export async function getHeartbeatHistory(limit: number = 20): Promise<{
    success: boolean;
    executions?: Array<{
        executionId: string;
        startedAt: Date;
        completedAt: Date;
        checksRun: number;
        resultsCount: number;
        overallStatus: string;
        notificationsSent: number;
    }>;
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;

        const db = getAdminFirestore();
        const snap = await db
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .orderBy('startedAt', 'desc')
            .limit(limit)
            .get();

        const executions = snap.docs.map(doc => {
            const data = doc.data();
            return {
                executionId: data.executionId,
                startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
                completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt),
                checksRun: data.checksRun || 0,
                resultsCount: data.resultsCount || 0,
                overallStatus: data.overallStatus || 'unknown',
                notificationsSent: data.notificationsSent || 0,
            };
        });

        return { success: true, executions };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get history', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get history',
        };
    }
}

// =============================================================================
// GET RECENT ALERTS
// =============================================================================

/**
 * Get recent heartbeat alerts (non-OK results)
 */
export async function getRecentAlerts(limit: number = 50): Promise<{
    success: boolean;
    alerts?: HeartbeatCheckResult[];
    error?: string;
}> {
    try {
        const user = await requireUser();
        const tenantId = user.orgId || user.brandId || user.uid;

        const db = getAdminFirestore();

        // Get recent notifications
        const snap = await db
            .collection('heartbeat_notifications')
            .where('tenantId', '==', tenantId)
            .where('status', '==', 'sent')
            .orderBy('sentAt', 'desc')
            .limit(limit)
            .get();

        const allResults: HeartbeatCheckResult[] = [];

        for (const doc of snap.docs) {
            const data = doc.data();
            if (data.results && Array.isArray(data.results)) {
                allResults.push(...data.results.filter((r: any) => r.status !== 'ok'));
            }
        }

        // Deduplicate by checkId and take most recent
        const seen = new Set<string>();
        const uniqueAlerts = allResults.filter(r => {
            if (seen.has(r.checkId)) return false;
            seen.add(r.checkId);
            return true;
        });

        return { success: true, alerts: uniqueAlerts };
    } catch (error) {
        logger.error('[Heartbeat] Failed to get alerts', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get alerts',
        };
    }
}

// =============================================================================
// HELPERS
// =============================================================================

function determineRole(userRole: string | undefined): HeartbeatRole {
    if (!userRole) return 'dispensary';

    if (userRole === 'super_user' || userRole === 'admin') {
        return 'super_user';
    }
    if (userRole === 'brand' || userRole === 'brand_admin' || userRole === 'brand_manager') {
        return 'brand';
    }
    return 'dispensary';
}
