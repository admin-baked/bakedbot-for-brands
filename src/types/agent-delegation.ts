/**
 * Agent-to-Agent Delegation Protocol
 *
 * Formal contract for structured inter-agent communication.
 * Any agent can delegate tasks to another agent with typed
 * request/response, timeout, fallback, and audit logging.
 *
 * Builds on the existing `commonDelegationTools.delegateTask`
 * pattern in default-tools.ts, adding:
 * - Typed request/response envelopes
 * - Timeout with Promise.race
 * - Fallback agent on failure
 * - Fire-and-forget mode
 * - Delegation audit logging (Firestore)
 */

import type { ToolExecution } from '@/ai/claude';

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export interface AgentRequest {
    id: string;
    fromAgent: string;
    toAgent: string;
    task: string;
    context?: Record<string, unknown>;
    priority?: DelegationPriority;
    timeoutMs?: number;
    replyTo?: string;   // for async: inbox thread ID to post result
}

export interface AgentResponse {
    requestId: string;
    fromAgent: string;
    status: 'completed' | 'failed' | 'delegated' | 'timeout';
    result?: string;
    data?: Record<string, unknown>;
    toolExecutions?: ToolExecution[];
    durationMs: number;
    error?: string;
    delegatedTo?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type DelegationPriority = 'low' | 'normal' | 'high' | 'critical';
export type DelegationMode = 'sync' | 'fire_and_forget';

export interface DelegationConfig {
    mode: DelegationMode;
    timeoutMs: number;
    retries: number;
    fallbackAgent?: string;
}

export const DELEGATION_DEFAULTS: DelegationConfig = {
    mode: 'sync',
    timeoutMs: 30_000,
    retries: 0,
    fallbackAgent: undefined,
};

// ---------------------------------------------------------------------------
// Audit Record (Firestore: agent_delegations)
// ---------------------------------------------------------------------------

export interface DelegationAuditRecord {
    requestId: string;
    fromAgent: string;
    toAgent: string;
    task: string;
    priority: DelegationPriority;
    mode: DelegationMode;
    status: AgentResponse['status'];
    durationMs: number;
    error?: string;
    delegatedTo?: string;
    createdAt: Date;
}

// ---------------------------------------------------------------------------
// Known Agents (for validation)
// ---------------------------------------------------------------------------

export const KNOWN_AGENTS = [
    'craig', 'smokey', 'pops', 'ezal', 'money_mike', 'mrs_parker',
    'day_day', 'felisha', 'leo', 'jack', 'glenda', 'linus', 'deebo',
    'big_worm', 'bigworm', 'openclaw', 'executive_base', 'mike_exec', 'mike',
] as const;

export type KnownAgent = typeof KNOWN_AGENTS[number];
