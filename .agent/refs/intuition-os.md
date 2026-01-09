# Intuition OS Reference

## Overview
Intuition OS handles **system-initiated** insights — proactive intelligence that anticipates user needs.

---

## Core Philosophy

> "Anticipate, Don't Just React."

While Intention OS handles user-initiated queries, Intuition OS surfaces insights before users ask.

---

## Proactive Inference Triggers

| Trigger | Example | Agent |
|---------|---------|-------|
| **Anomaly Detection** | Sales dropped 40% mid-day | Pops |
| **Pattern Recognition** | Mondays underperform → Suggest promo | Craig |
| **Churn Prediction** | High-LTV customers inactive 14+ days | Mrs. Parker |
| **Opportunity Detection** | Shelf doesn't match sales → Reallocation | Money Mike |
| **Context Inference** | Minimal query + role → Infer intent | Any |

---

## Insight Schema

```typescript
interface IntuitionInsight {
  contextInferred: string[];     // What we observed
  proactiveInsight: string;      // What we think user needs
  confidenceLevel: 'high' | 'medium' | 'low';
  triggerCondition: string;      // When this triggers
}
```

---

## Output Pattern

When an insight is detected, agents format output like:

```
💡 **[Intuition OS: Insight Detected]**

I noticed you're looking at [X] data. Based on patterns:

**What I'm seeing:**
📉 [Observation 1]
📊 [Observation 2]

**What I think you might be wondering:**
"[Anticipated question]"

**Proactive Suggestion:**
[Actionable recommendation]

Would you like me to [specific action]?
```

---

## Implementation

### Analyzer Steps
**File**: `src/server/intuition/analyzer.ts`

The Intuition Analyzer runs through context detection steps:

1. **Context Analysis** — Infer user's likely intent
2. **Pattern Detection** — Check for anomalies or trends
3. **Proactive Suggestion** — Generate actionable insight

### Integration with Chat
Intuition OS hooks into the chat flow to surface insights alongside agent responses.

---

## Related Files
- `src/server/intuition/` — Core implementation
- `src/server/intuition/analyzer.ts` — Main analyzer
