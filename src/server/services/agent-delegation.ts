/**
 * Agent-to-Agent Delegation Service
 *
 * Provides a formal protocol for agents to delegate tasks to other agents
 * with typed request/response, timeout, fallback, and audit logging.
 *
 * Builds on the existing `runAgentChat()` in ceo/agents/actions.ts.
 */

import { logger } from '@/lib/logger';
import type {
    AgentRequest,
    AgentResponse,
    DelegationConfig,
    DelegationAuditRecord,
    KnownAgent,
} from '@/types/agent-delegation';
import { DELEGATION_DEFAULTS, KNOWN_AGENTS } from '@/types/agent-delegation';

// ---------------------------------------------------------------------------
// Core Delegation Function
// ---------------------------------------------------------------------------

/**
 * Delegate a task to another agent and get a typed response.
 *
 * @example
 * ```ts
 * const response = await delegateToAgent({
 *     id: crypto.randomUUID(),
 *     fromAgent: 'leo',
 *     toAgent: 'deebo',
 *     task: 'Check this marketing copy for compliance violations',
 *     context: { content: 'Buy our amazing weed!' },
 * });
 * if (response.status === 'completed') {
 *     console.log(response.result);
 * }
 * ```
 */
export async function delegateToAgent(
    request: AgentRequest,
    config?: Partial<DelegationConfig>,
): Promise<AgentResponse> {
    const mergedConfig: DelegationConfig = { ...DELEGATION_DEFAULTS, ...config };
    const startTime = Date.now();

    // Validate target agent
    if (!KNOWN_AGENTS.includes(request.toAgent as KnownAgent)) {
        throw new Error(`Unknown agent: "${request.toAgent}". Known agents: ${KNOWN_AGENTS.join(', ')}`);
    }

    logger.info(`[Delegation] ${request.fromAgent} → ${request.toAgent}: "${request.task.substring(0, 80)}"`, {
        requestId: request.id,
        priority: request.priority ?? 'normal',
        mode: mergedConfig.mode,
    });

    // Fire-and-forget mode: dispatch and return immediately
    if (mergedConfig.mode === 'fire_and_forget') {
        void executeDelegation(request, mergedConfig, startTime).catch((err) => {
            logger.error(`[Delegation] Fire-and-forget failed: ${String(err)}`, { requestId: request.id });
        });
        return {
            requestId: request.id,
            fromAgent: request.toAgent,
            status: 'completed',
            result: 'Task dispatched (fire-and-forget)',
            durationMs: Date.now() - startTime,
        };
    }

    // Sync mode: execute with timeout
    try {
        const response = await withTimeout(
            executeDelegation(request, mergedConfig, startTime),
            mergedConfig.timeoutMs,
            request.id,
        );
        return response;
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isTimeout = errorMsg.includes('timed out');

        // Try fallback agent if configured
        if (mergedConfig.fallbackAgent && !isTimeout) {
            logger.warn(`[Delegation] Primary failed, trying fallback: ${mergedConfig.fallbackAgent}`, {
                requestId: request.id,
                error: errorMsg,
            });
            try {
                return await delegateToAgent(
                    { ...request, toAgent: mergedConfig.fallbackAgent },
                    { ...mergedConfig, fallbackAgent: undefined }, // prevent infinite fallback
                );
            } catch (fallbackErr) {
                logger.error(`[Delegation] Fallback also failed: ${String(fallbackErr)}`, {
                    requestId: request.id,
                });
            }
        }

        const response: AgentResponse = {
            requestId: request.id,
            fromAgent: request.toAgent,
            status: isTimeout ? 'timeout' : 'failed',
            error: errorMsg,
            durationMs: Date.now() - startTime,
        };

        // Audit log (non-blocking)
        void logDelegation(request, response, mergedConfig).catch(() => {});

        return response;
    }
}

// ---------------------------------------------------------------------------
// Internal Execution
// ---------------------------------------------------------------------------

async function executeDelegation(
    request: AgentRequest,
    config: DelegationConfig,
    startTime: number,
): Promise<AgentResponse> {
    // Dynamic import to avoid circular deps with agent-runner
    const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');

    const taskWithContext = request.context
        ? `DELEGATED TASK from ${request.fromAgent}: ${request.task}\n\nContext: ${JSON.stringify(request.context)}`
        : `DELEGATED TASK from ${request.fromAgent}: ${request.task}`;

    const result = await runAgentChat(taskWithContext, request.toAgent, {
        modelLevel: request.priority === 'critical' ? 'advanced' : 'standard',
    });

    const response: AgentResponse = {
        requestId: request.id,
        fromAgent: request.toAgent,
        status: 'completed',
        result: result.content,
        data: result.metadata ? { metadata: result.metadata } : undefined,
        toolExecutions: result.toolCalls?.map((tc: any, i: number) => ({
            id: `tool_${i}`,
            name: tc.name ?? 'unknown',
            input: tc.input ?? {},
            output: tc.output ?? null,
            status: 'success' as const,
            durationMs: 0,
        })),
        durationMs: Date.now() - startTime,
    };

    // Audit log (non-blocking)
    void logDelegation(request, response, config).catch(() => {});

    return response;
}

// ---------------------------------------------------------------------------
// Timeout Wrapper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, requestId: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`Delegation ${requestId} timed out after ${timeoutMs}ms`)),
                timeoutMs,
            ),
        ),
    ]);
}

// ---------------------------------------------------------------------------
// Audit Logging (Firestore)
// ---------------------------------------------------------------------------

async function logDelegation(
    request: AgentRequest,
    response: AgentResponse,
    config: DelegationConfig,
): Promise<void> {
    try {
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        const record: DelegationAuditRecord = {
            requestId: request.id,
            fromAgent: request.fromAgent,
            toAgent: request.toAgent,
            task: request.task.substring(0, 500),
            priority: request.priority ?? 'normal',
            mode: config.mode,
            status: response.status,
            durationMs: response.durationMs,
            error: response.error,
            delegatedTo: response.delegatedTo,
            createdAt: new Date(),
        };

        await firestore.collection('agent_delegations').add(record);
    } catch (err) {
        logger.warn(`[Delegation] Failed to write audit log: ${String(err)}`);
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function generateDelegationId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
