/**
 * Heartbeat Agent Tools
 *
 * Super User agents can monitor and control the heartbeat system via these tools.
 * Available to: Leo (COO), Linus (CTO), Jack (CRO), Glenda (CMO), Mike (CFO)
 */

import {
    getHeartbeatConfig,
    updateHeartbeatConfig,
    toggleHeartbeatCheck,
    triggerHeartbeat,
    getHeartbeatHistory,
    getRecentAlerts,
    diagnoseHeartbeat,
} from '@/server/actions/heartbeat';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckId } from '@/types/heartbeat';

/**
 * Get current heartbeat status and configuration
 */
export const heartbeatGetStatus = async () => {
    try {
        const result = await getHeartbeatConfig();
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            config: result.config,
            availableChecks: result.availableChecks,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to get status:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Get recent heartbeat execution history
 */
export const heartbeatGetHistory = async (limit: number = 20) => {
    try {
        const result = await getHeartbeatHistory(limit);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            executions: result.executions,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to get history:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Get recent heartbeat alerts (non-OK check results)
 */
export const heartbeatGetAlerts = async (limit: number = 50) => {
    try {
        const result = await getRecentAlerts(limit);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            alerts: result.alerts,
            count: result.alerts?.length || 0,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to get alerts:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Manually trigger a heartbeat check cycle
 */
export const heartbeatTrigger = async () => {
    try {
        const result = await triggerHeartbeat();
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            checksRun: result.results?.length || 0,
            results: result.results,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to trigger:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Configure heartbeat settings
 */
export const heartbeatConfigure = async (updates: {
    enabled?: boolean;
    interval?: number;
    activeHours?: { start: number; end: number };
    quietHours?: { start: number; end: number } | null;
    timezone?: string;
    enabledChecks?: string[];
    channels?: ('dashboard' | 'email' | 'sms' | 'whatsapp' | 'push')[];
    suppressAllClear?: boolean;
}) => {
    try {
        // Cast enabledChecks to HeartbeatCheckId[] for type safety
        const configUpdates = {
            ...updates,
            enabledChecks: updates.enabledChecks as HeartbeatCheckId[] | undefined,
        };
        const result = await updateHeartbeatConfig(configUpdates);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            message: 'Heartbeat configuration updated',
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to configure:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Toggle a specific heartbeat check on/off
 */
export const heartbeatToggleCheck = async (checkId: string, enabled: boolean) => {
    try {
        const result = await toggleHeartbeatCheck(checkId as any, enabled);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            message: `Heartbeat check '${checkId}' ${enabled ? 'enabled' : 'disabled'}`,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to toggle check:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Diagnose heartbeat system health
 */
export const heartbeatDiagnose = async () => {
    try {
        const result = await diagnoseHeartbeat();
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return {
            success: true,
            healthy: result.healthy,
            issues: result.issues,
            info: result.info,
            issueCount: result.issues?.length || 0,
        };
    } catch (e: any) {
        logger.error('[Heartbeat Tool] Failed to diagnose:', e);
        return { success: false, error: e.message };
    }
};
