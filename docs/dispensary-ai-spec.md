# AI Spec — Dispensary Condensed Workspaces

## Document Control
- **Owner:** AI/Platform Engineering
- **Status:** Draft v1
- **Depends on:** `docs/dispensary-prd.md`, `docs/dispensary-condensed-user-paths.md`

---

## 1) Purpose
Define AI-facing behaviors, contracts, and observability for the condensed dispensary experience so recommendations and automations are explainable, tenant-safe, and actionable.

---

## 2) Scope

## In Scope
1. Goal suggestion generation and caching semantics.
2. Playbook recommendation and run-health summarization.
3. Operator-facing insight narration for Revenue Intelligence.
4. Health-strip AI annotations (explain "what changed / what to do").

## Out of Scope
1. Retraining foundation models.
2. Replacing deterministic business-critical computations (e.g., order totals).
3. Any permission bypass through AI surfaces.

---

## 3) Canonical AI Surfaces

1. **Goals suggestion endpoint** (`/api/goals/suggest`)
   - Uses org data to generate 3–5 suggested goals.
   - Supports cached reads and forced refresh.
2. **Revenue Intelligence narrative panel**
   - Produces concise summary: change, cause hypothesis, recommended next action.
3. **Automation recommendations**
   - Maps active goals to playbook suggestions.
4. **Menu OS health annotations**
   - Converts raw health-strip statuses into operator guidance.

---

## 4) Data Contracts

## 4.1 Goal Suggestion Response
Required fields:
- `success: boolean`
- `suggestions: SuggestedGoal[]`
- `meta.source: 'cache' | 'ai'`
- `meta.generatedAt: ISO timestamp`
- `meta.expiresAt: ISO timestamp`

### Behavioral requirements
1. `forceRefresh=true` bypasses cache.
2. Cached responses must include valid `expiresAt`.
3. Invalid/expired cache triggers regeneration.

## 4.2 Playbook Run Health Snapshot
Required per playbook card:
- `lastRunAt` (nullable)
- `nextRunAt` (nullable)
- `lastError` (nullable short string)
- `status: healthy | warning | failing | paused`

## 4.3 Health Strip Snapshot
Required global fields:
- `posSyncFreshness`
- `reconciliationDelta`
- `analyticsFreshness`
- `playbookHealthAggregate`

---

## 5) Decisioning Rules

## Goals (AI)
1. Must avoid duplicate active goals.
2. Should prioritize biggest measurable business gaps.
3. Must produce measurable targets and category/timeframe values.

## Recommendations (AI + deterministic)
1. AI proposes actions; deterministic guards validate permission, org scope, and required prerequisites.
2. When confidence/data quality is low, model must output explicit caveat and safer fallback action.

## Health Annotation
1. If any critical health signal is stale/failing, recommendation priority is remediation before growth actions.
2. “No action needed” only when all key signals are fresh/healthy.

---

## 6) Prompting & Explainability Standards
1. Use concise, operator-readable language.
2. Ground outputs in concrete data points (counts, rates, freshness timestamps).
3. Include “why this matters” for each suggested action.
4. Avoid speculative claims when required data is absent.

---

## 7) Failure Modes
1. **Missing org context:** return auth/tenant error; no fallback to global data.
2. **Partial data availability:** degrade gracefully with explicit missing-source callout.
3. **Model parse failure:** fail with structured error and server logs; do not silently emit malformed suggestions.
4. **Stale cache metadata:** invalidate and regenerate.

---

## 8) Observability
Structured logs must include:
- `orgId`, `uid` (when available), surface name
- request mode (`cached` vs `forceRefresh`)
- suggestion count, cache hit/miss
- generation latency and parse status
- key failure reason codes

Recommended metrics:
1. goal_suggestions.cache_hit_rate
2. goal_suggestions.force_refresh_rate
3. goal_suggestions.parse_error_rate
4. playbook_health.failing_count
5. workspace.workflow_completion_rate

---

## 9) Safety, Auth, and Tenancy
1. All AI calls must be org-scoped.
2. Never use AI output to bypass canonical permission checks.
3. Persist auditable metadata for side-effecting AI-assisted actions.

---

## 10) Evaluation Plan

## Offline checks
1. Golden-set validation for suggestion JSON schema compliance.
2. Hallucination checks against known tenant metrics.

## Online checks
1. A/B compare recommendation adoption rate with/without freshness metadata.
2. Monitor manual override and dismiss rates for recommendation quality signal.

---

## 11) Rollout Strategy
1. Ship instrumentation first.
2. Enable UI metadata display and force-refresh controls.
3. Roll out playbook health chips and health annotations behind feature flags.
4. Expand role-based defaults once workflow metrics stabilize.
