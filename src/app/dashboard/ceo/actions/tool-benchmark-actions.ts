'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';

interface ToolCallLike {
    name?: string;
    status?: 'success' | 'error' | string;
}

interface RetrievalMetricLike {
    retrieval_domain?: string;
    retrieval_strategy?: 'fts' | 'vector' | 'hybrid' | 'multivector' | string;
    reranker_used?: string;
    applied_filters?: string[];
    filter_selectivity?: number;
    top_k_requested?: number;
    top_k_returned?: number;
    hydrated_record_count?: number;
    retrieval_latency_ms?: number;
    result_payload_tokens?: number;
    zero_result?: boolean;
    user_followup_needed?: boolean;
    citation_hit_rate?: number;
}

interface AgentTelemetryLike {
    agentName?: string;
    success?: boolean;
    totalTokens?: number;
    toolCallCount?: number;
    toolCalls?: ToolCallLike[];
    toolErrorCount?: number;
    toolDefinitionTokens?: number;
    toolResultTokens?: number;
    toolSelectionMisses?: number;
    toolParamValidationErrors?: number;
    deadEndLoopCount?: number;
    capabilityUtilization?: number;
    totalLatencyMs?: number;
    lancedbQueryCount?: number;
    lancedbVectorQueryCount?: number;
    lancedbFtsQueryCount?: number;
    lancedbHybridQueryCount?: number;
    lancedbRerankCount?: number;
    lancedbEmptyResultCount?: number;
    lancedbRetrievedCandidateCount?: number;
    lancedbConsumedCandidateCount?: number;
    lancedbFilterSelectivityAvg?: number;
    timestamp?: Date | string | { toDate?: () => Date };
    retrievalMetrics?: RetrievalMetricLike[];
}

export interface BenchmarkAgentRow {
    agent: string;
    invocations: number;
    avgTokens: number;
    avgToolCalls: number;
    toolErrorRate: number;
    avgCapabilityUtilization: number | null;
}

export interface BenchmarkTopTool {
    name: string;
    count: number;
}

export interface LanceDbModeMix {
    vector: number;
    fts: number;
    hybrid: number;
}

export interface AgentToolBenchmarkReport {
    generatedAtIso: string;
    windowDays: number;
    eventsScanned: number;
    eventsInWindow: number;
    successRate: number;
    avgTokensPerInvocation: number;
    avgToolCallsPerInvocation: number;
    toolErrorRate: number;
    avgLatencyMs: number;
    avgDefinitionTokensPerInvocation: number;
    avgResultTokensPerInvocation: number;
    paramErrorsPerInvocation: number;
    selectionMissesPerInvocation: number;
    deadEndLoopsPerInvocation: number;
    lancedbQueriesPerInvocation: number;
    lancedbEmptyResultRate: number;
    lancedbRerankRate: number;
    lancedbConsumptionRate: number;
    lancedbFilterSelectivityAvg: number;
    lancedbModeMix: LanceDbModeMix;
    retrievalCallsPerInvocation: number;
    retrievalLatencyAvgMs: number;
    retrievalPayloadTokensPerInvocation: number;
    retrievalHydrationCountPerInvocation: number;
    retrievalTopKReturnRate: number;
    retrievalZeroResultRate: number;
    retrievalFollowupRate: number;
    retrievalCitationHitRateAvg: number;
    retrievalDomainBreakdown: Record<string, number>;
    retrievalStrategyBreakdown: Record<string, number>;
    byAgent: BenchmarkAgentRow[];
    topTools: BenchmarkTopTool[];
    recommendations: string[];
}

function toDate(value: AgentTelemetryLike['timestamp']): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
        try {
            const parsed = value.toDate();
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        } catch {
            return null;
        }
    }

    return null;
}

function asNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function pct(part: number, whole: number): number {
    if (!whole) {
        return 0;
    }
    return (part / whole) * 100;
}

