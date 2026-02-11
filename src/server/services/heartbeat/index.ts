'use server';

/**
 * Heartbeat Service
 *
 * Proactive agent monitoring system inspired by OpenClaw.
 * Agents check in periodically and notify users of important events.
 *
 * Architecture:
 * - Cron job calls /api/cron/heartbeat every minute
 * - Service finds tenants due for heartbeat based on config
 * - Runs appropriate checks based on role (super_user, dispensary, brand)
 * - Dispatches notifications for non-OK results
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    HeartbeatConfig,
    HeartbeatCheckResult,
    HeartbeatExecutionRequest,
    HeartbeatExecutionResult,
    HeartbeatRole,
    HeartbeatCheckId,
    TenantHeartbeatConfig,
} from '@/types/heartbeat';
import { buildDefaultConfig, HEARTBEAT_CHECKS } from '@/types/heartbeat';
import type { HeartbeatCheckContext, HeartbeatCheckRegistry } from './types';
import { SUPER_USER_CHECKS } from './checks/super-user';
import { DISPENSARY_CHECKS } from './checks/dispensary';
import { BRAND_CHECKS } from './checks/brand';
import { PLAYBOOK_CHECKS } from './checks/playbooks';
import { dispatchNotifications } from './notifier';
import { integrateWithHiveMind } from './hive-mind-integration';

// =============================================================================
// CHECK REGISTRY
// =============================================================================

const ALL_CHECKS: HeartbeatCheckRegistry[] = [
    ...SUPER_USER_CHECKS,
    ...DISPENSARY_CHECKS,
    ...BRAND_CHECKS,
    ...PLAYBOOK_CHECKS,
];

function getChecksForRole(role: HeartbeatRole): HeartbeatCheckRegistry[] {
    const roleChecks = HEARTBEAT_CHECKS.filter(c => c.roles.includes(role)).map(c => c.id);
    return ALL_CHECKS.filter(c => roleChecks.includes(c.checkId));
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

function isWithinActiveHours(
    config: HeartbeatConfig,
    now: Date = new Date()
): boolean {
    // Get current hour in tenant's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: config.timezone || 'America/New_York',
    });
    const currentHour = parseInt(formatter.format(now), 10);

    // Check active hours
    const { start, end } = config.activeHours;
    if (start <= end) {
        // Normal range (e.g., 9-21)
        return currentHour >= start && currentHour < end;
    } else {
        // Overnight range (e.g., 22-7)
        return currentHour >= start || currentHour < end;
    }
}

function isInQuietHours(
    config: HeartbeatConfig,
    now: Date = new Date()
): boolean {
    if (!config.quietHours) return false;

    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: config.timezone || 'America/New_York',
    });
    const currentHour = parseInt(formatter.format(now), 10);

    const { start, end } = config.quietHours;
    if (start <= end) {
        return currentHour >= start && currentHour < end;
    } else {
        return currentHour >= start || currentHour < end;
    }
}

// =============================================================================
// CORE EXECUTION
// =============================================================================

/**
 * Execute heartbeat checks for a single tenant/user
 */
