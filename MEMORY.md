# BakedBot Session Memory

## Session: 2026-04-02
- **Thrive staff last-4 check-in assist** (`a5bdcb8ab`) - Added a staff-confirmed first-name-plus-last-4 lookup path in the canonical visitor check-in actions, returning masked customer/order candidates and resolving the real phone only on the server from opaque refs.
- **Phone last-4 persistence + backfill** (`a5bdcb8ab`) - Persisted `phoneLast4` on checkout, shipping, POS sync, Alleaves webhook, and order backfill writes, plus added `POST /api/admin/backfill-phone-last4` for scoped customer and order backfills.
- **Index and verification guardrails** (`a5bdcb8ab`) - Added Firestore indexes for the new staff lookup queries plus Jest coverage for the server flow, check-in card UI, and index config; repo-wide `check:types` still timed out in both sandboxed and elevated runs.
- **Session file** - `memory/sessions/2026-04-02-0228-thrive-staff-last4-checkin.md`

## Session: 2026-04-02
- **Job stream module restored** (`7ed6cb126`) - Added the missing canonical `src/server/jobs/job-stream.ts` module so the already-committed agent worker, runner, and cancel-job paths compile again.
- **CI recovered on main** (`7ed6cb126`) - The follow-up push turned `Type Check & Lint`, `E2E Tests`, and `Deploy to Firebase App Hosting` green on `main`.
- **Verification** (`7ed6cb126`) - GitHub Actions runs `23887506522`, `23887506516`, and `23887506525` all completed successfully.
- **Session file** - `memory/sessions/2026-04-02-0147-job-stream-typecheck-fix.md`

## Session: 2026-04-02
- **CI smoke path reset** (`uncommitted`) - Added maintained `tests/e2e/ci-smoke` coverage, switched the workflow to `npm run test:e2e:ci`, and made `npm run dev` explicit about webpack so Playwright startup matches the repo's custom bundler path.
- **Auth and demo route hardening** (`uncommitted`) - Removed age-gate interception from the auth entry routes, restored the demo shop's missing Bundle & Save section by passing `defaultBundles`, and kept instrumentation Edge-safe by removing `setImmediate`.
- **Verification** (`uncommitted`) - `.\scripts\npm-safe.cmd run test:e2e:ci -- --reporter=list` passed (4/4). Repo-wide `check:types` is still blocked by an unrelated local creative-page edit, and local `npm run build` still hangs after entering `next build --webpack` on this Windows machine.
- **Session file** - `memory/sessions/2026-04-02-0117-ci-smoke-login-demo-fix.md`

## Session: 2026-04-01
- **Thrive tablet check-in hardening** (`uncommitted`) - Replaced the loyalty-tablet LLM-only mood recommendation flow with deterministic Smokey menu-search ranking plus a stock-aware fallback so recommendations render without waiting on Claude.
- **Canonical check-in handoff preserved** (`uncommitted`) - Kept `captureTabletLead` routed through `captureVisitorCheckin` with mood, cart product IDs, and bundle metadata unchanged.
- **Verification** (`uncommitted`) - `./scripts/npm-safe.cmd test -- --runInBand "src/server/actions/__tests__/loyalty-tablet.test.ts"` passed, `./scripts/npm-safe.cmd test -- --runInBand "src/components/checkin/__tests__/visitor-checkin-card.test.tsx"` passed, and the scoped `tsc -p tsconfig.loyalty-tablet-check.json --noEmit --incremental false` check passed.
- **Session file** - `memory/sessions/2026-04-01-2312-thrive-tablet-checkin.md`

## Session: 2026-04-01
- **Thrive welcome-playbook recovery** (`203b3b19c`) - Hardened the playbook event dispatcher to fall back to active root `playbooks` docs when `playbook_event_listeners` are missing, and backfill those listeners so customer signup/check-in events still reach the welcome workflow.
- **Canonical welcome email execution** (`203b3b19c`) - Routed `welcome_personalized` through the shared Mrs. Parker welcome-email service and auto-scheduled the Thrive welcome playbook during pilot setup so live check-ins can send the right email path.
- **Smokey natural-language menu search** (`203b3b19c`) - Added shared menu parsing/ranking for category, effect, strain, and price prompts, plus direct age-answer handling and a deterministic anonymous-consumer fallback when tool execution returns no products.
- **Smokey cleanup after /simplify** (`fe86f502c`) - Extracted the shared product ID helper and preserved ranked fallback ordering so consumer chat result handling stays easier to reason about.
- **Verification** (`203b3b19c`, `fe86f502c`) - Targeted Jest coverage for Smokey menu search, consumer adapter fallback, playbook dispatcher fallback, and welcome-email execution passed, and `.\scripts\npm-safe.cmd run check:types` passed after the session.

### Gotchas (2026-04-01)
- Active playbooks can still be inert if the org is missing `playbook_event_listeners`; check listener materialization before assuming the trigger logic is broken.
- Consumer menu chat needs both a semantic menu-search fallback and a direct compliance path for age questions, or natural-language prompts collapse into generic "no products found" replies even when menu data is loaded.

## Session: 2026-03-25
- **Default-shell Node/Jest startup fixed**: Added repo-safe `scripts/node-safe.cmd` and `scripts/npm-safe.cmd` wrappers plus a shared bootstrap so sandboxed Node file execution stays inside `.codex-jest-home` and no longer fails on `C:\Users\admin`. Commit: `1699974c2`.
- **Jest launcher reused the canonical bootstrap**: Extracted the existing env setup into `scripts/ensure-workspace-node-home.cjs` so direct Jest runs and wrapper-launched scripts share the same Node-side setup path.
- **Verification**: `.\scripts\node-safe.cmd -v`, `.\scripts\npm-safe.cmd test -- --help`, and `.\scripts\npm-safe.cmd run -s check:types` all passed locally.


-> Sessions before 2026-03-25 archived in `memory/archive/2026-03.md`.
-> Legacy historical build notes archived in `memory/archive/2026-03.md`.