function computeRecommendations(summary: AgentToolBenchmarkReport): string[] {
    const recommendations: string[] = [];

    if (summary.avgDefinitionTokensPerInvocation > 10_000) {
        recommendations.push('Tool-definition bloat is high. Add deferred tool discovery/tool search for long-tail tools.');
    }

    if (summary.avgToolCallsPerInvocation >= 6 && summary.avgResultTokensPerInvocation > 5_000) {
        recommendations.push('Multi-call fan-out is expensive. Prioritize composed backend tools or code-mode fan-in for batch analytics tasks.');
    }

    if (summary.toolErrorRate >= 10) {
        recommendations.push('Tool error rate is elevated. Add tool input examples and tighten schema validation on brittle tools.');
    }

    if (summary.selectionMissesPerInvocation >= 0.2) {
        recommendations.push('Frequent tool selection misses detected. Improve tool naming/descriptions and route through searchable registry.');
    }

    if (summary.deadEndLoopsPerInvocation >= 0.1) {
        recommendations.push('Dead-end loops detected. Add retry limits and fallback summarization to break loops.');
    }

    if (summary.lancedbQueriesPerInvocation >= 1 && summary.lancedbConsumptionRate < 20) {
        recommendations.push('LanceDB candidate consumption is low. Reduce top-k and improve retrieval policy/reranking before hydration.');
    }

    if (summary.lancedbQueriesPerInvocation >= 1 && summary.lancedbEmptyResultRate > 25) {
        recommendations.push('LanceDB empty-result rate is high. Improve filter defaults and fallback from FTS/vector to hybrid retrieval.');
    }

    if (summary.retrievalZeroResultRate > 25) {
        recommendations.push('Retrieval zero-result rate is high. Revisit domain routing presets and default filter constraints.');
    }

    if (summary.retrievalTopKReturnRate < 35) {
        recommendations.push('Top-k return efficiency is low. Reduce over-restrictive filters and tune query rewriting for retrieval.');
    }

    if (summary.retrievalPayloadTokensPerInvocation > 3000) {
        recommendations.push('Retrieval payload tokens are high. Return lean snippets + IDs and defer full hydration.');
    }

    if (recommendations.length === 0) {
        recommendations.push('Current benchmark profile looks healthy. Track this as your baseline and add CI regression checks per golden scenario.');
    }

    return recommendations;
}

