# Intention OS Reference

## Overview
Intention OS ensures agents **interpret before executing** — solving the "confidently wrong" problem.

---

## Core Philosophy

> "Interpretation First, Execution Second."

Separating **Perception** from **Action** prevents agents from taking wrong actions based on misunderstood intent.

---

## The 3 Laws of Intention

### Law 1: The Semantic Commit
Agents generate a JSON `IntentCommit` artifact **before** any significant action.

```typescript
interface IntentCommit {
  goal: string;           // What user wants
  assumptions: string[];  // What we're assuming
  constraints: string[];  // Perceived limitations
  confidence: number;     // 0-1 confidence score
}
```

### Law 2: The "Ask First" Protocol
If confidence < 0.8, agent MUST ask clarification. Guessing is forbidden.

**Bad:**
> User: "Fix menu"  
> Agent: *Deletes 50 items*

**Good:**
> User: "Fix menu"  
> Agent: "Do you want to sync prices or update descriptions?"

### Law 3: Artifact Permanence
Intent is stored in Firestore for audit: "What agent *thought* vs. what it *did*."

---

## Discovery-First Protocol

For complex tasks, agents generate a **Configuration Checklist** before execution:

```typescript
interface TaskConfiguration {
  required: string[];      // MUST ask before proceeding
  optional: string[];      // Can assume defaults
  assumptions: string[];   // State explicitly
}
```

### Example Output

```
🎯 **To set up this task, I need to understand:**

1. Which competitors should I monitor?
2. What products/services should I track?
3. Where do I find their pricing? (websites/APIs)
4. How often should I check? (hourly/daily/weekly)
5. How should I alert you? (email/Slack/SMS)

Please provide these details, or I can start with defaults.
```

---

## Implementation

### In Agent Flows
Agents check intent confidence before executing:

```typescript
const intent = await analyzeIntent(userMessage);

if (intent.confidence < 0.8) {
  return askClarification(intent.ambiguities);
}

// Proceed with action
await executeAction(intent);
```

---

## Related Files
- `src/server/intuition/` — Shared with Intuition OS
- Agent system prompts — Include "Ask First" instructions
