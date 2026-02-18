/**
 * Heartbeat Health Monitor
 *
 * Detects heartbeat failures and triggers automatic recovery without requiring user login.
 * - Tracks heartbeat execution status across all tenants
 * - Detects when heartbeat goes down (no execution in expected interval)
 * - Triggers automatic recovery via Cloud Scheduler
 * - Logs failures for debugging
 * - Works offline (doesn't require user authentication)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface HeartbeatHealthStatus {
    tenantId: string;
    isHealthy: boolean;
    lastExecutionTime: Date | null;
    daysSinceExecution: number;
    executionCount24h: number;
    failureCount24h: number;
    failureRate: number; // 0-1
    nextExpectedExecution: Date | null;
}

export interface SystemHeartbeatStatus {
    isSystemHealthy: boolean;
    tenantStatuses: HeartbeatHealthStatus[];
    systemDowntime: number; // in hours
    totalFailures24h: number;
    averageFailureRate: number;
    needsRecovery: boolean;
}

/**
 * Check if a specific tenant's heartbeat is healthy
 */
export async function checkTenantHeartbeatHealth(
    tenantId: string
): Promise<HeartbeatHealthStatus> {
    const db = getAdminFirestore();
    const now = new Date();

    try {
        // Get tenant heartbeat config
        const configSnap = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .get();

        if (!configSnap.exists) {
            // No config = not enabled for this tenant
            return {
                tenantId,
                isHealthy: true,
                lastExecutionTime: null,
                daysSinceExecution: 0,
                executionCount24h: 0,
                failureCount24h: 0,
                failureRate: 0,
                nextExpectedExecution: null,
            };
        }

        const config = configSnap.data();
        if (config?.enabled === false) {
            return {
                tenantId,
                isHealthy: true,
                lastExecutionTime: null,
                daysSinceExecution: 0,
                executionCount24h: 0,
                failureCount24h: 0,
                failureRate: 0,
                nextExpectedExecution: null,
            };
        }

        // Get recent executions
        const last24hMs = 24 * 60 * 60 * 1000;
        const oneDayAgo = new Date(now.getTime() - last24hMs);

        const executionsSnap = await db
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .where('completedAt', '>=', oneDayAgo)
            .orderBy('completedAt', 'desc')
            .limit(50)
            .get();

        const executions = executionsSnap.docs.map(doc => {
            const data = doc.data() as any;
            return {
                ...data,
                completedAt: data.completedAt?.toDate?.() || new Date(),
                startedAt: data.startedAt?.toDate?.() || new Date(),
                overallStatus: data.overallStatus || 'unknown',
            };
        });

        // Get last execution ever
        const lastExecSnap = await db
            .collection('heartbeat_executions')
            .where('tenantId', '==', tenantId)
            .orderBy('completedAt', 'desc')
            .limit(1)
            .get();

        const lastExecution = lastExecSnap.docs[0];
        const lastExecutionTime = lastExecution?.data().completedAt?.toDate?.() || null;

        // Calculate metrics
        const interval = (config?.interval || 30) * 60 * 1000; // in ms
        const daysSinceExecution = lastExecutionTime ? (now.getTime() - lastExecutionTime.getTime()) / (24 * 60 * 60 * 1000) : -1;
        const isHealthy = lastExecutionTime ? daysSinceExecution < 1 : false; // Healthy if executed in last 24 hours

        const failureCount = executions.filter(
            (e: any) => e.overallStatus !== 'all_clear' && e.overallStatus !== 'suppressed'
        ).length;
        const failureRate = executions.length > 0 ? failureCount / executions.length : 0;

        // Calculate next expected execution
        let nextExpectedExecution: Date | null = null;
        if (lastExecutionTime) {
            nextExpectedExecution = new Date(lastExecutionTime.getTime() + interval);
        }

        return {
            tenantId,
            isHealthy,
            lastExecutionTime,
            daysSinceExecution: daysSinceExecution > 0 ? daysSinceExecution : 0,
            executionCount24h: executions.length,
            failureCount24h: failureCount,
            failureRate,
            nextExpectedExecution,
        };
    } catch (error) {
        logger.error('[Heartbeat Health] Failed to check tenant health', { tenantId, error });
        return {
            tenantId,
            isHealthy: false,
            lastExecutionTime: null,
            daysSinceExecution: -1,
            executionCount24h: 0,
            failureCount24h: 0,
            failureRate: 1, // Assume worst case
            nextExpectedExecution: null,
        };
    }
}

/**
 * Check overall system heartbeat health across all tenants
 */
export async function checkSystemHeartbeatHealth(): Promise<SystemHeartbeatStatus> {
    const db = getAdminFirestore();

    try {
        // Get all active tenants
        const tenantsSnap = await db
            .collection('tenants')
            .where('isActive', '==', true)
            .limit(100)
            .get();

        const tenantIds = tenantsSnap.docs.map(doc => doc.id);

        // Check health for each tenant
        const tenantStatuses = await Promise.all(
            tenantIds.map(id => checkTenantHeartbeatHealth(id))
        );

        // Calculate system-wide metrics
        const unhealthyTenants = tenantStatuses.filter(s => !s.isHealthy);
        const isSystemHealthy = unhealthyTenants.length === 0;

        const totalFailures = tenantStatuses.reduce((sum, s) => sum + s.failureCount24h, 0);
        const avgFailureRate = tenantStatuses.length > 0
            ? tenantStatuses.reduce((sum, s) => sum + s.failureRate, 0) / tenantStatuses.length
            : 0;

        // Check if recovery is needed
        const needsRecovery = unhealthyTenants.length > 0 || avgFailureRate > 0.25;

        return {
            isSystemHealthy,
            tenantStatuses,
            systemDowntime: unhealthyTenants.reduce((sum, s) => sum + s.daysSinceExecution, 0),
            totalFailures24h: totalFailures,
            averageFailureRate: avgFailureRate,
            needsRecovery,
        };
    } catch (error) {
        logger.error('[Heartbeat Health] Failed to check system health', { error });
        return {
            isSystemHealthy: false,
            tenantStatuses: [],
            systemDowntime: 0,
            totalFailures24h: 0,
            averageFailureRate: 1,
            needsRecovery: true,
        };
    }
}

/**
 * Log heartbeat failure for debugging and recovery
 */
export async function logHeartbeatFailure(
    tenantId: string,
    reason: string,
    details?: Record<string, any>
): Promise<void> {
    const db = getAdminFirestore();

    try {
        await db.collection('heartbeat_failures').add({
            tenantId,
            reason,
            details: details || {},
            timestamp: new Date(),
            requiresManualIntervention: false,
        });

        logger.error('[Heartbeat Failure] Logged failure', {
            tenantId,
            reason,
            ...details,
        });
    } catch (error) {
        logger.error('[Heartbeat Failure] Failed to log failure', { tenantId, error });
    }
}

/**
 * Mark heartbeat as recovered
 */
export async function markHeartbeatRecovered(
    tenantId: string,
    recoveryMethod: string
): Promise<void> {
    const db = getAdminFirestore();

    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('settings')
            .doc('heartbeat')
            .set({ lastRecoveredAt: new Date(), recoveryMethod }, { merge: true });

        logger.info('[Heartbeat Recovery] Marked as recovered', {
            tenantId,
            recoveryMethod,
        });
    } catch (error) {
        logger.error('[Heartbeat Recovery] Failed to mark recovered', { tenantId, error });
    }
}
