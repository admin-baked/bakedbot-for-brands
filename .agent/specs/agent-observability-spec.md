# Agent Observability Spec

> Production spec for AI agent health metrics, dashboarding, and the "capability utilization" metric.

**Status:** Spec | **Owner:** Linus (CTO) | **Date:** 2026-02-25

---

## Problem

BakedBot's 12+ AI agents have no operational observability. We can't answer:
- How many tokens does each agent consume per day?
- Which agents are most/least expensive?
- Are agents using their available tools, or "forgetting" capabilities?
- What's the P95 latency for each agent?
- Which agents have the highest error rates?

## Solution

### Data Collection: `agent_telemetry` Firestore Collection

**Implementation:** `src/server/services/agent-telemetry.ts` (deployed)

Every `executeWithTools()` call with an `agentContext` writes a telemetry document:

```typescript
{
  agentName: string;          // "Linus", "Craig", "Smokey"
  invocationId: string;       // Unique ID for this invocation
  timestamp: Date;
  model: string;              // "claude-sonnet-4-5-20250929"
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  toolCalls: ToolCallRecord[]; // { name, durationMs, status }
  toolCallCount: number;
  uniqueToolsUsed: string[];
  totalLatencyMs: number;
  success: boolean;
  errorType?: string;
  costEstimateUsd: number;
  availableToolCount: number;
  capabilityUtilization: number; // 0.0 to 1.0
  // Denormalized for queries:
  _agentName: string;
  _date: string;              // "YYYY-MM-DD"
  _model: string;
}
```

### Dashboard Metrics (Cloud Monitoring + Firestore Queries)

#### Per-Agent Metrics (Daily Aggregation)

| Metric | Query | Alert Threshold |
|--------|-------|-----------------|
| **Invocations/day** | `WHERE _agentName = X AND _date = today` | < 1 during business hours |
| **P50/P95 latency** | Sort by `totalLatencyMs`, percentile | P95 > 30s |
| **Token cost/day** | `SUM(costEstimateUsd) WHERE _agentName = X AND _date = today` | > $50/day |
| **Error rate** | `COUNT(success=false) / COUNT(*) WHERE _agentName = X` | > 5% |
| **Tool call avg** | `AVG(toolCallCount) WHERE _agentName = X` | < 1 (agent not using tools) |
| **Capability utilization** | `AVG(capabilityUtilization) WHERE _agentName = X` | < 0.10 (forgetting) |

#### Cross-Agent Metrics

| Metric | Purpose |
|--------|---------|
| **Total daily spend** | Budget tracking across all agents |
| **Model distribution** | Sonnet vs Opus usage split |
| **Most-used tools** | Which tools drive the most value |
| **Least-used tools** | Candidates for removal or better prompting |
| **Forgetting score** | Agents with capabilityUtilization < 0.10 consistently |

### The "Forgetting" Metric

**Capability utilization** = `uniqueToolsUsed.length / availableToolCount`

This directly measures the problem: if an agent has 40 tools but only uses 3 per invocation, capability utilization is 0.075 — suggesting it's "forgetting" 92.5% of its capabilities.

**Tracking over time:**
- Before system prompt upgrade: baseline capabilityUtilization ~0.05–0.10
- After system prompt upgrade: target capabilityUtilization 0.15–0.30
- If it drops below baseline → the fix has regressed

### Firestore Indexes Required

```
Collection: agent_telemetry
Index 1: _agentName ASC, _date DESC, timestamp DESC
Index 2: _agentName ASC, success ASC, _date DESC
Index 3: _date DESC, costEstimateUsd DESC
```

### Retention Policy

- Keep detailed telemetry for 30 days
- Aggregate to daily summaries after 30 days (store in `agent_telemetry_daily`)
- Delete raw events after 90 days

## Acceptance Criteria

- [ ] Every `executeWithTools()` call with `agentContext` writes telemetry
- [ ] Telemetry write is fire-and-forget (never blocks agent response)
- [ ] Cost estimates match actual Anthropic billing within 10%
- [ ] Capability utilization metric correctly reflects tool usage
- [ ] Linus daily Slack report includes top-line agent metrics

## Out of Scope

- Real-time streaming dashboard (use Firestore queries for now)
- Gemini/Genkit agent telemetry (Claude agents only in v1)
- Custom alerting UI (use Cloud Monitoring alert policies)
