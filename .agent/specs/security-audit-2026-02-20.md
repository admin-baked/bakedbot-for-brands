# Spec: Codebase Security Audit & Hardening

**Date:** 2026-02-20
**Requested by:** Self-initiated
**Spec status:** 🟢 Approved (2026-02-20 user review complete)

---

## 1. Intent (Why)

Standardize authentication patterns across cron routes and webhook receivers to eliminate authentication bypass risks. Ensure missing/misconfigured secrets fail safely with 500 errors (not 401 with NULL comparison), and harden webhook signature verification to prevent acceptance of unsigned requests in production.

---

## 2. Scope (What)

### Files Affected

**Cron Route Fixes (11 routes):**
- `src/app/api/cron/tick/route.ts` — Missing CRON_SECRET null check
- `src/app/api/cron/playbook-runner/route.ts` — Check if unsafe
- `src/app/api/cron/pos-sync/route.ts` — Check if unsafe
- `src/app/api/cron/loyalty-sync/route.ts` — Check if unsafe
- `src/app/api/cron/competitive-intel/route.ts` — Check if unsafe
- `src/app/api/cron/heartbeat-recovery/route.ts` — Check if unsafe
- `src/app/api/cron/check-regulations/route.ts` — Check if unsafe
- `src/app/api/cron/slack-reports/route.ts` — Check if unsafe
- `src/app/api/cron/publish-scheduled-posts/route.ts` — Check if unsafe
- `src/app/api/cron/promo-decrement/route.ts` — Check if unsafe
- `src/app/api/cron/weedmaps-image-sync/route.ts` — Check if unsafe

**Already Safe (verified ✅):**
- `src/app/api/cron/campaign-sender/route.ts` (lines 22-30) — follows safe pattern
- `src/app/api/cron/heartbeat/route.ts` (lines 20-37) — extracted into helper
- `src/app/api/cron/brand-pilot/route.ts` (lines 27-36) — safe pattern

**Webhook Signature Verification:**
- `src/app/api/webhooks/authorize-net/route.ts` (lines 25-48) — Allow-on-missing fix required

**Auth Cleanup:**
- `src/server/auth/auth.ts` — Review for legacy comments, ensure strict typing

**New Tests:**
- `src/server/auth/__tests__/auth.test.ts` — NEW — requireUser, requireSuperUser, role matching
- `src/server/auth/__tests__/rbac.test.ts` — NEW — permission matrices, role hierarchies
- `src/server/security/__tests__/sanitize.test.ts` — NEW — prompt injection, data wrapping

**Files explicitly NOT touched:**
- `src/server/auth/require-user.ts` — Using `requireUser` from `auth.ts` directly instead
- `src/app/api/cron/campaign-sender/` — Already safe, only test if needed
- `src/firebase/` — No changes to Firebase initialization

**Estimated diff size:** 150–250 lines (excluding test files which add 200+ lines)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | **YES** | Core auth pattern (CRON_SECRET, webhook verification) |
| Touches payment or billing? | YES | Authorize.net webhook hardening |
| Modifies database schema? | No | Schema unchanged |
| Changes infra cost profile? | No | No new services or tiers |
| Modifies LLM prompts or agent behavior? | No | Security logic only |
| Touches compliance logic? | No | Not Deebo-related |
| Adds new external dependency? | No | Uses existing crypto APIs |

**Escalation needed?** **YES — Full spec required** (auth boundary triggered)

---

## 4. Implementation Plan

### Phase 1: Audit & Categorize (No code changes)
1. Run audit script to identify all 30+ cron routes
2. Categorize each route as:
   - ✅ Safe (has `if (!cronSecret) return 500` before comparison)
   - ❌ Unsafe (missing null check)
   - ⚠️ Custom pattern (uses helper function like heartbeat)
3. Document findings in audit report

### Phase 2: Cron Route Hardening
For each unsafe cron route:
1. Extract pattern used in `heartbeat/route.ts` or inline per `campaign-sender/route.ts`
2. Add `const cronSecret = process.env.CRON_SECRET;` at handler start
3. Add before auth comparison:
   ```typescript
   if (!cronSecret) {
       logger.error('[CRON:SERVICE] CRON_SECRET environment variable is not configured');
       return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
   }
   ```
