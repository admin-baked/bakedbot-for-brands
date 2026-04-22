# BakedBot Memory - Consolidated Session Notes

---

## Session 2026-04-22 - Analytics Hardening (local)
- **Analytics data resilience**: Overview metrics now tolerate missing order item arrays and string/currency-formatted totals without crashing.
- **Dispensary visibility**: Super-user/admin Analytics views can use retailerId and Alleaves fallback paths for dispensary orgs, matching operator views.
- **Cache isolation**: Dashboard analytics cache keys now include entity, role, location, current org, org, and brand context so one access shape does not mask another.
- **Verification**: Focused Analytics action suite passed `13/13`; bumped to `4.10.46-COD`.
- See `sessions/2026-04-22-1216-analytics-hardening.md`

---

## Session 2026-04-22 - Inbox KPI Fast Path + Creative Audit (local)
- **Inbox chat repair**: Pops now answers customer revenue questions such as "average revenue per customer" through a deterministic CRM/POS fast path instead of the fragile planner path that produced the mission-planning error.
- **CRM metric reuse**: Shared the canonical customer-revenue query detector between Inbox and CEO agent default tools, with persisted message metadata for auditability.
- **Creative Center audit coverage**: Updated tests for the current Studio/Assets flow, Remotion slideshow API calls, super-user Deck language, and generation error handling.
- **Verification**: Focused Creative/Inbox/Claude tool suites passed `62/62`; Inbox rerun passed `27/27`; `check:structure`, `check:config`, and `git diff --check` passed; full `check:types` timed out after 6 minutes without diagnostics; bumped to `4.10.44-COD`.
- See `sessions/2026-04-22-1152-inbox-creative-audit.md`

---

## Session 2026-04-22 - Brand Guide + Goals Audit Fixes (local)
- **Brand Guide utilities**: Placeholder filtering now uses exact/anchored matches instead of broad substring checks, so valid extracted names are not discarded accidentally.
- **Brand Guide extractor**: Voice text samples now consistently enforce the intended 50-500 character range; extractor tests mock the current `callGroqOrClaude` wrapper and avoid live direct-fetch attempts.
- **Goals server actions**: Goal reads and progress updates now normalize Firestore `Timestamp`, native `Date`, string, and numeric date values before using them.
- **Authorization tests**: Kept the production-specific unauthorized message and updated Goals tests to assert the authorization category.
- **Verification**: Brand Guide suites passed `87/87`; Goals suites passed `81/81`; `check:structure` and `check:config` passed; bumped to `4.10.42-COD`.
- See `sessions/2026-04-22-0819-brand-guide-goals-audit.md`

---

## Session 2026-04-22 - Onboarding Runtime Submit Repair (local)
- **Runtime repair**: Removed `useActionState` from the onboarding client because the repo is on React 18.3.1; onboarding now submits through a React 18-compatible `onSubmit` handler.
- **Flow preservation**: Kept the canonical `completeOnboarding` server action, auth modal `requestSubmit()` behavior, hidden form payload, session-expired relogin path, and wiring screen completion flow.
- **Failure handling**: Duplicate submits are blocked; unexpected server-action failures log `Onboarding submit failed` and surface a retryable error to the user.
- **Test cleanup**: Removed stale React form-hook mocks and updated role-selection assertions to the current UI labels.
- **Verification**: Focused onboarding suite passed `18/18`; `check:structure` and `check:config` passed; full `check:types` timed out after 5 minutes; bumped to `4.10.40-COD`.
- See `sessions/2026-04-22-0758-onboarding-runtime-submit.md`

---

## Session 2026-04-22 - Inbox Analytics Routing + Pops ARPC Fix (local)
- **Inbox routing repair**: Stale market-intel/creative threads now hand off clear analytics/finance questions to Pops or Money Mike, recording `primaryAgent`, `assignedAgents`, and `handoffHistory` for auditability.
- **Pops ARPC fast path**: Added `getCustomerRevenueSummary` over synced POS customer spending data so "average revenue per customer" returns deterministic revenue, order, AOV, and active-customer metrics instead of the wrong planner error.
- **CRM detail guard**: Individual customer questions in CRM detail threads stay with Mrs. Parker, preserving customer metadata hydration and avoiding over-broad analytics routing.
- **Verification**: Focused router, Inbox action, and CRM tool suites passed `65/65`; `check:structure` and `check:config` passed; full `check:types` timed out locally, scoped TS diagnostics were clean for touched production files; bumped to `4.10.38-COD`.
- See `sessions/2026-04-22-0612-inbox-analytics-routing.md`

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

---

Sessions before 2026-04-20 archived in [memory/archive/2026-04.md](archive/2026-04.md)

---

## Startup Ritual (permanent)
- **jcodemunch check**: At every session start (after prime.md load), confirm `.w/` exists + report `total_tokens_saved` + `~$Y` estimate (`tokens x $0.000003`)
- **If missing**: Prompt setup - jcodemunch is machine-local (`~/.codex/`), not shared across devs
- See `memory/feedback_jcodemunch_startup.md`
