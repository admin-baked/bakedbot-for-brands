# Dispensary Pages Audit — Organization, Reliability, and Operating Model

## Scope
This audit reviews how dispensary-facing pages, tools, components, and analytics are currently organized, then proposes a tighter architecture around:

1. Launching and operating a **headless menu + budtender** quickly.
2. Reliable **AI Agents + Playbooks** operations.
3. Trusted **POS-synced data** for products, orders, customers, goals, and analytics.

---

## Current State Findings

### 1) Navigation and information architecture is fragmented
- The route surface is very broad under `src/app/dashboard/*` (many overlapping operational domains), which increases cognitive load and makes ownership boundaries unclear.
- Multiple navigation patterns exist (for example, centralized dashboard nav config vs role-specific page structures), making it hard to keep menu/products/playbooks/goals/analytics aligned in one operator journey.

**Evidence in code**
- Broad dashboard route tree under `src/app/dashboard/*` (menu, products, carousels, heroes, bundles, playbooks, goals, analytics, settings, etc.).
- Separate nav definition in `src/lib/dashboard-nav.ts` includes both overlapping and “coming-soon” sections that don’t map cleanly to the most critical dispensary workflow.

### 2) Playbooks surface mixes static UI playbooks with operational playbook systems
- `src/app/dashboard/playbooks/page.tsx` uses local state with static `PLAYBOOKS` from `src/app/dashboard/playbooks/data.ts` for parts of behavior.
- In parallel, there is a deeper assignment/execution system in server-side modules (`src/lib/playbooks/*`, `src/server/actions/*`, `src/app/api/cron/playbook-runner/*`) and role-specific variants.
- This split likely contributes to confusion when validating whether “Competitive Intelligence playbook is truly active and running” vs merely toggled in UI.

### 3) Goals has no weekly suggestion cache policy and has collection-path drift
- Goals client auto-suggests when there are no saved goals on first mount.
- Suggested goal generation endpoint performs fresh AI analysis each time it is called; there is no persisted “generatedAt + TTL” cache policy.
- In the same endpoint, active goals are queried from `tenants/{orgId}/goals` while goals page/server actions use `orgs/{orgId}/goals`, creating path inconsistency and potential duplicate/irrelevant suggestions.

### 4) Analytics is structurally disconnected from dispensary data freshness guarantees
- `src/app/dashboard/analytics/actions.ts` computes analytics from `orders` and `organizations/{brandId}/analytics`.
- If `organizations/{brandId}/analytics` channel/session data is sparse or missing, many dashboard panels become empty while orders-derived metrics may still exist.
- There is no shared “data freshness contract” exposed to the UI, so operators see “empty analytics” without clear source diagnostics.

### 5) Menu and Products use overlapping but non-identical data access patterns
- Sync writes to legacy `products` and also to tenant catalog `tenants/{orgId}/publicViews/products/items`.
- Menu loads through location/org fallback logic, Products page loads through its own location/org fallback logic.
- Product counts can diverge when one surface reads a different source path or freshness marker than another.

### 6) Brand Guide save reliability issue likely impacts downstream setup confidence
- Brand Guide settings page depends on server actions and rich client workflow.
- Reported “failed to find server action” runtime error suggests deployment/build-version mismatch risk for critical setup actions, reducing trust in setup persistence.

---

## Root-Cause Themes

1. **Parallel source-of-truth paths** (legacy products, tenant catalog, analytics aggregates, static playbook definitions).
2. **Workflow fragmentation** across adjacent operational pages (Products, Menu, Carousels, Heroes, Bundles).
3. **Insufficient system-level freshness metadata** surfaced to operators.
4. **Inconsistent collection conventions** (`orgs/*` vs `tenants/*` for closely related domains).

---

## Target Operating Model (Recommended)

## A) Product architecture around one operator journey
Organize dispensary operations around 4 top-level workspaces:

1. **Menu OS (Primary)**
   - Live POS Sync status + reconciliation
   - Product catalog (currently Products)
   - Merchandising composer (Carousels + Heroes + Bundles consolidated)
   - Live headless preview + publish controls
   - Budtender readiness status

2. **Automation OS**
   - Playbooks (templates, assignments, schedules, run history)
   - Agent controls and permissions
   - Trigger health and delivery channels

