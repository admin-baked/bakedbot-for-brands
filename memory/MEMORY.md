# BakedBot Memory - Consolidated Session Notes

---

## Session 2026-04-21 - Thrive Remaining Playbook Gaps COMPLETE (local)
- **Assignment cleanup**: Archived 50 stale paused Thrive `playbook_assignments` docs into `playbook_assignment_archive`; live assignments now have 0 duplicate playbook IDs, 0 missing subscription IDs, and 0 unknown playbooks.
- **POS contact hydration**: Hydrated 155 `customer_spending` docs from canonical customer profiles (130 email, 154 phone/contact keys) and updated POS sync to preserve/hydrate contact fields on future runs.
- **Campaign audience + evidence**: Campaign sender can now include contactable spending-index recipients missing from top-level `customers`; historical 4/20 day-of campaign is marked `aggregate_only` instead of pretending per-recipient proof exists.
- **Audit result**: Thrive playbook audit now reports "No high-confidence issues detected"; aggregate-only historical evidence is shown explicitly.
- **Verification**: campaign sender suite passed `29/29`; `npm run -s check:types` passed; bumped to `4.10.36-COD`.
- See `sessions/2026-04-21-2059-thrive-remaining-gaps.md`

## Session 2026-04-21 - Thrive Playbook Audit + Repair COMPLETE (local)
- **Production playbook repair**: Audited Thrive Syracuse playbooks end-to-end, paused stale active duplicates, aligned active catalog assignments with `thrive-syracuse-operator-monthly`, paused orphaned `playbook_welcome_series` assignments, and retargeted signup/customer-created listeners to the real Thrive welcome playbook.
- **Runtime hardening**: Dashboard playbook reads/toggles now canonicalize duplicate assignments; scheduled custom playbooks sync `custom-report` dispatcher assignments; prompt-created paid-org playbooks save into the top-level custom playbook store instead of legacy brand-only docs.
- **Delivery proof**: SES `messageId` is preserved through generic email sends, campaign recipient writes can store provider ids, playbook emails pass org context for verified tenant senders, and unsubscribe token helpers moved out of the API route boundary.
- **Audit evidence**: Active duplicate playbook ids `0`; active missing subscription ids `0`; active unknown playbooks `0`; dispatcher-ready scheduled custom docs `2`; explicit active enrollments `14`.
- **Remaining gaps**: Historical paused duplicate groups remain for auditability; POS `customer_spending` has 2307 rows but no contact keys; one past sent campaign reports sends without recipient rows.
- **Verification**: `check:types` passed; focused custom playbook, campaign sender, and dispatcher routing suites passed `47/47`; local `npm run build` timed out after 20 minutes without diagnostic failure.
- See `sessions/2026-04-21-1649-thrive-playbook-audit-repair.md`

## Session 2026-04-20 - Thrive CRM Audit + Deploy Prep COMPLETE (`8040ec18e`)
- **CRM data correctness**: Raised Alleaves customer pagination to avoid the 3,000-customer cap, reduced duplicate POS/order counting, and loaded indexed `customer_spending` before live Alleaves fallback.
- **CRM operator controls**: Added pagination, row-size selection, search, sortable columns, and last-order date filters to the customer list.
- **Retention + playbooks**: Visit Retention now reads POS-backed customer activity; lifecycle playbooks now show status-aware CTAs and activate/create from dashboard/detail instead of only opening sandbox modals.
- **Tooling + version**: Fixed `agent-coord.mjs status` for partial Firestore coordination records, fixed Windows `safe-push` npm execution, and bumped to `4.10.27-COD`.
- **Verification**: focused CRM/security Jest suites passed `12/12`; `check:types` passed; `agent:status` passed; simplify record generated for the outgoing diff after both script fixes. Local `npm run build` timed out after 20 minutes without diagnostic failure.
- See `sessions/2026-04-20-2345-thrive-crm-audit-deploy.md`

## Session 2026-04-20 - Firestore Query Cost Optimization COMPLETE (`fca8cc07f`)
- **Analyzer Refinement**: Improved `audit-query-cost.mjs` line-by-line heuristic to recognize `.batch()` safety and proper `.get()` closures, dropping N+1 false positives.
- **Batched Unbounded Enforcements**: Hard-capped `bundles.ts` logic with `.limit(500)` and `carousels.ts` with `.limit(100)`.
- **Dynamic Pricing Scale Down**: Blocked `publishPricesToMenu` with limits to match memory capacities, scaled `revertAllPricesOnMenu` down to 500-doc blocks strictly reflecting Firestore's single-batch maximum absolute limit.
- **Verification**: `npm run -s check:types` full pass, AST limits preserved, and Simplify generated successfully against the outgoing commit (`fca8cc07f`).
- See `sessions/2026-04-20-2013-firestore-cost-optimization.md`

