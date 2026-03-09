import { buildAgentToolBenchmarkReport } from '../tool-benchmark-report';

describe('buildAgentToolBenchmarkReport', () => {
    it('computes aggregate metrics and recommendations', () => {
        const now = new Date();
        const events = [
            {
                agentName: 'Smokey',
                timestamp: now,
                success: true,
                totalTokens: 2500,
                toolCallCount: 2,
                toolCalls: [
                    { name: 'find_menu_items', status: 'success' },
                    { name: 'lookup_compliance_rule', status: 'error' },
                ],
                toolDefinitionTokens: 12000,
                toolResultTokens: 6400,
                toolSelectionMisses: 1,
                toolParamValidationErrors: 1,
                deadEndLoopCount: 0,
                capabilityUtilization: 0.2,
                totalLatencyMs: 1000,
                lancedbQueryCount: 3,
                lancedbVectorQueryCount: 2,
                lancedbFtsQueryCount: 0,
                lancedbHybridQueryCount: 1,
                lancedbRerankCount: 1,
                lancedbEmptyResultCount: 1,
                lancedbRetrievedCandidateCount: 30,
                lancedbConsumedCandidateCount: 8,
                lancedbFilterSelectivityAvg: 0.45,
                retrievalMetrics: [
                    {
                        retrieval_domain: 'catalog',
                        retrieval_strategy: 'hybrid',
                        applied_filters: ['store_id', 'status'],
                        top_k_requested: 12,
                        top_k_returned: 8,
                        hydrated_record_count: 3,
                        retrieval_latency_ms: 240,
                        result_payload_tokens: 900,
                        zero_result: false,
                        user_followup_needed: false,
                        citation_hit_rate: 0.9,
                    },
                    {
                        retrieval_domain: 'analytics',
                        retrieval_strategy: 'vector',
                        applied_filters: ['time_range'],
                        top_k_requested: 10,
                        top_k_returned: 0,
                        hydrated_record_count: 0,
                        retrieval_latency_ms: 180,
                        result_payload_tokens: 120,
                        zero_result: true,
                        user_followup_needed: true,
                        citation_hit_rate: 0.5,
                    },
                ],
            },
            {
                agentName: 'Craig',
                timestamp: now,
                success: true,
                totalTokens: 1600,
                toolCallCount: 1,
                toolCalls: [{ name: 'draft_campaign', status: 'success' }],
                toolDefinitionTokens: 2000,
                toolResultTokens: 1200,
                toolSelectionMisses: 0,
                toolParamValidationErrors: 0,
                deadEndLoopCount: 0,
                capabilityUtilization: 0.1,
                totalLatencyMs: 700,
                lancedbQueryCount: 2,
                lancedbVectorQueryCount: 0,
                lancedbFtsQueryCount: 1,
                lancedbHybridQueryCount: 1,
                lancedbRerankCount: 1,
                lancedbEmptyResultCount: 0,
                lancedbRetrievedCandidateCount: 20,
                lancedbConsumedCandidateCount: 10,
                lancedbFilterSelectivityAvg: 0.6,
                retrievalMetrics: [
                    {
                        retrieval_domain: 'knowledge',
                        retrieval_strategy: 'fts',
                        applied_filters: ['doc_type'],
                        top_k_requested: 8,
                        top_k_returned: 6,
                        hydrated_record_count: 2,
                        retrieval_latency_ms: 150,
                        result_payload_tokens: 500,
                        zero_result: false,
                        user_followup_needed: false,
                        citation_hit_rate: 0.85,
                    },
                ],
            },
        ];

        const report = buildAgentToolBenchmarkReport(events, 30, 5);

        expect(report.eventsInWindow).toBe(2);
        expect(report.avgTokensPerInvocation).toBe(2050);
        expect(report.toolErrorRate).toBeCloseTo(33.333, 2);
        expect(report.byAgent).toHaveLength(2);
        expect(report.topTools[0]?.name).toBe('find_menu_items');
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.lancedbQueriesPerInvocation).toBe(2.5);
        expect(report.lancedbModeMix.vector).toBe(2);
        expect(report.lancedbModeMix.fts).toBe(1);
        expect(report.lancedbModeMix.hybrid).toBe(2);
        expect(report.lancedbConsumptionRate).toBeCloseTo(36, 1);
        expect(report.retrievalCallsPerInvocation).toBe(1.5);
        expect(report.retrievalZeroResultRate).toBeCloseTo(33.33, 1);
        expect(report.retrievalTopKReturnRate).toBeCloseTo(46.67, 1);
        expect(report.retrievalDomainBreakdown.catalog).toBe(1);
        expect(report.retrievalStrategyBreakdown.hybrid).toBe(1);
    });

    it('returns zero-safe metrics for empty windows', () => {
        const oldDate = new Date('2020-01-01T00:00:00.000Z');
        const report = buildAgentToolBenchmarkReport([
            {
                agentName: 'Smokey',
                timestamp: oldDate,
                success: false,
                totalTokens: 100,
                toolCallCount: 1,
                toolCalls: [{ name: 'legacy_tool', status: 'error' }],
            },
        ], 1, 5);

        expect(report.eventsInWindow).toBe(0);
        expect(report.avgTokensPerInvocation).toBe(0);
        expect(report.toolErrorRate).toBe(0);
    });
});