3. **Revenue Intelligence**
   - Analytics + goals in one loop
   - Goal recommendations with weekly cached refresh and “data age” labels
   - Drilldowns directly linked to menu/products/actions

4. **Settings & Integrations**
   - Brand Guide
   - POS connections
   - Tenant/org profile, permissions, compliance settings

## B) Canonical data contracts
Define and enforce a canonical “Operational Snapshot” contract reused by Menu, Products, Analytics, and Goals:
- `products`: count, lastSyncAt, sourcePath, staleCount
- `orders`: 30-day volume/revenue + freshness
- `customers`: active segments + freshness
- `analytics`: derived KPIs + source availability flags
- `goals`: active goals + suggestion cache metadata (`generatedAt`, `expiresAt`)

## C) Playbooks reliability contract
For every playbook assignment, expose:
- `isEnabled`
- `schedule` / trigger definition
- `lastRunAt`
- `lastResult` (success/fail)
- `nextRunAt`
- `deliveryStatus`

This should back both card UI and diagnostics, so “on/off” always reflects runnable state.

---

## Bug-Focused Audit Backlog (Start Here)

### P0 — Competitive Intelligence Playbook
1. Trace assignment source, schedule docs, runner pickup, and execution writes.
2. Verify “enabled in UI” equals “scheduled and runnable”.
3. Add run-health indicator on playbook card (`lastRunAt`, `lastError`).
4. Add one-click “Run now + inspect logs” path for debugging.

### P0 — Brand Guide Save
1. Verify all save mutations are server-action stable in current deploy mode.
2. Add post-save read-after-write verification with clear failure reporting.
3. Add idempotent retry for transient action transport failures.

### P0 — Goals Cache + Data Accuracy
1. Add weekly cache for suggested goals at org scope.
2. Unify goals collection path usage (pick canonical org/tenant model).
3. Include data provenance in goal rationale (orders window, customer count, POS freshness).

### P0 — Analytics Empty States
1. Add freshness and source diagnostics per panel.
2. Distinguish true-zero vs missing-source states.
3. Backfill minimum analytics from orders when channel/session streams are absent.

### P0 — Menu/Product Count Reconciliation
1. Publish one canonical “POS count vs catalog count vs visible count” widget.
2. Use same repository path strategy for Menu and Products pages.
3. Keep incremental sync default: create/update/delete only diffs and expose counts.

### P1 — Merge Carousels/Heroes/Bundles into Menu composer
1. Move merchandising tools under Menu workspace tabs.
2. Ensure every merchandising change has immediate live preview.
3. Keep standalone routes temporarily as redirects to preserve links.

---

## Phased Execution Plan

### Phase 1 (Stabilize trust)
- Fix Competitive Intelligence playbook execution traceability.
- Fix Brand Guide save reliability.
- Implement goals weekly cache + path consistency.
- Add analytics data-source diagnostics.

### Phase 2 (Unify data contracts)
- Introduce shared operational snapshot consumed by Menu/Products/Analytics/Goals.
- Align Menu + Products loaders to the same canonical source strategy.

### Phase 3 (Reorganize UX around headless menu operations)
- Consolidate Carousels/Heroes/Bundles into Menu composer.
- Promote preview/publish/budtender readiness as the default operator flow.

---

## Risk Tier
**Tier 2** (cross-cutting product architecture + data consistency + playbook reliability).

---

## Failure Modes to Explicitly Guard
- Missing org context (`orgId` / `currentOrgId` drift).
- Stale analytics sources causing misleading zero states.
- Playbook toggled on but unscheduled or runner-disconnected.
- POS partial sync causing count mismatches.
- Server action version mismatch on critical setup flows (Brand Guide).

---

## Observability Requirements
For production debugging, standardize logs and metrics with:
- `orgId`, `locationId`, `playbookId`, `runId`, `syncRunId`
- per-sync counters: created/updated/deleted/skipped
- freshness timers: `lastSyncAt`, `lastAnalyticsAt`, `lastGoalSuggestionAt`
- error classes: auth, validation, integration, transport, persistence

---

## Immediate Next Iteration
1. Build a technical trace for **Competitive Intelligence playbook** end-to-end.
2. Build a technical trace for **Brand Guide save** end-to-end.
3. Implement **goal suggestion cache** and path normalization.
4. Add **Menu/Product reconciliation panel** as the canonical data trust surface.