export function buildAgentToolBenchmarkReport(
    events: AgentTelemetryLike[],
    windowDays = 30,
    topToolCount = 10,
): AgentToolBenchmarkReport {
    const cutoffMs = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
    const scoped = events.filter((event) => {
        const timestamp = toDate(event.timestamp);
        return !!timestamp && timestamp.getTime() >= cutoffMs;
    });

    let totalSuccess = 0;
    let totalTokens = 0;
    let totalToolCalls = 0;
    let totalToolErrors = 0;
    let totalLatencyMs = 0;
    let totalDefinitionTokens = 0;
    let totalResultTokens = 0;
    let totalParamErrors = 0;
    let totalSelectionMisses = 0;
    let totalDeadEndLoops = 0;
    let totalLanceDbQueries = 0;
    let totalLanceDbVectorQueries = 0;
    let totalLanceDbFtsQueries = 0;
    let totalLanceDbHybridQueries = 0;
    let totalLanceDbReranks = 0;
    let totalLanceDbEmptyResults = 0;
    let totalLanceDbRetrievedCandidates = 0;
    let totalLanceDbConsumedCandidates = 0;
    let lancedbFilterSelectivitySum = 0;
    let lancedbFilterSelectivityCount = 0;

    let totalRetrievalCalls = 0;
    let totalRetrievalLatencyMs = 0;
    let totalRetrievalPayloadTokens = 0;
    let totalRetrievalHydratedRecords = 0;
    let totalRetrievalTopKRequested = 0;
    let totalRetrievalTopKReturned = 0;
    let totalRetrievalZeroResults = 0;
    let totalRetrievalFollowups = 0;
    let totalRetrievalCitationHitRate = 0;
    let totalRetrievalCitationHitCount = 0;
    const retrievalDomainBreakdown: Record<string, number> = {};
    const retrievalStrategyBreakdown: Record<string, number> = {};

    const perAgent = new Map<string, {
        invocations: number;
        tokens: number;
        toolCalls: number;
        toolErrors: number;
        capabilityUtilizationSum: number;
        capabilityUtilizationCount: number;
    }>();
    const toolFreq = new Map<string, number>();

    for (const event of scoped) {
        totalSuccess += event.success ? 1 : 0;

        const toolCalls = asNumber(event.toolCallCount, Array.isArray(event.toolCalls) ? event.toolCalls.length : 0);
        const toolErrors = asNumber(
            event.toolErrorCount,
            Array.isArray(event.toolCalls)
                ? event.toolCalls.filter((tool) => tool?.status === 'error').length
                : 0,
        );

        totalTokens += asNumber(event.totalTokens);
        totalToolCalls += toolCalls;
        totalToolErrors += toolErrors;
        totalLatencyMs += asNumber(event.totalLatencyMs);
        totalDefinitionTokens += asNumber(event.toolDefinitionTokens);
        totalResultTokens += asNumber(event.toolResultTokens);
        totalParamErrors += asNumber(event.toolParamValidationErrors);
        totalSelectionMisses += asNumber(event.toolSelectionMisses);
        totalDeadEndLoops += asNumber(event.deadEndLoopCount);

        totalLanceDbQueries += asNumber(event.lancedbQueryCount);
        totalLanceDbVectorQueries += asNumber(event.lancedbVectorQueryCount);
        totalLanceDbFtsQueries += asNumber(event.lancedbFtsQueryCount);
        totalLanceDbHybridQueries += asNumber(event.lancedbHybridQueryCount);
        totalLanceDbReranks += asNumber(event.lancedbRerankCount);
        totalLanceDbEmptyResults += asNumber(event.lancedbEmptyResultCount);
        totalLanceDbRetrievedCandidates += asNumber(event.lancedbRetrievedCandidateCount);
        totalLanceDbConsumedCandidates += asNumber(event.lancedbConsumedCandidateCount);
        if (typeof event.lancedbFilterSelectivityAvg === "number") {
            lancedbFilterSelectivitySum += event.lancedbFilterSelectivityAvg;
            lancedbFilterSelectivityCount += 1;
        }

        for (const metric of event.retrievalMetrics || []) {
            totalRetrievalCalls += 1;
            totalRetrievalLatencyMs += asNumber(metric.retrieval_latency_ms);
            totalRetrievalPayloadTokens += asNumber(metric.result_payload_tokens);
            totalRetrievalHydratedRecords += asNumber(metric.hydrated_record_count);
            totalRetrievalTopKRequested += asNumber(metric.top_k_requested);
            totalRetrievalTopKReturned += asNumber(metric.top_k_returned);
            totalRetrievalZeroResults += metric.zero_result ? 1 : 0;
            totalRetrievalFollowups += metric.user_followup_needed ? 1 : 0;

            if (typeof metric.citation_hit_rate === 'number') {
                totalRetrievalCitationHitRate += metric.citation_hit_rate;
                totalRetrievalCitationHitCount += 1;
            }

            const domain = metric.retrieval_domain || 'unknown';
            retrievalDomainBreakdown[domain] = (retrievalDomainBreakdown[domain] || 0) + 1;
            const strategy = metric.retrieval_strategy || 'unknown';
            retrievalStrategyBreakdown[strategy] = (retrievalStrategyBreakdown[strategy] || 0) + 1;
        }

        const agentName = event.agentName || 'unknown';
        if (!perAgent.has(agentName)) {
            perAgent.set(agentName, {
                invocations: 0,
                tokens: 0,
                toolCalls: 0,
                toolErrors: 0,
                capabilityUtilizationSum: 0,
                capabilityUtilizationCount: 0,
            });
        }

        const agent = perAgent.get(agentName)!;
        agent.invocations += 1;
        agent.tokens += asNumber(event.totalTokens);
        agent.toolCalls += toolCalls;
        agent.toolErrors += toolErrors;

        if (typeof event.capabilityUtilization === 'number') {
            agent.capabilityUtilizationSum += event.capabilityUtilization;
            agent.capabilityUtilizationCount += 1;
        }

        for (const tool of event.toolCalls || []) {
            const toolName = tool?.name || 'unknown';
            toolFreq.set(toolName, (toolFreq.get(toolName) || 0) + 1);
        }
    }

    const invocations = scoped.length;

    const byAgent: BenchmarkAgentRow[] = Array.from(perAgent.entries())
        .map(([agent, values]) => ({
            agent,
            invocations: values.invocations,
            avgTokens: values.tokens / Math.max(values.invocations, 1),
            avgToolCalls: values.toolCalls / Math.max(values.invocations, 1),
            toolErrorRate: pct(values.toolErrors, Math.max(values.toolCalls, 1)),
            avgCapabilityUtilization: values.capabilityUtilizationCount > 0
                ? values.capabilityUtilizationSum / values.capabilityUtilizationCount
                : null,
        }))
        .sort((a, b) => b.invocations - a.invocations);

    const topTools: BenchmarkTopTool[] = Array.from(toolFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topToolCount)
        .map(([name, count]) => ({ name, count }));

    const report: AgentToolBenchmarkReport = {
        generatedAtIso: new Date().toISOString(),
        windowDays,
        eventsScanned: events.length,
        eventsInWindow: invocations,
        successRate: pct(totalSuccess, Math.max(invocations, 1)),
        avgTokensPerInvocation: totalTokens / Math.max(invocations, 1),
        avgToolCallsPerInvocation: totalToolCalls / Math.max(invocations, 1),
        toolErrorRate: pct(totalToolErrors, Math.max(totalToolCalls, 1)),
        avgLatencyMs: totalLatencyMs / Math.max(invocations, 1),
        avgDefinitionTokensPerInvocation: totalDefinitionTokens / Math.max(invocations, 1),
        avgResultTokensPerInvocation: totalResultTokens / Math.max(invocations, 1),
        paramErrorsPerInvocation: totalParamErrors / Math.max(invocations, 1),
        selectionMissesPerInvocation: totalSelectionMisses / Math.max(invocations, 1),
        deadEndLoopsPerInvocation: totalDeadEndLoops / Math.max(invocations, 1),
        lancedbQueriesPerInvocation: totalLanceDbQueries / Math.max(invocations, 1),
        lancedbEmptyResultRate: pct(totalLanceDbEmptyResults, Math.max(totalLanceDbQueries, 1)),
        lancedbRerankRate: pct(totalLanceDbReranks, Math.max(totalLanceDbQueries, 1)),
        lancedbConsumptionRate: pct(totalLanceDbConsumedCandidates, Math.max(totalLanceDbRetrievedCandidates, 1)),
        lancedbFilterSelectivityAvg: lancedbFilterSelectivityCount > 0
            ? lancedbFilterSelectivitySum / lancedbFilterSelectivityCount
            : 0,
        lancedbModeMix: {
            vector: totalLanceDbVectorQueries,
            fts: totalLanceDbFtsQueries,
            hybrid: totalLanceDbHybridQueries,
        },
        retrievalCallsPerInvocation: totalRetrievalCalls / Math.max(invocations, 1),
        retrievalLatencyAvgMs: totalRetrievalLatencyMs / Math.max(totalRetrievalCalls, 1),
        retrievalPayloadTokensPerInvocation: totalRetrievalPayloadTokens / Math.max(invocations, 1),
        retrievalHydrationCountPerInvocation: totalRetrievalHydratedRecords / Math.max(invocations, 1),
        retrievalTopKReturnRate: pct(totalRetrievalTopKReturned, Math.max(totalRetrievalTopKRequested, 1)),
        retrievalZeroResultRate: pct(totalRetrievalZeroResults, Math.max(totalRetrievalCalls, 1)),
        retrievalFollowupRate: pct(totalRetrievalFollowups, Math.max(totalRetrievalCalls, 1)),
        retrievalCitationHitRateAvg: totalRetrievalCitationHitCount > 0
            ? totalRetrievalCitationHitRate / totalRetrievalCitationHitCount
            : 0,
        retrievalDomainBreakdown,
        retrievalStrategyBreakdown,
        byAgent,
        topTools,
        recommendations: [],
    };

    report.recommendations = computeRecommendations(report);

    return report;
}

export async function runAgentToolBenchmarkAction(input?: {
    days?: number;
    maxEvents?: number;
    topTools?: number;
}): Promise<AgentToolBenchmarkReport> {
    await requireUser(['super_user']);

    const days = Math.max(1, Math.min(input?.days ?? 30, 365));
    const maxEvents = Math.max(100, Math.min(input?.maxEvents ?? 2000, 10_000));
    const topTools = Math.max(3, Math.min(input?.topTools ?? 10, 30));

    const db = getAdminFirestore();
    const snapshot = await db
        .collection('agent_telemetry')
        .orderBy('timestamp', 'desc')
        .limit(maxEvents)
        .get();

    const events: AgentTelemetryLike[] = snapshot.docs.map((doc) => {
        const data = doc.data() as AgentTelemetryLike;
        return {
            ...data,
            timestamp: data.timestamp,
        };
    });

    return buildAgentToolBenchmarkReport(events, days, topTools);
}
