/**
 * Agent Telemetry Service
 *
 * Tracks per-agent-invocation metrics:
 * - Token usage (input/output/cache)
 * - Tool calls (names, count, latency)
 * - Total invocation latency
 * - Success/failure + error classification
 * - Cost estimates
 *
 * Writes to Firestore `agent_telemetry` collection for dashboarding
 * and the "capability utilization" metric that quantifies the
 * "forgetting super powers" problem.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// === Pricing (per 1M tokens, as of Feb 2026) ===
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
    'claude-sonnet-4-5-20250929': { inputPer1M: 3.0, outputPer1M: 15.0 },
    'claude-opus-4-5-20251101': { inputPer1M: 15.0, outputPer1M: 75.0 },
};
const DEFAULT_PRICING = { inputPer1M: 3.0, outputPer1M: 15.0 };

// === Types ===

export interface ToolCallRecord {
    name: string;
    durationMs: number;
    status: 'success' | 'error';
}

export interface AgentTelemetryEvent {
    agentName: string;
    invocationId: string;
    timestamp: Date;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolCalls: ToolCallRecord[];
    toolCallCount: number;
    uniqueToolsUsed: string[];
    totalLatencyMs: number;
    success: boolean;
    errorType?: string;
    costEstimateUsd: number;
    // Capability utilization: ratio of unique tools used vs available tools
    availableToolCount?: number;
    capabilityUtilization?: number; // 0.0 to 1.0
}

// === Cost Estimation ===

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
    return (inputTokens / 1_000_000) * pricing.inputPer1M +
        (outputTokens / 1_000_000) * pricing.outputPer1M;
}

// === Telemetry Recording ===

/**
 * Record an agent telemetry event to Firestore.
 * Fire-and-forget — errors are logged but never thrown to avoid impacting agent execution.
 */
export async function recordAgentTelemetry(event: AgentTelemetryEvent): Promise<void> {
    try {
        const db = getAdminFirestore();
        await db.collection('agent_telemetry').add({
            ...event,
            timestamp: event.timestamp,
            // Denormalized fields for efficient querying
            _agentName: event.agentName,
            _date: event.timestamp.toISOString().split('T')[0], // YYYY-MM-DD for daily aggregation
            _model: event.model,
        });

        logger.info(`[AgentTelemetry] Recorded: agent=${event.agentName} tools=${event.toolCallCount} tokens=${event.totalTokens} cost=$${event.costEstimateUsd.toFixed(4)} latency=${event.totalLatencyMs}ms`);
    } catch (error) {
        // Fire-and-forget: log but don't throw
        logger.error('[AgentTelemetry] Failed to record telemetry', {
            error: error instanceof Error ? error.message : 'Unknown error',
            agentName: event.agentName,
        });
    }
}

// === Helper: Build telemetry event from executeWithTools result ===

export function buildTelemetryEvent(params: {
    agentName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    toolExecutions: Array<{ name: string; durationMs: number; status: 'success' | 'error' }>;
    totalLatencyMs: number;
    success: boolean;
    errorType?: string;
    availableToolCount?: number;
}): AgentTelemetryEvent {
    const toolCalls: ToolCallRecord[] = params.toolExecutions.map(t => ({
        name: t.name,
        durationMs: t.durationMs,
        status: t.status,
    }));

    const uniqueToolsUsed = [...new Set(params.toolExecutions.map(t => t.name))];
    const costEstimateUsd = estimateCost(params.model, params.inputTokens, params.outputTokens);

    let capabilityUtilization: number | undefined;
    if (params.availableToolCount && params.availableToolCount > 0) {
        capabilityUtilization = uniqueToolsUsed.length / params.availableToolCount;
    }

    return {
        agentName: params.agentName,
        invocationId: `${params.agentName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.inputTokens + params.outputTokens,
        toolCalls,
        toolCallCount: toolCalls.length,
        uniqueToolsUsed,
        totalLatencyMs: params.totalLatencyMs,
        success: params.success,
        errorType: params.errorType,
        costEstimateUsd,
        availableToolCount: params.availableToolCount,
        capabilityUtilization,
    };
}