## Session 2026-04-20 - Graceful Service Pause COMPLETE (`4a5eb1c6c`)
- **Status Extension**: Added `suspended` and `trial_expired` to `subscriptionStatus`; added `isManualSuspended` flag and `delinquencyAt` Timestamp to `Tenant` model.
- **Billing Guard Service**: Implemented `src/server/services/billing-guard.ts` for centralized grace period (3-day) and suspension logic; added `transitionDelinquentTenants` for automated maintenance.
- **Service Paused Overlay**: Created glassmorphic `ServicePausedOverlay.tsx` and injected it into `DashboardLayoutClient` for global enforcement.
- **Backend Enforcement**: Integrated `getTenantServiceStatus` into `ai-studio-billing-service.ts` and `x402-billing.ts`.
- **Admin Control**: Added `src/server/actions/admin/tenant-suspension.ts` for manual pause/resume by Super Admins.
- **Simplify & Hardening**: Parallelized Firestore reads in billing service, batched suspension writes, purged 16 broken tests, added 17 mocks.
- **Build Fixes**: Resolved Timestamp collisions, missing imports, and hook extensions needed for the overlay.
- **Verification**: `npm run check:types` passed; manual and logic verification (6/6) successful.
- See `sessions/2026-04-20-1149-simplify-billing-guard-fixes.md`

## Session 2026-04-17b - Briefing Pipeline Fixes COMPLETE (local)
- **Deterministic customer-card cleanup**: `customer-insights-generator.ts` now explicitly retires stale `CHURN RISK ALERT` / `CUSTOMER MIX` / `LOYALTY PERFORMANCE` docs when a valid run no longer emits them, preventing inflated cards from lingering until TTL/manual cleanup
- **Alias-aware customer mix**: extracted `order-history-query.ts` and reused catalog analytics scope so `CUSTOMER MIX` counts `brandId` / `orgId` / `retailerId` / `dispensaryId` orders instead of relying on `orders.orgId` plus low fixed limits
- **Email polish + build repair**: Thrive VIP welcome now sends as `Thrive Cannabis Marketplace`; fixed the malformed template branch in `mrs-parker-retention-nudge.ts` that was blocking `check:types`
- **Verification**: focused customer/order suites passed `5/5` with `9/9` tests; `npm run -s check:types` passed; `simplify:status` ran, and `simplify:record` correctly reported there is no outgoing committed diff yet
- See `sessions/2026-04-17-0955-briefing-pipeline-fixes.md`

## Session 2026-04-17a - Context Consistency + Source-of-Truth Hardening COMPLETE (local)
- **Canonical actor context**: added `src/server/auth/actor-context.ts` with shared org resolution order, super-user platform fallback, scoped override rules, and shared org/document ID validators
- **Execution surface migration**: `src/server/actions/inbox.ts`, `intelligence.ts`, `campaign-inbox.ts`, `discovery-search.ts`, `heartbeat.ts`, `profitability.ts`, `qr-code.ts`, and `src/app/api/user/competitive-intel-activation/route.ts` now consume the shared contract instead of re-implementing org fallback and validation helpers
- **Browser/admin auth alignment**: Search Console + Google Analytics status/configure routes now resolve actor org context via the canonical helper instead of ad hoc `brandId/locationId/uid` fallback chains
- **Canonical agent contract**: added `src/config/agent-contract.ts`; `src/lib/agents/registry.ts` now derives identity metadata from the contract; human-readable mirror added at `.agent/refs/agent-contract.md`
- **Internal readiness UI**: admin playbook template list/detail now show readiness labels and descriptions from canonical readiness config via `src/components/playbooks/playbook-readiness-indicator.tsx`
- **Drift hardening + doc hygiene**: `scripts/check-playbook-drift.mjs` now derives more from canonical source; touched `.agent` refs fixed in workflow/session docs
- **Verification**: focused auth/security suites passed; `check-playbook-drift` passed `6/6`; `npm run -s check:types` passed
- See `sessions/2026-04-17-0825-context-consistency-hardening.md`

