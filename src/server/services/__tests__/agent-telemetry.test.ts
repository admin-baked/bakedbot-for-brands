import { buildTelemetryEvent, estimateCost } from '../agent-telemetry';

describe('agent-telemetry', () => {
    it('computes tool error metrics and optional benchmarking fields', () => {
        const event = buildTelemetryEvent({
            agentName: 'Smokey',
            model: 'claude-sonnet-4-6',
            inputTokens: 1000,
            outputTokens: 300,
            toolExecutions: [
                { name: 'find_menu_items', durationMs: 80, status: 'success' },
                { name: 'lookup_compliance_rule', durationMs: 110, status: 'error' },
            ],
            totalLatencyMs: 900,
            success: false,
            availableToolCount: 10,
            toolRetryCount: 1,
            toolSelectionMisses: 1,
            toolParamValidationErrors: 2,
            deadEndLoopCount: 0,
            toolDefinitionTokens: 12000,
            toolResultTokens: 6400,
            cacheReadTokens: 400,
            cacheWriteTokens: 0,
            lancedbQueryCount: 4,
            lancedbVectorQueryCount: 2,
            lancedbFtsQueryCount: 1,
            lancedbHybridQueryCount: 1,
            lancedbRerankCount: 2,
            lancedbEmptyResultCount: 1,
            lancedbRetrievedCandidateCount: 40,
            lancedbConsumedCandidateCount: 12,
            lancedbFilterSelectivityAvg: 0.5,
            retrievalMetrics: [
                {
                    retrieval_domain: 'catalog',
                    retrieval_strategy: 'hybrid',
                    applied_filters: ['store_id'],
                    top_k_requested: 12,
                    top_k_returned: 7,
                    hydrated_record_count: 2,
                    retrieval_latency_ms: 120,
                    result_payload_tokens: 420,
                    zero_result: false,
                    user_followup_needed: false,
                    citation_hit_rate: 0.88,
                },
            ],
        });

        expect(event.toolCallCount).toBe(2);
        expect(event.toolErrorCount).toBe(1);
        expect(event.toolErrorRate).toBe(50);
        expect(event.capabilityUtilization).toBe(0.2);
        expect(event.toolDefinitionTokens).toBe(12000);
        expect(event.toolResultTokens).toBe(6400);
        expect(event.toolSelectionMisses).toBe(1);
        expect(event.toolParamValidationErrors).toBe(2);
        expect(event.cacheReadTokens).toBe(400);
        expect(event.lancedbQueryCount).toBe(4);
        expect(event.lancedbHybridQueryCount).toBe(1);
        expect(event.lancedbFilterSelectivityAvg).toBe(0.5);
        expect(event.retrievalMetrics).toHaveLength(1);
        expect(event.retrievalMetrics?.[0].retrieval_strategy).toBe('hybrid');
    });

    it('uses default pricing for unknown models', () => {
        // DEFAULT_PRICING is Gemini 2.5 Flash: $0.30 input + $2.50 output per 1M tokens
        // 1M input + 1M output = $0.30 + $2.50 = $2.80
        const cost = estimateCost('unknown-model', 1_000_000, 1_000_000);
        expect(cost).toBeCloseTo(2.8);
    });
});
