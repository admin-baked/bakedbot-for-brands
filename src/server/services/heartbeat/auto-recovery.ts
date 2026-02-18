/**
 * Heartbeat Automatic Recovery Service
 *
 * Detects heartbeat failures and automatically recovers without user intervention.
 * - Runs independently via Cloud Scheduler (separate from manual heartbeat)
 * - Detects when heartbeat system is down
 * - Triggers immediate recovery for failed tenants
 * - Dispatches Linus agent for advanced recovery if needed
 * - Works 24/7 across all organizations and roles
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
    checkSystemHeartbeatHealth,
    checkTenantHeartbeatHealth,
    logHeartbeatFailure,
    markHeartbeatRecovered,
} from './health-monitor';
import { executeHeartbeat, getTenantHeartbeatConfig } from './index';
import { buildDefaultConfig } from '@/types/heartbeat';
import type { HeartbeatRole } from '@/types/heartbeat';

export interface RecoveryResult {
    success: boolean;
    tenantId: string;
    recoveryMethod: string;
    message: string;
}

/**
 * Automatically recover a single tenant's heartbeat
 */
export async function recoverTenantHeartbeat(
    tenantId: string
): Promise<RecoveryResult> {
    const db = getAdminFirestore();

    try {
        logger.info('[Heartbeat Recovery] Starting recovery', { tenantId });

        // Get tenant info
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        if (!tenantSnap.exists) {
            return {
                success: false,
                tenantId,
                recoveryMethod: 'tenant_not_found',
                message: 'Tenant not found',
            };
        }

        const tenant = tenantSnap.data();

        // Determine role
        let role: HeartbeatRole = 'dispensary';
        if (tenant?.type === 'brand') role = 'brand';
        if (tenant?.type === 'super_user' || tenant?.isSuperAdmin) role = 'super_user';

        // Get config
        const config = await getTenantHeartbeatConfig(tenantId, role);
        const finalConfig = config || buildDefaultConfig(role);

        // Get primary user for notifications
        const primaryUserId = tenant?.ownerId || tenant?.primaryUserId || tenantId;

        // Execute heartbeat with force flag
        const result = await executeHeartbeat({
            tenantId,
            userId: primaryUserId,
            role,
            config: finalConfig,
            force: true, // Force execution regardless of active hours
        });

        // Mark as recovered
        await markHeartbeatRecovered(tenantId, 'automatic_recovery');

        logger.info('[Heartbeat Recovery] Recovery succeeded', {
            tenantId,
            executionId: result.executionId,
        });

        return {
            success: true,
            tenantId,
            recoveryMethod: 'automatic_recovery',
            message: 'Heartbeat recovered successfully',
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log the failure for Linus to investigate
        await logHeartbeatFailure(tenantId, 'automatic_recovery_failed', {
            error: errorMessage,
            timestamp: new Date(),
            requiresLinusIntervention: true,
        });

        logger.error('[Heartbeat Recovery] Recovery failed', {
            tenantId,
            error: errorMessage,
        });

        return {
            success: false,
            tenantId,
            recoveryMethod: 'automatic_recovery_failed',
            message: errorMessage,
        };
    }
}

/**
 * Run automatic recovery for all unhealthy tenants
 * Called by Cloud Scheduler periodically (e.g., every 5 minutes)
 */
export async function runAutomaticRecovery(): Promise<{
    checked: number;
    recovered: number;
    failed: number;
    linusDispatchNeeded: boolean;
}> {
    const db = getAdminFirestore();

    try {
        logger.info('[Heartbeat Auto-Recovery] Starting system-wide recovery');

        // Check system health
        const systemHealth = await checkSystemHeartbeatHealth();

        if (systemHealth.isSystemHealthy) {
            logger.info('[Heartbeat Auto-Recovery] System healthy, no recovery needed');
            return {
                checked: systemHealth.tenantStatuses.length,
                recovered: 0,
                failed: 0,
                linusDispatchNeeded: false,
            };
        }

        // Find unhealthy tenants
        const unhealthyTenants = systemHealth.tenantStatuses.filter(s => !s.isHealthy);

        logger.warn('[Heartbeat Auto-Recovery] Found unhealthy tenants', {
            count: unhealthyTenants.length,
            tenantIds: unhealthyTenants.map(s => s.tenantId),
        });

        // Attempt recovery for each unhealthy tenant
        let recovered = 0;
        let failed = 0;

        for (const tenant of unhealthyTenants) {
            const result = await recoverTenantHeartbeat(tenant.tenantId);
            if (result.success) {
                recovered++;
            } else {
                failed++;
            }
        }

        // If recovery failed, dispatch Linus agent
        const linusDispatchNeeded = failed > 0 || systemHealth.averageFailureRate > 0.5;

        if (linusDispatchNeeded) {
            logger.error('[Heartbeat Auto-Recovery] Dispatching Linus agent', {
                failedCount: failed,
                failureRate: systemHealth.averageFailureRate,
            });

            // Trigger Linus agent via playbook event
            await dispatchLinusHeartbeatFix(unhealthyTenants.map(s => s.tenantId));
        }

        return {
            checked: unhealthyTenants.length,
            recovered,
            failed,
            linusDispatchNeeded,
        };
    } catch (error) {
        logger.error('[Heartbeat Auto-Recovery] Recovery run failed', { error });

        // As a fallback, dispatch Linus
        await dispatchLinusHeartbeatFix([]);

        return {
            checked: 0,
            recovered: 0,
            failed: 0,
            linusDispatchNeeded: true,
        };
    }
}

/**
 * Dispatch Linus agent to investigate and fix heartbeat issues
 * Creates a playbook event that triggers Linus to run diagnostics
 */
async function dispatchLinusHeartbeatFix(failedTenantIds: string[]): Promise<void> {
    const db = getAdminFirestore();

    try {
        // Create a system-level playbook event for Linus
        const eventId = `heartbeat_fix_${Date.now()}`;

        await db.collection('playbook_events').doc(eventId).set({
            eventId,
            type: 'heartbeat_failure_detected',
            agentName: 'linus',
            priority: 'critical',
            status: 'pending',
            failedTenants: failedTenantIds,
            createdAt: new Date(),
            description: `Heartbeat system is offline across ${failedTenantIds.length} tenant(s). Linus needs to investigate and fix.`,
            actions: [
                {
                    action: 'heartbeat.diagnose',
                    params: { failedTenantIds },
                },
                {
                    action: 'heartbeat.recoverAll',
                    params: { tenantIds: failedTenantIds },
                },
                {
                    action: 'system.createAlert',
                    params: {
                        severity: 'critical',
                        title: 'Heartbeat System Offline',
                        message: `Heartbeat failed for ${failedTenantIds.length} tenant(s). Automatic recovery dispatched Linus.`,
                    },
                },
            ],
        });

        logger.info('[Heartbeat Linus Dispatch] Linus agent dispatched', {
            eventId,
            failedTenantCount: failedTenantIds.length,
        });
    } catch (error) {
        logger.error('[Heartbeat Linus Dispatch] Failed to dispatch Linus', { error });
    }
}

/**
 * Get recovery status for monitoring/debugging
 */
export async function getRecoveryStatus(): Promise<{
    lastRecoveryTime: Date | null;
    pendingRecoveries: number;
    successfulRecoveries24h: number;
    failedRecoveries24h: number;
}> {
    const db = getAdminFirestore();

    try {
        const last24hMs = 24 * 60 * 60 * 1000;
        const oneDayAgo = new Date(Date.now() - last24hMs);

        // Get recovery logs
        const logsSnap = await db
            .collection('heartbeat_failures')
            .where('timestamp', '>=', oneDayAgo)
            .limit(100)
            .get();

        const logs = logsSnap.docs.map(doc => doc.data());

        // Get pending recoveries
        const pendingSnap = await db
            .collection('playbook_events')
            .where('type', '==', 'heartbeat_failure_detected')
            .where('status', '==', 'pending')
            .limit(50)
            .get();

        return {
            lastRecoveryTime: logs.length > 0 ? new Date((logs[0] as any).timestamp) : null,
            pendingRecoveries: pendingSnap.size,
            successfulRecoveries24h: logs.filter(l => !(l as any).requiresManualIntervention).length,
            failedRecoveries24h: logs.filter(l => (l as any).requiresManualIntervention).length,
        };
    } catch (error) {
        logger.error('[Heartbeat Recovery Status] Failed to get status', { error });
        return {
            lastRecoveryTime: null,
            pendingRecoveries: 0,
            successfulRecoveries24h: 0,
            failedRecoveries24h: 0,
        };
    }
}
