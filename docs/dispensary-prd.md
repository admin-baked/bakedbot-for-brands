# PRD — Dispensary Workspace Condense (Menu OS + Automation + Revenue Intelligence + Setup)

## Document Control
- **Owner:** Product + Engineering
- **Status:** Draft v1
- **Scope window:** Next 2–3 sprints
- **Related docs:**
  - `docs/dispensary-condensed-user-paths.md`
  - `docs/dispensary-pages-audit.md`

---

## 1) Problem Statement
Dispensary users experience BakedBot as fragmented across too many pages. Core jobs (sync menu, resolve exceptions, run automations, review outcomes) require deep navigation and weak cross-surface context.

### Current pain
1. Operators cannot quickly answer: **“Is my menu healthy right now?”**
2. Playbooks can appear enabled without obvious run health context.
3. Analytics/goals recommendations lack a unified weekly operating loop.
4. Setup/admin paths are mixed with daily execution paths, increasing noise.

### Product objective
Deliver a condensed, Thrive-style operator experience where users can complete the top daily/weekly workflows in one tight loop.

---

## 2) Goals & Non-Goals

## Goals
1. Reduce perceived bloat by consolidating navigation into **4 workspaces**.
2. Center daily activity on **Menu OS Home** with a single health strip.
3. Tie automations and goals to measurable weekly review behavior.
4. Preserve route compatibility while reducing top-level clutter.

## Non-Goals
1. Rebuilding all underlying service logic (POS, analytics, playbooks) from scratch.
2. Breaking existing links/routes used by customers or internal teams.
3. Redesigning every visual component in this phase.

---

## 3) Personas & Jobs-to-be-Done

### Persona A — Daily Operator (GM / Inventory / Marketing)
- **JTBD:** Keep catalog and budtender current, resolve only critical issues fast.
- **Success:** Detect problems in <60s, fix in <5m.

### Persona B — Weekly Growth Owner
- **JTBD:** Understand performance changes and launch next best actions.
- **Success:** Move from insight → action in one session.

### Persona C — Admin / Implementer
- **JTBD:** Complete setup and controls without impacting daily operations.
- **Success:** 100% setup completeness and safe role/permission posture.

---

## 4) User Flows (MVP)

## Flow A — Daily Operator Loop
1. Land on **Menu OS Home**.
2. Read health strip (sync status, reconciliation delta, analytics freshness, playbook health).
3. Execute “Sync now” if stale.
4. Resolve exceptions queue.
5. Publish merchandising updates.

### Acceptance criteria
- Health strip visible on first load.
- Exceptions are prioritized/severity-tagged.
- Successful sync updates timestamps and status.

## Flow B — Weekly Growth Loop
1. Open **Revenue Intelligence**.
2. Review goal suggestions (with cache freshness metadata).
3. Adopt/adjust 1–3 goals.
4. Trigger recommended playbooks.
5. Review impact panel in next session.

### Acceptance criteria
- Goal suggestions show source + generated/expiry times.
- Users can force refresh suggestions.
- Playbook impact is linked to active goals.

## Flow C — Setup/Admin Loop
1. Open **Setup** workspace.
2. Complete POS + Brand Guide + role defaults.
3. Resolve any validation failures in-context.

### Acceptance criteria
- Setup checklist completion is explicit.
- Save paths are stable and tenant-scoped.

---

## 5) Information Architecture
Top-level workspaces:
1. **Menu OS**
2. **Automation**
3. **Revenue Intelligence**
4. **Setup**

Rules:
- Keep current routes for backward compatibility.
- Move long-tail pages to contextual drawers/secondary navigation.
- Use task-first cards over page-first listing where possible.

---

## 6) Requirements

## Functional
1. Menu OS Home with health strip and exception queue.
2. Unified sync warning language across menu/products/analytics.
3. Playbook cards include run health chips (last run, next run, last error).
4. Goals recommendation panel includes cache metadata and force refresh.
5. Workspace defaults can be role-aware (P2).

## Data/Contract
1. Health strip fields must be produced from canonical backend sources (no mock-only state).
2. Goal suggestion meta contract includes `source`, `generatedAt`, `expiresAt`.
3. Playbook health contract includes schedule + recent run/error snapshot.

## Reliability
1. No destructive sync behavior on suspicious product drops.
2. All critical failures are observable with org/user context.

---

## 7) Metrics

## North-star
- **Session Workflow Completion Rate:** % sessions completing a top 3 workflow without deep nav.

## Supporting
1. Time to first successful menu sync after login.
2. % sessions with goals + playbook action in same session.
3. Reduction in support tickets:
   - product mismatch
   - analytics empty state
   - playbook enabled/not-running confusion

---

## 8) Rollout Plan

### Phase 1 (P0)
- Menu OS Home
- Health strip v1
- Exception language consistency

### Phase 2 (P1)
- Composer tab consolidation
- Playbook run-health chips
- Goals cache metadata UX

### Phase 3 (P2)
- Role-based workspace defaults
- Deeper personalization

---

## 9) Risks & Mitigations
1. **Risk:** Hidden regressions in legacy routes.
   - **Mitigation:** Maintain route compatibility + smoke tests per workspace.
2. **Risk:** Inconsistent backend freshness signals.
   - **Mitigation:** Canonical freshness contract and explicit fallback states.
3. **Risk:** UI simplification hides advanced controls.
   - **Mitigation:** Contextual drawer links to advanced pages.

---

## 10) Open Questions
1. Should playbook health be computed server-side snapshot vs client-composed from multiple endpoints?
2. What threshold defines “stale analytics” by tenant profile?
3. Which roles should receive each workspace as default landing at launch?
