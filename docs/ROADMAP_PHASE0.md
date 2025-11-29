# BakedBot AI – Phase 0: Production Readiness

**Status:** In Progress
**Target Launch:** 2-3 weeks
**Overall Readiness Score:** 5.35/10 (NOT PRODUCTION READY)
**Target Score for Launch:** 8.5/10+

---

## PRODUCTION READINESS SCORECARD

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Security | 4/10 | 25% | App Check, webhooks, Firestore rules needed |
| Features | 6/10 | 20% | Core flows work, agents incomplete |
| Infrastructure | 8/10 | 15% | Firebase configured, secrets need review |
| Reliability | 6/10 | 15% | Error boundaries partial, monitoring needed |
| Testing | 7/10 | 10% | Strong E2E, weak unit test coverage |
| Compliance | 2/10 | 10% | **CRITICAL GAP**: Only 2 states implemented |
| Monitoring | 3/10 | 5% | Sentry installed but not configured |

---

## LAUNCH CRITERIA

Before deploying to production, all items must be ✅:

### Critical (Must Have)
- [ ] All 7 critical security blockers resolved
- [ ] Firestore security rules deployed and tested
- [ ] Webhook signature verification working (CannPay)
- [ ] App Check enforced or safely removed
- [ ] Sentry error tracking active
- [ ] State compliance rules complete for launch states
- [ ] Server-side age verification implemented
- [ ] Payment amount validation added
- [ ] All secrets properly configured in Secret Manager

### High Priority (Should Have)
- [ ] Server-side role-based authorization
- [ ] Secure dev auth bypass
- [ ] Payment failure alerting configured
- [ ] Google Cloud Logging configured

### Quality Gates
- [ ] All E2E tests passing
- [ ] npm run check:all passes (types, lint, structure)
- [ ] No console.log in production code
- [ ] Lighthouse score > 90
- [ ] No critical security vulnerabilities (npm audit)

## ACTIVE TICKETS

_Security tickets are highest priority._

---

## Ticket: P0-SEC-CANNPAY-WEBHOOK
**Owner:** Dev 1 (Implementation), Dev 2 (Secrets), Dev 3 (Tests)
**Priority:** CRITICAL

### Summary
Implement secure signature verification for CannPay webhooks. Currently accepts unsigned webhooks, allowing attackers to manipulate order statuses.

### Files
- `src/app/api/webhooks/cannpay/route.ts`
- `apphosting.yaml`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Created ticket from roadmap migration.
- [Dev1-Claude @ 2025-11-29]: Investigated current implementation. Findings:
  - File exists at src/app/api/webhooks/cannpay/route.ts (108 lines)
  - Line 19 has TODO comment for signature verification
  - Reads x-cannpay-signature header (line 13) but does NOT verify it
  - Has CANPAY_WEBHOOK_SECRET env var check but only warns if missing
  - Currently processes ALL webhooks without verification (CRITICAL SECURITY RISK)
  - Uses console.log/console.error - needs structured logging
  - No crypto imports - will need Node.js crypto module for HMAC-SHA256
  - CANPAY_WEBHOOK_SECRET missing from apphosting.yaml
  - No logger utility exists (blocked by P0-MON-LOGGING)
  - Next: Research CannPay webhook signature spec, implement verification
- [Dev2-Infra @ 2025-11-29]: ✅ Infrastructure ready. Added CannPay config to apphosting.yaml. Documented sandbox credentials (8954cd15). MANUAL: Create 4 secrets in GCP Console. Ready for Dev1 webhook implementation.

---

## Ticket: P0-SEC-FIRESTORE-RULES
**Owner:** Dev 3 (Lead), Dev 1 (Review), Dev 2 (Deploy)
**Priority:** CRITICAL

### Summary
Implement comprehensive Firestore security rules. Currently no security rules found in repository, allowing unauthorized data access.

### Files
- `firestore.rules` (to be created at project root)
- `firebase.json`
- `tests/firestore-rules/` (Dev 3 to create)

### AI Log
- [Dev1-Claude @ 2025-11-29]: Created ticket. Dev 3 lead due to security focus.

---

## Ticket: P0-SEC-STRIPE-CONFIG
**Owner:** Dev 2 (Lead), Dev 1 (Implementation)
**Priority:** CRITICAL

### Summary
Fix Stripe configuration by adding proper secrets to Secret Manager and removing dummy key fallbacks.

### Files
- `src/lib/payments/stripe.ts`
- `apphosting.yaml`
- `docs/SECRETS.md` (to be created)

### AI Log
- [Dev1-Claude @ 2025-11-29]: Created ticket. Dev 2 lead due to infra focus.

---