4. Keep existing auth comparison after null check
5. Verify both GET and POST handlers present (per commit `12ec9b39` fix)

### Phase 3: Webhook Signature Hardening
For `src/app/api/webhooks/authorize-net/route.ts`:
1. Change line 28 behavior: `if (!notifKey)` should return 401 in production, not allow through
2. Implement:
   ```typescript
   if (!notifKey) {
       if (process.env.NODE_ENV === 'production') {
           logger.error('[AuthNet Webhook] AUTHNET_NOTIFICATION_KEY not configured in production');
           return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 });
       }
       logger.warn('[AuthNet Webhook] AUTHNET_NOTIFICATION_KEY not set — skipping verification (dev only)');
       return true;
   }
   ```
3. Rationale: In dev/sandbox, allow unsigned (testing easier). In production, fail hard.

### Phase 4: Auth.ts Cleanup
1. Review `src/server/auth/auth.ts` for comments referencing legacy role normalization
2. Ensure strict typing: all role checks use `UserRole` type (not string)
3. Verify `roleMatches()` function (lines 24-51) is the single source of truth for role hierarchy
4. Add comment: "Role hierarchy centralized in roleMatches() — no role downgrade outside this function"

### Phase 5: Test Suite Creation
1. **`auth.test.ts`** (60–80 lines):
   - Test `requireUser()` with valid session → returns token
   - Test `requireUser()` without session → throws error
   - Test `requireUser(requiredRoles)` with insufficient role → throws error
   - Test `requireUser(requiredRoles)` with matching role → passes
   - Test dev bypass with `x-simulated-role` cookie
   - Test role hierarchy: `brand_admin` passes `brand_member` requirement

2. **`rbac.test.ts`** (80–100 lines):
   - Test `roleMatches()` with direct match
   - Test `roleMatches()` with group match (`'brand'` accepts `'brand_admin'`)
   - Test all role hierarchy rules: brand/dispensary/staff chains
   - Test edge case: brand_admin doesn't match dispensary_member

3. **`sanitize.test.ts`** (40–60 lines):
   - Test prompt injection detection: `<admin>`, SQL keywords, script tags
   - Test data wrapping: user input wrapped in `<user_data>` tags before sending to LLM
   - Test edge cases: empty strings, unicode, very long inputs

### Phase 6: Verification & Testing
1. Run TypeScript check: `npm run check:types`
2. Run new tests: `npm test src/server/auth/__tests__/` + `src/server/security/__tests__/`
3. Run full test suite: `npm test`
4. Manually verify cron routes still work with valid `CRON_SECRET` in header
5. Manually verify cron routes reject with 401 if secret wrong
6. Manually verify cron routes reject with 500 if env var missing

---

## 5. Test Plan

### Unit Tests

**`auth.test.ts`:**
- [ ] `requireUser() with valid session` — returns decoded token
- [ ] `requireUser() without session` — throws "Unauthorized: No session cookie found"
- [ ] `requireUser(requiredRoles: ['super_user'])` with role mismatch — throws "Forbidden: missing required permissions"
- [ ] `requireUser(requiredRoles: ['brand_admin'])` with brand_admin role — passes
- [ ] Dev bypass: `x-simulated-role` cookie allows testing without real auth
- [ ] `roleMatches('brand_admin', ['brand_member'])` — returns true (hierarchy)
- [ ] `roleMatches('dispensary_staff', ['brand_admin'])` — returns false (cross-domain)

**`rbac.test.ts`:**
- [ ] `roleMatches('brand_admin', ['brand'])` — returns true
- [ ] `roleMatches('brand_member', ['brand'])` — returns true
- [ ] `roleMatches('dispensary_admin', ['dispensary'])` — returns true
- [ ] `roleMatches('brand_admin', ['dispensary'])` — returns false
- [ ] Role hierarchy: admin qualifies for staff: `roleMatches('brand_admin', ['brand_member'])` — true