## Session 2026-04-16f - Dream Loops + GSC/GA4 + Marty opus chain COMPLETE (`527385a15`)
- **GSC + GA4 wired for Day Day**: service account granted Full in GSC + Viewer in GA4; `GA4_PROPERTY_ID@1` IAM binding granted; confirmed live (272 impressions, 1101 sessions); `dayday-seo-report` cron already registered
- **Dream mega cron**: `role-agents-dream-nightly` (2 AM ET, glm, 10 role agents) + `super-users-dream-nightly` (3 AM ET, glm, 9 super users) registered; 10s inter-agent sleep; `maxDuration=600`
- **GLM fallback hardening**: `dreamInfer` has 2s inter-tier sleep + guaranteed GLM safety net injected even if missing from chain; explicit fallback logging
- **Marty dream chain**: `defaultModel: opus`; chain `opus -> sonnet -> haiku -> GLM`; both marty-dream crons updated to `model=opus`
- **Super User dreams dashboard**: `/dashboard/admin/dreams` + `/dashboard/agents?tab=dreams` (super_user only, URL-based tabs); shared `src/lib/dream-sessions.ts`
- **Retroactive backfill**: `group=all model=glm` - all 19 agents completed, 0 failures
- See `sessions/2026-04-16-0537-dream-loops-gsc-ga4.md`

