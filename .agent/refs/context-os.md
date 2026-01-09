# Context OS Reference

## Overview
Context OS is the "Decision Lineage Layer" — it captures the **why** behind every decision, not just the data.

---

## Core Philosophy

> "The winners won't be those with the most data; they'll be those with the best **Context Engineering**."

| Traditional Systems | Context OS |
|---------------------|------------|
| Records **what** happened | Captures **why** it happened |
| Static data warehouses | Living decision traces |
| Lost tribal knowledge | Searchable, scalable context |
| Fragile AI (wrong values) | Grounded AI (policy-aware) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Agent Makes Decision           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│           DecisionTrace Created             │
│  • agentId, task, inputs                    │
│  • reasoning (from LLM)                     │
│  • outcome, evaluators                      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Firestore: decision_traces         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          Context Query Engine              │
│     "Why did we reject that order?"        │
└─────────────────────────────────────────────┘
```

---

## Decision Trace Schema

```typescript
interface DecisionTrace {
  id: string;
  timestamp: Date;
  agentId: string;           // Who decided
  task: string;              // What was asked
  inputs: Record<string, any>; // Context available
  reasoning: string;         // Why (from agent)
  outcome: 'approved' | 'rejected' | 'modified';
  evaluators: EvaluatorResult[]; // Gauntlet verification
  linkedDecisions?: string[]; // Related decisions
  metadata: { 
    brandId?: string; 
    userId?: string; 
    sessionId?: string; 
  };
}
```

---

## Agent Tools

| Tool | Description |
|------|-------------|
| `context_ask_why` | Query the decision graph |
| `context_log_decision` | Explicitly log business decisions |

### Usage
```typescript
// Log a decision
await contextLogDecision({
  task: 'Price adjustment for Blue Dream',
  inputs: { currentPrice: 45, competitorPrice: 40 },
  reasoning: 'Competitor undercut by $5, matching to stay competitive',
  outcome: 'modified'
});

// Query history
const result = await contextAskWhy({
  query: 'Why did we change Blue Dream pricing last week?'
});
```

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Decision Log | 🟢 Phase 1 (Live) |
| Context Query | 🟡 Phase 2 |
| GraphRAG | ⚪ Phase 3 |

---

## Related Files
- `src/server/services/context-os/` — Core implementation
- `src/server/tools/context-tools.ts` — Agent tools