## Ticket: P0-COMP-STATE-RULES
**Owner:** Dev 1 (Implementation), Dev 3 (Tests)
**Priority:** CRITICAL

### Summary
Complete state compliance rules for all launch states. Only IL and CA implemented (2 of 50 states).

### Files
- `src/lib/compliance/state-rules.ts`
- `src/server/agents/deebo.ts`
- `docs/COMPLIANCE.md` (to be created)

### AI Log
- [Dev1-Claude @ 2025-11-29]: BLOCKER for launch - legal requirement.

---

## Ticket: P0-COMP-DEEBO-AGENT
**Owner:** Dev 1 (Implementation), Dev 3 (Tests)
**Priority:** CRITICAL

### Summary
Implement Deebo compliance agent. Currently placeholder only, making checkout non-compliant.

### Files
- `src/server/agents/deebo.ts`
- `src/app/api/checkout/route.ts`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Depends on P0-COMP-STATE-RULES.

---

## Ticket: P0-MON-SENTRY
**Owner:** Dev 2 (Configuration), Dev 1 (Integration)
**Priority:** CRITICAL

### Summary
Configure Sentry error tracking. Package installed but not configured.

### Files
- `src/lib/monitoring.ts`
- `sentry.client.config.ts` (to be created)
- `sentry.server.config.ts` (to be created)
- `apphosting.yaml`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Essential for production observability.

---

## Ticket: P0-SEC-RBAC-SERVER
**Owner:** Dev 1 (Implementation), Dev 3 (Tests)
**Priority:** HIGH

### Summary
Add server-side role-based authorization. Currently auth checks only happen client-side and can be bypassed.

### Files
- `src/middleware.ts`
- `src/lib/auth.ts`
- `src/app/dashboard/*/page.tsx`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Server-side auth essential before launch.

---

## Ticket: P0-SEC-DEV-AUTH
**Owner:** Dev 1 (Implementation), Dev 2 (Config)
**Priority:** HIGH

### Summary
Secure dev auth bypass to prevent unauthorized production access.

### Files
- `src/lib/auth.ts`
- `src/components/dev-login-button.tsx`
- `next.config.js`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Security risk if dev bypass in prod.

---

## Ticket: P0-COMP-AGE-VERIFY
**Owner:** Dev 1 (Implementation), Dev 3 (Tests)
**Priority:** HIGH

### Summary
Add server-side age verification. Currently only client-side localStorage check (bypassable).

### Files
- `src/app/api/checkout/route.ts`
- `src/lib/schema/customer.ts`
- `src/server/agents/deebo.ts`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Legal requirement for cannabis sales.

---

## Ticket: P0-MON-LOGGING
**Owner:** Dev 1 (Implementation), Dev 2 (GCP Config)
**Priority:** HIGH

### Summary
Configure Google Cloud Logging and replace 209 console.log calls with structured logging.

### Files
- `src/lib/logger.ts` (to be created/enhanced)
- `src/middleware.ts`
- Search codebase for `console.log` (209 instances)

### AI Log
- [Dev1-Claude @ 2025-11-29]: Large refactor, essential for debugging.

---

## Ticket: P0-CFG-SECRETS-AUDIT
**Owner:** Dev 2 (Lead), Dev 1 (Review)
**Priority:** HIGH

### Summary
Audit and verify all secrets configured in Google Secret Manager.

### Files
- `apphosting.yaml`
- `docs/SECRETS.md` (to be created)
- `.env.example`

### AI Log
- [Dev1-Claude @ 2025-11-29]: Prerequisites for other security tickets.
- [Dev2-Infra @ 2025-11-29]: ✅ COMPLETED. Created docs/SECRETS.md with full audit. Found 7 critical missing secrets: STRIPE_SECRET_KEY, CANPAY_WEBHOOK_SECRET, SENTRY_DSN, 4x Google API keys. Created .env.example. Ready for P0-SEC-STRIPE-CONFIG and P0-SEC-CANNPAY-WEBHOOK.

---

**REMINDER TO DEV 1 & DEV 3**: Secrets audit complete. Review `docs/SECRETS.md` before implementing P0-SEC-STRIPE-CONFIG, P0-SEC-CANNPAY-WEBHOOK, and P0-MON-SENTRY.

## COMPLETED TICKETS

---

## Ticket: P0-INFRA-FIX-500
**Owner:** Dev 2 (Infra)
**Priority:** CRITICAL
**Status:** ✅ DONE

### Summary
Resolved 500 error on bakedbot.ai - missing Firebase credentials and build failures.

### AI Log
- [Dev2-Infra @ 2025-11-28]: Fixed service account key, build pipeline, site now live.

---

*Last Updated: November 29, 2025*
*Next Review: Daily during Phase 0*
