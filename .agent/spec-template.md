# Spec Template — `.agent/spec-template.md`

> **Rule:** Every task MUST produce a completed spec before any implementation code is written.
> The human reviews and approves (or rejects/modifies) this spec. No exceptions.

---

## Task Spec: `[FEATURE_NAME]`

**Date:** YYYY-MM-DD
**Requested by:** [name or "self-initiated"]
**Spec status:** 🟡 Draft | 🟢 Approved | 🔴 Rejected

---

### 1. Intent (Why)

_One sentence tying this to a business outcome — revenue, retention, compliance, DX, or reliability._

> Example: "Reduce Smokey hallucination rate on out-of-stock products to protect dispensary trust."

### 2. Scope (What)

**Files affected:**
- `path/to/file.ts` — [what changes]
- `path/to/new-file.ts` — [new, purpose]

**Files explicitly NOT touched:**
- `path/to/boundary.ts` — [why it's out of scope]

**Estimated diff size:** ___ lines (target < 400 per Constitution §II)

### 3. Boundary Check

Answer each. If ANY are "Yes" → escalate to full RFC before proceeding.

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | | |
| Touches payment or billing? | | |
| Modifies database schema? | | |
| Changes infra cost profile (new service, higher tier, etc.)? | | |
| Modifies LLM prompts or agent behavior? | | If yes → golden set eval required |
| Touches compliance logic (Deebo, age-gate, TCPA)? | | If yes → zero-tolerance accuracy rules apply |
| Adds new external dependency? | | If yes → justify in notes |

**Escalation needed?** Yes / No
**If yes, RFC location:** `docs/rfcs/RFC-XXX.md`

### 4. Implementation Plan

_Ordered steps the Builder agent will follow. Be specific enough that another agent could execute this without clarification._

1. Step one...
2. Step two...
3. Step three...

### 5. Test Plan

**Unit tests:**
- [ ] `test_name` — validates [behavior]
- [ ] `test_name` — validates [edge case]

**Integration tests (if applicable):**
- [ ] `test_name` — validates [cross-system behavior]

**Golden set eval (if LLM/prompt change):**
- [ ] Run `golden-sets/[agent]-qa.json` — target: ≥90% accuracy, 100% on compliance
- [ ] Compare before/after scores

**Manual smoke test (if UI change):**
- [ ] [Description of what to visually verify]

### 6. Rollback Plan

_How do we undo this if it breaks production?_

| Strategy | Details |
|---|---|
| Single commit revert? | Yes / No |
| Feature flag? | Flag name: `___` |
| Data migration rollback needed? | Yes / No — [details] |
| Downstream services affected? | [list or "none"] |

### 7. Success Criteria

_How do we know this shipped correctly? Be measurable._

- [ ] All tests pass (zero regressions)
- [ ] [Specific metric] improves by [amount]
- [ ] No new errors in logs within 24h
- [ ] [Business outcome observable within timeframe]

---

### Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

---

_After approval, proceed to implementation per `.agent/prime.md` Workflow Protocol._