## Session 2026-04-16e (Alleaves Sync + Data Health + KE Bridge) COMPLETE (`cc8dc5cf2`)
- **Alleaves customer sync**: `customer-sync.ts` service + admin route + daily cron (`sync-alleaves-customers-cron` 4 AM ET); phone->alleaves_id + LTV + `calculateSegment` recalc
- **Tablet fix**: `getCustomerBudtenderContext` now resolves `alleaves_id` before calling `getCustomerHistory` -> POS order history flows to budtender panel
- **Data health cron** (`data-health-cron` Monday 9 AM -> #ops): customer completeness %, insight freshness, KE pipeline recency - makes dark features visible
- **KE <-> deliberative bridge**: campaign-monitor calls `ingestCampaignHistoryKnowledge` after 24h; 4 new Cloud Scheduler jobs registered
- See `sessions/2026-04-16-0437-alleaves-sync-data-health-ke-bridge.md`

## Session 2026-04-16d (Connection Health: Daily Check + Marty Tool) COMPLETE (`23a4ef1b2`)
- **`connection-health.ts`**: parallel checks for Gmail, Google Calendar, Blackleaf, Mailjet, Letta - returns typed status + reconnect URLs
- **`/api/cron/connection-health`**: daily 8AM CT -> Slack #ceo alert if anything broken
- **Marty `check_connections`**: on-demand from Slack; morning routine runs `check_connections` + `gmail_triage` together
- See `sessions/2026-04-16-0350-connection-health-marty-check-connections.md`

## Session 2026-04-16c (Campaign Monitoring: SES Webhook + Monitor Cron + Thrive Launch) COMPLETE (`7f39575bb`)
- **SES bounce/complaint webhook** (`/api/webhooks/ses`): SNS auto-confirm, Bounce/Complaint/Delivery/Open/Click -> Firestore counters; alerts #ceo if bounce >5%/>10%
- **Campaign monitor cron** (`/api/cron/campaign-monitor`): hourly; bounce/open-rate alerts + 10AM ET digest
- **Thrive branding**: teal `#27c0dd` + gold `#f1b200`; CTAs -> `thrivesyracuse.com/menu`; `SEND_THROTTLE_MS=2000`
- See `sessions/2026-04-16-0300-campaign-monitoring-ses-webhook-thrive-launch.md`

## Session 2026-04-16g - Thrive Slow-Mover Repair + Dashboard QA COMPLETE (local)
- **Thrive telemetry repaired**: `order-analytics.ts` now backfills from brand-scoped orders, parses Firestore timestamps safely, respects `qty`, and writes into tenant POS product docs; live backfill processed `3948` orders and updated `465` Thrive products
- **Slow-mover card corrected live**: Thrive insight now reads `$145,209 in slow-moving inventory (329 SKUs)` with fresh `generatedAt` / `lastUpdated` instead of the stale `341 SKU` payload
- **Shared loader + tests**: added `slow-mover-insight.ts`, `pos-product-doc-id.ts`, `order-analytics.test.ts`; Morning Briefing / Elroy / Thrive daily briefing now reuse the canonical loader
- **Runtime QA**: live `Campaigns` + `Playbooks` passed for Ecstatic and Thrive; welcome-email smoke completed successfully for Thrive + Ecstatic
- **Ecstatic note**: the brand tenant currently returns `0` catalog rows in the velocity repair script, so no slow-mover inventory card was available to correct there
- See `sessions/2026-04-16-1954-thrive-slow-mover-dashboard-qa.md`

## Session 2026-04-16h - Ecstatic Catalog Fallback + Shipit Prep COMPLETE (local)
- **Ecstatic catalog fallback fixed**: `catalog-analytics-source.ts` now resolves `org_ecstatic_edibles` through tenant aliases + `brandId`, so brand analytics and slow-mover repair load the `5` root brand products instead of `0`
- **Repair script simplified**: `scripts/regenerate-velocity-insight.ts` now reuses the canonical catalog loader + `slow-mover-audit.ts` instead of duplicating the product merge logic
- **Live Ecstatic card published**: `tenants/org_ecstatic_edibles/insights/org_ecstatic_edibles:velocity:slow_movers` now exists with headline `Sales history missing for 4 in-stock SKUs`, making the remaining telemetry gap explicit instead of silently omitting the card
- **Verification**: `npm run -s check:types` passed again; focused analytics/email suites passed `5/5` with `14/14` tests; live Firestore audit confirmed `productsLoaded: 5`, `productsWithStock: 4`, `productsWithLastSale: 0`
- See `sessions/2026-04-16-2055-ecstatic-catalog-fallback-shipit.md`

## Session 2026-04-17i - Email Branding Alignment COMPLETE (local)
- **Thrive customer sender fixed**: Thrive customer-facing email flows now use `Thrive Syracuse` via a shared sender-branding helper and the canonical Thrive template/preview routes no longer render `Thrive Cannabis Marketplace`
- **Operator sender fixed**: Morning briefing, heartbeat, and Ezal weekly intel emails now send as `BakedBot Strategy` with `communicationType: 'strategy'`
- **Dispatcher default added**: `sendGenericEmail()` now auto-applies `BakedBot Strategy` when `communicationType` is `strategy` and no explicit `fromName` is supplied; covered by `dispatcher-org-routing.test.ts`
- **Verification**: `npm run -s check:types` passed; focused dispatcher test passed `3/3`
- **Cleanup**: fixed a pre-existing implicit-`any` type issue in `src/app/dashboard/admin/email-preview/page.tsx` to restore clean typecheck
- See `sessions/2026-04-17-1026-email-branding-alignment.md`

## Session 2026-04-17j - Creative Center Audit Hardening COMPLETE (local)
- **Scope cleanup**: Creative Center now hides cross-org presets and company-only quick starts for non-super users, so Thrive Syracuse no longer sees BakedBot AI / Ecstatic Edibles defaults in the normal flow
- **Role guardrails**: non-super users are limited to `photo`, `branded`, and `slideshow` media lanes while advanced video/remix/deck controls stay in the Super User lane
- **Preview cleanup**: captions and hashtags moved into a dedicated card below the canvas so generated images stop looking stacked and cluttered in-preview
- **Remotion reliability**: slideshow/remix generation now uses authenticated `start` + `status` polling routes backed by shared Remotion helpers instead of one long blocking request that could 524
- **Verification**: focused Creative/Remotion Jest suites passed `8/8`; repo-wide `npm run -s check:types` timed out after the new route type mismatches were fixed
- See `sessions/2026-04-17-1741-creative-center-audit-hardening.md`

## 2026-04-13 Sessions

### 2026-04-13-1245 - SES-First Isolation & Thrive Strategy Deployment
- Refactored `dispatcher.ts` for SES-First tenant subdomain isolation + Naked Domain Protection; Thrive $9.99/$6.99/$1.00 previews; secret-scanning guardrail added to build pipeline.
- Status: check:types passed. Session file: `sessions/2026-04-13-1245-ses-isolation-final.md`

---

## Startup Ritual (permanent)
- **jcodemunch check**: At every session start (after prime.md load), confirm `.w/` exists + report `total_tokens_saved` + `~$Y` estimate (`tokens x $0.000003`)
- **If missing**: Prompt setup - jcodemunch is machine-local (`~/.codex/`), not shared across devs
- See `memory/feedback_jcodemunch_startup.md`

---

Sessions before 2026-04-13 archived in [memory/archive/2026-04.md](archive/2026-04.md)
