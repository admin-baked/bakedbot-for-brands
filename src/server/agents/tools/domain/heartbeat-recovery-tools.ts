/**
 * Heartbeat Recovery Tools for Linus Agent
 *
 * Tools that allow Linus (CTO) to diagnose and fix heartbeat failures
 * - heartbeat_diagnose — Analyze why heartbeat is failing
 * - heartbeat_recover_all — Force recovery across all tenants
 * - heartbeat_recover_tenant — Fix heartbeat for specific tenant
 * - heartbeat_get_status — Check current system status
 */

import {
    checkSystemHeartbeatHealth,
    checkTenantHeartbeatHealth,
} from '@/server/services/heartbeat/health-monitor';
import {
    recoverTenantHeartbeat,
    runAutomaticRecovery,
    getRecoveryStatus,
} from '@/server/services/heartbeat/auto-recovery';
import { logger } from '@/lib/logger';

/**
 * Tool: Diagnose heartbeat failures across all tenants
 */
export const heartbeatDiagnose = async (input: {
    tenantIds?: string[];
    verbose?: boolean;
}) => {
    try {
        const systemHealth = await checkSystemHeartbeatHealth();

        // Filter to specific tenants if provided
        let tenantStatuses = systemHealth.tenantStatuses;
        if (input.tenantIds && input.tenantIds.length > 0) {
            tenantStatuses = tenantStatuses.filter(s =>
                input.tenantIds?.includes(s.tenantId)
            );
        }

        // Focus on unhealthy tenants
        const unhealthy = tenantStatuses.filter(s => !s.isHealthy);

        const diagnosis = {
            systemStatus: systemHealth.isSystemHealthy ? 'healthy' : 'degraded',
            totalTenants: systemHealth.tenantStatuses.length,
            unhealthyCount: unhealthy.length,
            averageFailureRate: (systemHealth.averageFailureRate * 100).toFixed(1) + '%',
            recommendations: [] as string[],
            unhealthyTenants: unhealthy.map(t => ({
                tenantId: t.tenantId,
                lastExecution: t.lastExecutionTime?.toISOString() || 'never',
                daysSinceExecution: t.daysSinceExecution.toFixed(2),
                failureRate: (t.failureRate * 100).toFixed(1) + '%',
                executionCount24h: t.executionCount24h,
            })),
        };

        // Generate recommendations
        if (systemHealth.averageFailureRate > 0.5) {
            diagnosis.recommendations.push(
                'High failure rate detected - run recoverAll immediately'
            );
        }
        if (unhealthy.length > 10) {
            diagnosis.recommendations.push(
                'Multiple tenants affected - check Cloud Scheduler job'
            );
        }
        if (systemHealth.systemDowntime > 24) {
            diagnosis.recommendations.push(
                'Extended downtime - check Firestore connectivity and API rate limits'
            );
        }

        logger.info('[Heartbeat Diagnose] Diagnosis complete', {
            systemStatus: diagnosis.systemStatus,
            unhealthyCount: diagnosis.unhealthyCount,
        });

        return {
            success: true,
            diagnosis,
        };
    } catch (error) {
        logger.error('[Heartbeat Diagnose] Diagnosis failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Tool: Recover all unhealthy tenants
 */
export const heartbeatRecoverAll = async (input: {
    tenantIds?: string[];
    skipValidation?: boolean;
}) => {
    try {
        const result = await runAutomaticRecovery();

        logger.info('[Heartbeat Recover All] Recovery completed', {
            checked: result.checked,
            recovered: result.recovered,
            failed: result.failed,
        });

        return {
            success: result.recovered > 0,
            result,
            message:
                result.recovered > 0
                    ? `Successfully recovered ${result.recovered} tenant(s)`
                    : 'No recovery needed',
        };
    } catch (error) {
        logger.error('[Heartbeat Recover All] Recovery failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Tool: Recover heartbeat for a specific tenant
 */
export const heartbeatRecoverTenant = async (input: {
    tenantId: string;
    retryCount?: number;
}) => {
    try {
        const result = await recoverTenantHeartbeat(input.tenantId);

        logger.info('[Heartbeat Recover Tenant] Recovery completed', {
            tenantId: input.tenantId,
            success: result.success,
        });

        return {
            success: result.success,
            tenantId: input.tenantId,
            recoveryMethod: result.recoveryMethod,
            message: result.message,
        };
    } catch (error) {
        logger.error('[Heartbeat Recover Tenant] Recovery failed', { error });
        return {
            success: false,
            tenantId: input.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Tool: Get current heartbeat system status
 */
export const heartbeatGetStatus = async (input: {
    tenantId?: string;
}) => {
    try {
        let status: any;

        if (input.tenantId) {
            // Get single tenant status
            status = await checkTenantHeartbeatHealth(input.tenantId);
        } else {
            // Get system status
            const systemHealth = await checkSystemHeartbeatHealth();
            const recoveryStatus = await getRecoveryStatus();

            status = {
                systemHealth,
                recoveryStatus,
            };
        }

        return {
            success: true,
            status,
        };
    } catch (error) {
        logger.error('[Heartbeat Get Status] Failed to get status', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

/**
 * Export all heartbeat recovery tools as agent-compatible definitions
 */
export const HEARTBEAT_RECOVERY_TOOLS = [
    heartbeatDiagnose,
    heartbeatRecoverAll,
    heartbeatRecoverTenant,
    heartbeatGetStatus,
];