**`sanitize.test.ts`:**
- [ ] Detects `<admin>` injection attempts
- [ ] Detects SQL keywords (SELECT, DROP, etc.)
- [ ] Detects script tags (`<script>`)
- [ ] Wraps user input in `<user_data>` tags correctly
- [ ] Handles empty input edge case
- [ ] Handles unicode characters
- [ ] Handles very long inputs (>10k chars)

### Integration Tests

- [ ] Cron route with valid `CRON_SECRET` header → executes successfully
- [ ] Cron route with missing `CRON_SECRET` env var → returns 500 with "Server misconfiguration"
- [ ] Cron route with wrong secret → returns 401 with "Unauthorized"
- [ ] Authorize.net webhook with valid signature → processes events
- [ ] Authorize.net webhook with invalid signature → returns 401
- [ ] Authorize.net webhook with missing `AUTHNET_NOTIFICATION_KEY` in prod → returns 500

### Manual Smoke Tests

- [ ] Trigger `tick` cron with valid secret via local test: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/tick`
- [ ] Trigger same without secret → verify 500 error
- [ ] Trigger with wrong secret → verify 401 error
- [ ] Deploy to Firebase and verify Cloud Scheduler still triggers correctly

### Golden Set Eval

Not required (no LLM prompt changes).

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | **YES** — All changes in one commit; `git revert [hash]` restores previous behavior |
| Feature flag? | Not needed — these are pure security fixes without behavioral change |
| Data migration rollback? | **NO** — No schema or data changes |
| Downstream services affected? | **NO** — Internal auth patterns only. Cloud Scheduler will auto-retry cron routes with valid secret. |

**Rollback procedure:**
1. If 500 errors spike on cron routes post-deploy: `git revert [commit-hash]` and push
2. Verify `CRON_SECRET` is still in place in Secret Manager (gcloud secrets versions list CRON_SECRET)
3. Cloud Scheduler will auto-retry within 5 minutes

---

## 7. Success Criteria

- [ ] All tests pass (zero regressions in existing test suite)
- [ ] New unit tests: `auth.test.ts` ≥15 passing, `rbac.test.ts` ≥12 passing, `sanitize.test.ts` ≥7 passing
- [ ] Audit report documents all 30+ cron routes + current status (safe/unsafe)
- [ ] All unsafe cron routes updated to safe pattern (11 routes)
- [ ] Authorize.net webhook: production fails 500 if notification key missing
- [ ] TypeScript check passes: `npm run check:types`
- [ ] No new linting errors: `npm run lint`
- [ ] Manual smoke test: cron routes still execute with valid secret
- [ ] Cloud Scheduler jobs continue to trigger normally post-deploy (monitor for 24h)

---

## Approval

- [ ] **Spec reviewed by:** ________________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** (list or "none")

---

## Notes

**Audit findings (pre-spec):**
- `tick/route.ts` — ❌ Unsafe: `if (authHeader !== ...) return 401` without null check
- `campaign-sender/route.ts` — ✅ Safe: includes `if (!cronSecret) return 500` (lines 22-30)
- `heartbeat/route.ts` — ✅ Safe: extracted into `authorizeCron()` helper (lines 20-37)
- `brand-pilot/route.ts` — ✅ Safe: includes null check (lines 27-36)
- `authorize-net/webhook` — ⚠️ Partial: allows unsigned in dev, but should fail hard in production

**Scope rationale:**
- Authentication is a "boundary check" per `.agent/prime.md` → full spec required
- Cron security is operational-critical (no single human can manually trigger all 30+ routes)
- Webhook signature verification prevents payment state corruption

**Why this matters:**
- If `CRON_SECRET` env var is misconfigured (missing, empty, or empty string in Secret Manager "0 versions" state), current code bypasses auth silently
- Unauthorized parties could trigger cron jobs, injecting fake data or executing arbitrary playbooks
- Authorize.net webhook could accept unsigned requests, allowing attacker to fabricate payment events