export async function executeHeartbeat(
    request: HeartbeatExecutionRequest
): Promise<HeartbeatExecutionResult> {
    const db = getAdminFirestore();
    const startedAt = new Date();
    const executionId = `hb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    logger.info('[Heartbeat] Starting execution', {
        executionId,
        tenantId: request.tenantId,
        role: request.role,
    });

    // Check active hours (unless forced)
    if (!request.force && !isWithinActiveHours(request.config)) {
        logger.debug('[Heartbeat] Outside active hours, skipping', {
            tenantId: request.tenantId,
        });

        return {
            executionId,
            tenantId: request.tenantId,
            role: request.role,
            startedAt,
            completedAt: new Date(),
            checksRun: 0,
            results: [],
            overallStatus: 'all_clear',
            notificationsSent: 0,
            suppressed: true,
        };
    }

    // Get checks for this role
    const roleChecks = getChecksForRole(request.role);
    const enabledCheckIds = new Set(request.config.enabledChecks);
    const checksToRun = roleChecks.filter(c => enabledCheckIds.has(c.checkId));

    // Build context
    const context: HeartbeatCheckContext = {
        tenantId: request.tenantId,
        userId: request.userId,
        timezone: request.config.timezone,
        sharedData: {},
    };

    // Run checks in parallel (with some grouping for efficiency)
    const results: HeartbeatCheckResult[] = [];

    const checkPromises = checksToRun.map(async (check) => {
        try {
            const result = await check.execute(context);
            if (result) {
                // Apply priority override if configured
                if (request.config.priorityOverrides?.[check.checkId]) {
                    result.priority = request.config.priorityOverrides[check.checkId];
                }
                return result;
            }
            return null;
        } catch (error) {
            logger.error('[Heartbeat] Check failed', {
                checkId: check.checkId,
                error,
            });
            return null;
        }
    });

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults.filter((r): r is HeartbeatCheckResult => r !== null));

    // Integrate with Hive Mind (Agent Bus, Letta Memory, Sleep-Time)
    let hiveMindIntegration = { agentBusMessages: 0, persistedToMemory: false, triggeredSleepTime: false };
    try {
        hiveMindIntegration = await integrateWithHiveMind(request.tenantId, request.role, results);
        logger.debug('[Heartbeat] Hive Mind integration complete', {
            executionId,
            agentBusMessages: hiveMindIntegration.agentBusMessages,
            persistedToMemory: hiveMindIntegration.persistedToMemory,
        });
    } catch (error) {
        logger.error('[Heartbeat] Hive Mind integration failed', { executionId, error });
    }

    // Determine overall status
    const hasAlerts = results.some(r => r.status === 'alert');
    const hasWarnings = results.some(r => r.status === 'warning');
    const hasErrors = results.some(r => r.status === 'error');

    const overallStatus = hasErrors
        ? 'has_errors'
        : hasAlerts
            ? 'has_alerts'
            : hasWarnings
                ? 'has_warnings'
                : 'all_clear';

    // Filter out OK results if we're suppressing all-clear
    const notifiableResults = request.config.suppressAllClear
        ? results.filter(r => r.status !== 'ok')
        : results;

    // Check quiet hours before sending notifications
    const inQuietHours = isInQuietHours(request.config);
    let notificationsSent = 0;
    let suppressed = false;

    if (notifiableResults.length > 0 && !inQuietHours) {
        // Only send urgent notifications during quiet hours
        const notifications = await dispatchNotifications(
            request.tenantId,
            request.userId,
            executionId,
            notifiableResults,
            request.config.channels
        );
        notificationsSent = notifications.filter(n => n.status === 'sent').length;
    } else if (notifiableResults.length > 0 && inQuietHours) {
        // In quiet hours - only send urgent
        const urgentResults = notifiableResults.filter(r => r.priority === 'urgent');
        if (urgentResults.length > 0) {
            const notifications = await dispatchNotifications(
                request.tenantId,
                request.userId,
                executionId,
                urgentResults,
                request.config.channels
            );
            notificationsSent = notifications.filter(n => n.status === 'sent').length;
        } else {
            suppressed = true;
        }
    } else {
        suppressed = true;
    }

    const completedAt = new Date();

    // Save execution record
    try {
        await db.collection('heartbeat_executions').doc(executionId).set({
            executionId,
            tenantId: request.tenantId,
            userId: request.userId,
            role: request.role,
            startedAt,
            completedAt,
            checksRun: checksToRun.length,
            resultsCount: results.length,
            notifiableCount: notifiableResults.length,
            overallStatus,
            notificationsSent,
            suppressed,
            durationMs: completedAt.getTime() - startedAt.getTime(),
            // Hive Mind integration metrics
            hiveMind: {
                agentBusMessages: hiveMindIntegration.agentBusMessages,
                persistedToMemory: hiveMindIntegration.persistedToMemory,
                triggeredSleepTime: hiveMindIntegration.triggeredSleepTime,
            },
        });
    } catch (error) {
        logger.error('[Heartbeat] Failed to save execution record', { error });
    }

    logger.info('[Heartbeat] Execution complete', {
        executionId,
        checksRun: checksToRun.length,
        resultsCount: results.length,
        notificationsSent,
        durationMs: completedAt.getTime() - startedAt.getTime(),
    });

    return {
        executionId,
        tenantId: request.tenantId,
        role: request.role,
        startedAt,
        completedAt,
        checksRun: checksToRun.length,
        results,
        overallStatus,
        notificationsSent,
        suppressed,
    };
}

// =============================================================================
// TENANT CONFIGURATION
// =============================================================================

/**
 * Get or create heartbeat config for a tenant
 */
export async function getTenantHeartbeatConfig(
    tenantId: string,
    role: HeartbeatRole
): Promise<TenantHeartbeatConfig | null> {
    const db = getAdminFirestore();

    try {
        const configRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat');

        const configSnap = await configRef.get();

        if (configSnap.exists) {
            return configSnap.data() as TenantHeartbeatConfig;
        }

        // Return null - will use defaults
        return null;
    } catch (error) {
        logger.error('[Heartbeat] Failed to get tenant config', { error, tenantId });
        return null;
    }
}

/**
 * Save heartbeat config for a tenant
 */
export async function saveTenantHeartbeatConfig(
    tenantId: string,
    role: HeartbeatRole,
    config: Partial<HeartbeatConfig>
): Promise<boolean> {
    const db = getAdminFirestore();

    try {
        const defaultConfig = buildDefaultConfig(role);
        const mergedConfig: TenantHeartbeatConfig = {
            ...defaultConfig,
            ...config,
            tenantId,
            role,
            enabled: config.enabledChecks !== undefined ? config.enabledChecks.length > 0 : true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set(mergedConfig, { merge: true });

        return true;
    } catch (error) {
        logger.error('[Heartbeat] Failed to save tenant config', { error, tenantId });
        return false;
    }
}

// =============================================================================
// BATCH PROCESSING (for cron job)
// =============================================================================

/**
 * Find all tenants due for heartbeat check
 */
export async function findDueTenants(): Promise<Array<{
    tenantId: string;
    userId: string;
    role: HeartbeatRole;
    config: HeartbeatConfig;
}>> {
    const db = getAdminFirestore();
    const now = new Date();
    const dueTenants: Array<{
        tenantId: string;
        userId: string;
        role: HeartbeatRole;
        config: HeartbeatConfig;
    }> = [];

    try {
        // Get all tenants with heartbeat enabled
        const tenantsSnap = await db
            .collection('tenants')
            .where('status', '==', 'active')
            .get();

        for (const doc of tenantsSnap.docs) {
            const tenant = doc.data();
            const tenantId = doc.id;

            // Get heartbeat config
            const configSnap = await db
                .collection('tenants')
                .doc(tenantId)
                .collection('settings')
                .doc('heartbeat')
                .get();

            // Determine role from tenant type
            let role: HeartbeatRole = 'dispensary';
            if (tenant.type === 'brand') role = 'brand';
            if (tenant.type === 'super_user' || tenant.isSuperAdmin) role = 'super_user';

            // Get config or defaults
            const config = configSnap.exists
                ? (configSnap.data() as TenantHeartbeatConfig)
                : buildDefaultConfig(role);

            // Check if enabled
            if (configSnap.exists && configSnap.data()?.enabled === false) {
                continue;
            }

            // Check if due based on interval and lastRun
            const lastRun = configSnap.data()?.lastRun?.toDate?.() || null;
            const intervalMs = (config.interval || 30) * 60 * 1000;

            if (lastRun && now.getTime() - lastRun.getTime() < intervalMs) {
                continue; // Not due yet
            }

            // Get primary user for notifications
            const primaryUserId = tenant.ownerId || tenant.primaryUserId || tenantId;

            dueTenants.push({
                tenantId,
                userId: primaryUserId,
                role,
                config,
            });
        }

        return dueTenants;
    } catch (error) {
        logger.error('[Heartbeat] Failed to find due tenants', { error });
        return [];
    }
}

/**
 * Process all due heartbeats (called by cron job)
 */
export async function processDueHeartbeats(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
}> {
    const db = getAdminFirestore();
    const dueTenants = await findDueTenants();

    logger.info('[Heartbeat] Processing due tenants', { count: dueTenants.length });

    let succeeded = 0;
    let failed = 0;

    // Process in batches to avoid overload
    const BATCH_SIZE = 5;
    for (let i = 0; i < dueTenants.length; i += BATCH_SIZE) {
        const batch = dueTenants.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
            batch.map(async ({ tenantId, userId, role, config }) => {
                try {
                    await executeHeartbeat({
                        tenantId,
                        userId,
                        role,
                        config,
                    });

                    // Update lastRun
                    await db
                        .collection('tenants')
                        .doc(tenantId)
                        .collection('settings')
                        .doc('heartbeat')
                        .set({ lastRun: new Date() }, { merge: true });

                    return true;
                } catch (error) {
                    logger.error('[Heartbeat] Tenant processing failed', { tenantId, error });
                    return false;
                }
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                succeeded++;
            } else {
                failed++;
            }
        }
    }

    return {
        processed: dueTenants.length,
        succeeded,
        failed,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { dispatchNotifications } from './notifier';
export type { HeartbeatCheckContext, HeartbeatCheckRegistry } from './types';
