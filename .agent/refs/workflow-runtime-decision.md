# ADR: Workflow Runtime — V1 Legacy vs V2 Canonical

**Status:** Accepted  
**Date:** 2026-04-16  
**Deciders:** Engineering team  
**Canonical declaration:** `src/config/workflow-runtime.ts`

---

## Context

BakedBot has two distinct playbook execution engines that evolved over time:

**V1 (step-based)** — `src/server/services/playbook-executor.ts`  
Built early in the product. A 2,000+ line file that handles 23 action types sequentially, dispatching to agents by checking `step.action`. Execution is imperative: loop over steps, switch on action type, call the relevant handler, update Firestore, proceed. State is partially managed in Firestore but the control flow is inside the function itself.

**V2 (stage-based)** — `src/server/services/playbook-stage-runner.ts` + `src/server/services/playbook-stages/`  
Built to address V1's scaling limitations. A deterministic 7-stage state machine:

```
resolving_scope → extracting_questions → assembling_context
→ generating_output → validating → awaiting_approval → delivering
```

Each stage is a separate module with a typed contract (`StageExecutor`). State is owned by Firestore (`playbook_runs` + `playbook_run_stages`). The runner is a coordinator — it advances the state machine, it does not contain business logic.

---

## Decision

**V2 is the canonical runtime. V1 is legacy — maintenance-only.**

All new playbook development (templates, action types, workflow features) must target V2. V1 receives only:
- Bug fixes for assigned playbooks already running on V1
- Compatibility fixes (schema renames, field changes)
- Stability fixes (crashes, hangs)

This is enforced by:
1. `src/config/workflow-runtime.ts` — exports `CANONICAL_RUNTIME` and `LEGACY_RUNTIME_POSTURE` constants
2. Banner comments at the top of both executor files
3. This ADR as the human-readable rationale
4. (Future) `scripts/check-playbook-drift.ts` — static check that flags new V1 action types

---

## Rationale

| Concern | V1 | V2 |
|---------|----|----|
| **Testability** | Hard — monolithic function, no seams | Good — each stage executor is independently testable |
| **Observability** | Limited — single log per execution | Full — per-stage Firestore record, telemetry, timing |
| **Resumability** | None — if it crashes mid-run, state is lost | Built-in — stage records allow replay from last checkpoint |
| **Parallelism** | Sequential only | Stage parallelism is structurally possible |
| **Adding action types** | Adds more lines to a 2k-line switch | New file in `playbook-stages/`, clear contract |
| **Approval flows** | Bolted on | First-class `awaiting_approval` stage |

V1 accumulated too much implicit state and too many special cases to safely extend. V2 provides the structural foundation for reliability and new workflow capabilities.

---

## Consequences

### Positive
- New features have a clear home
- V1 maintenance surface is bounded and shrinking
- Stage-level observability enables better debugging and customer support

### Negative
- Two runtimes exist simultaneously — ongoing maintenance split
- V1 playbooks cannot benefit from V2 stage observability without migration
- Some agents/action types only exist in V1 — migration required to unlock V2 benefits

### Migration path (future)
Playbooks tagged `legacy` in `PlaybookReadiness` (see `src/config/workflow-runtime.ts`) are candidates for V2 migration. Migration is not required now — only if a V1 playbook needs a new capability that V2 provides.

---

## Related files

| File | Role |
|------|------|
| `src/config/workflow-runtime.ts` | Canonical runtime constants + `PlaybookReadiness` type |
| `src/server/services/playbook-executor.ts` | V1 legacy runtime |
| `src/server/services/playbook-stage-runner.ts` | V2 canonical runtime |
| `src/server/services/playbook-stages/` | V2 stage executors |
| `src/types/playbook-v2.ts` | V2 type contracts |
| `src/types/playbook.ts` | Shared `Playbook` type (will gain `executionReadiness` field) |
