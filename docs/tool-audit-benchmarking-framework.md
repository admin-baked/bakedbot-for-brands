# Tool+ / BakedBot Agent Tooling Audit & Benchmark Framework

This framework is designed to reduce tool-token bloat, improve tool selection/parameter accuracy, and create a measurable benchmark loop for agent orchestration quality.

## 1) Measurement Model

Track these metrics **per invocation** and aggregate by agent + scenario:

- `totalTokens`
- `toolDefinitionTokens` (prompt/tool schema overhead)
- `toolResultTokens` (intermediate result overhead)
- `toolCallCount`
- `toolErrorCount`
- `toolErrorRate`
- `toolSelectionMisses`
- `toolParamValidationErrors`
- `deadEndLoopCount`
- `capabilityUtilization`
- `totalLatencyMs`

### Core benchmark KPIs

1. **Tool-definition bloat ratio**
   - `toolDefinitionTokens / totalTokens`
   - Alert if this sustains high values or `toolDefinitionTokens > 10k`

2. **Intermediate-result bloat ratio**
   - `toolResultTokens / totalTokens`
   - Elevated ratios indicate over-chatty tool chaining

3. **Tool accuracy index**
   - Composite: `toolErrorRate`, `toolSelectionMisses`, `toolParamValidationErrors`

4. **Orchestration efficiency**
   - `toolCallCount`, `totalLatencyMs`, `deadEndLoopCount`

5. **Capability utilization health**
   - Ensures right-sized tool surface is actually used

## 2) Routing policy benchmark targets

Use these targets when deciding orchestration mode:

- **Direct tool call**: single-step lookup/action, low ambiguity
- **Search registry + direct call**: 20+ tools or uncertain intent
- **Composed backend tool**: repeated deterministic workflows
- **Programmatic tool calling (code mode)**: batch/fan-out/fan-in analysis

### Suggested guardrails

- Prefer composed tools when average call chains exceed `3+` dependent tools
- Trigger registry search when tool-definition payload exceeds `10k` tokens
- Require tool examples on tools with repeated param validation errors

## 3) Benchmark suites (golden scenarios)

Maintain scenario sets by agent:

- **Smokey**: product lookup, availability updates, compliance-sensitive queries
- **Craig**: campaign drafting, audience segment lookup, content channel planning
- **BI/Finance**: multi-store analytics, anomaly ranking, margin threshold analysis
- **Compliance**: policy checks, risk escalation decisions

Each scenario should capture:
- expected tool family
- max acceptable tool calls
- max acceptable latency
- max param/selection errors

## 4) New audit script workflow

Use telemetry exports (JSON/NDJSON) and run:

```bash
node scripts/audit-agent-tools.mjs --input <telemetry-file> --days 30 --top 10
```

The script reports:
- fleet-level KPI summary
- per-agent tooling profile
- top tools used
- threshold-based recommendations for bloat/accuracy fixes

## 5) Iteration loop

1. Run benchmark suite weekly (or per release).
2. Identify top 3 bottlenecks by KPI regression.
3. Apply one orchestration change class at a time:
   - tool surface reduction
   - composed tool addition
   - tool examples/schema fixes
   - caching improvements
4. Re-run and compare deltas.
5. Promote only changes that improve cost + latency + tool accuracy together.
