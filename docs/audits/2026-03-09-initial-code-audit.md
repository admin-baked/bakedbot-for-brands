# BakedBot Initial Code Audit (Wave 1)

**Date:** 2026-03-09  
**Scope:** Initial static scan to begin the codebase quality audit and identify high-value, low-risk hardening opportunities.

## What was audited

- Typed-safety hotspots (`any`, unsafe patterns, suppression hints)
- Embed runtime safety for locator bootstrap flow
- PR/engineering standard alignment with implementation cleanup opportunities

## Immediate fixes shipped in this wave

1. **Embed locator type-safety improvement**
   - Replaced `useState<any[]>` with `useState<Retailer[]>` in `src/embed/locator.tsx`.
   - Removes one unsafe container in an embed entrypoint and aligns it with canonical domain typing.

2. **Embed locator effect cleanup hardening**
   - Added timeout cleanup in `useEffect` so pending timers are cleared on unmount/rerender.
   - Reduces risk of stale state updates and memory leaks in embedded contexts.

## Findings from initial scan

### High-signal debt patterns detected

- Widespread `any` usage across shared `src/types/*` modules and workflow-related server paths.
- Mixed suppression patterns (`eslint-disable`) around dynamic import and hook dependencies.
- Several TODO-marked orchestration areas in task/agent paths that likely need failure-mode hardening.

## Recommended next audit waves

### Wave 2 — Type safety in shared models (Tier 1)

- Replace unsafe `any` in high-traffic shared type modules (agents, tasks, events, integrations).
- Introduce narrower aliases where full modeling is expensive to avoid broad `any` reintroduction.

### Wave 3 — Workflow correctness (Tier 2)

- Audit task engine + agent tool invocation flows for:
  - duplicate-event handling
  - retry/idempotency behavior
  - partial failure observability

### Wave 4 — Tenant/auth boundary checks (Tier 3)

- Focused audit of endpoints and service boundaries touching org-scoped data.
- Verify canonical permission checks and session-derived identity usage.

## Exit criteria for this wave

- One concrete code safety improvement merged.
- First audit artifact published with prioritized follow-up plan.

## Audit Progress

- Wave 2 follow-up completed: `docs/audits/2026-03-09-wave2-agent-web-types.md`
