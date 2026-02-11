/**
 * Heartbeat Service Internal Types
 */

import type {
    HeartbeatCheckId,
    HeartbeatCheckResult,
    HeartbeatPriority,
} from '@/types/heartbeat';
import type { AgentId } from '@/server/agents/agent-definitions';

/**
 * Context passed to each heartbeat check
 */
export interface HeartbeatCheckContext {
    tenantId: string;
    userId: string;
    timezone: string;
    /** Previous check results (for comparison) */
    previousResults?: HeartbeatCheckResult[];
    /** Cached data from other checks in this run */
    sharedData: Record<string, unknown>;
}

/**
 * Function signature for a heartbeat check implementation
 */
export type HeartbeatCheckFn = (
    context: HeartbeatCheckContext
) => Promise<HeartbeatCheckResult | null>;

/**
 * Registry entry for a check implementation
 */
export interface HeartbeatCheckRegistry {
    checkId: HeartbeatCheckId;
    agent: AgentId;
    execute: HeartbeatCheckFn;
}

/**
 * Helper to create a check result
 */
export function createCheckResult(
    checkId: HeartbeatCheckId,
    agent: AgentId,
    params: {
        status: 'ok' | 'warning' | 'alert' | 'error';
        priority: HeartbeatPriority;
        title: string;
        message: string;
        data?: Record<string, unknown>;
        actionUrl?: string;
        actionLabel?: string;
    }
): HeartbeatCheckResult {
    return {
        checkId,
        agent,
        status: params.status,
        priority: params.priority,
        title: params.title,
        message: params.message,
        data: params.data,
        actionUrl: params.actionUrl,
        actionLabel: params.actionLabel,
        timestamp: new Date(),
    };
}

/**
 * Helper to create an "all clear" result (will be filtered out)
 */
export function createOkResult(
    checkId: HeartbeatCheckId,
    agent: AgentId,
    message: string = 'All clear'
): HeartbeatCheckResult {
    return createCheckResult(checkId, agent, {
        status: 'ok',
        priority: 'low',
        title: 'All Clear',
        message,
    });
}
