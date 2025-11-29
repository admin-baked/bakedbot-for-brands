# Sprint 2 - Team Assignments

**Sprint Duration:** November 29 - December 6, 2025 (1 week)
**Sprint Goal:** Complete testing, deploy to production, unblock legal review
**Target Production Readiness Score:** 8.5/10 (currently 7.35/10)

---

## 🎯 SPRINT 2 CRITICAL BLOCKERS

### CEO (Manual Tasks - HIGHEST PRIORITY)
**Estimated Time:** 30-45 minutes
**Blocks:** Entire team

#### Tasks:
1. **Create GCP Secrets** (CRITICAL)
   - See: `docs/MANUAL_SETUP_REQUIRED.md`
   - Creates: CannPay, Stripe, Sentry secrets
   - Unblocks: Dev 1, Dev 2, Dev 3, Dev 4

2. **Deploy Firestore Rules** (CRITICAL)
   - Run: `firebase deploy --only firestore:rules`
   - Unblocks: Dev 3 testing

3. **Grant Service Account Permissions** (OPTIONAL)
   - Allows Dev 2 to automate future deployments
   - See: `docs/MANUAL_SETUP_REQUIRED.md`

---

## 👨‍💻 DEV 1 (Lead Developer - Antigravity Claude)

**Focus:** Testing, Integration, Compliance
**Current Sprint 1 Performance:** A+ OUTSTANDING (4/4 tickets, +397 lines)

### Sprint 2 Assignments:

#### CRITICAL (Must Complete):

**1. P0-TEST-DEEBO-AGENT** (2-3 hours)
- Create comprehensive Deebo compliance test suite
- Files:
  - `tests/server/agents/deebo.spec.ts` (unit tests)
  - `tests/server/agents/deebo-states.spec.ts` (51 state tests)
- Minimum coverage:
  - All 51 states (legal, medical, illegal, decriminalized)
  - Age validation (18+ medical, 21+ recreational)
  - Medical card requirements
  - Purchase limits (flower, concentrate, edibles)
  - Geo-restrictions
  - **Target:** 100% function coverage, 153+ test cases
- Dependencies: None
- Definition of Done:
  - ✅ All tests passing
  - ✅ 100% coverage on `src/server/agents/deebo.ts`
  - ✅ Tests run in CI/CD

**2. P0-TEST-FIRESTORE-RULES** (2-3 hours)
- Create Firebase emulator test suite for security rules
- Files:
  - `tests/firestore-rules/brands.spec.ts`
  - `tests/firestore-rules/customers.spec.ts`
  - `tests/firestore-rules/orders.spec.ts`
  - `tests/firestore-rules/analytics.spec.ts`
- Test scenarios:
  - Owner role: Can access all collections
  - Brand role: Can only access own brandId
  - Dispensary role: Can only access own locationId
  - Customer role: Can only access own userId
  - Unauthorized: Cannot access anything
- **Target:** 90%+ rule coverage
- Dependencies: CEO deploys Firestore rules
- Definition of Done:
  - ✅ All tests passing in Firebase emulator
  - ✅ 90%+ rule coverage
  - ✅ Tests documented in README

**3. P0-INT-SENTRY** (1 hour)
- Integrate Sentry error tracking
- Files:
  - `sentry.client.config.ts` (create)
  - `sentry.server.config.ts` (create)
  - `next.config.js` (add Sentry plugin)
- Replace `console.error` with `Sentry.captureException` in:
  - `src/app/api/checkout/process-payment/route.ts`
  - `src/app/api/webhooks/cannpay/route.ts`
  - `src/app/api/payments/webhooks/route.ts`
- Dependencies: CEO creates SENTRY_DSN secret
- Definition of Done:
  - ✅ Sentry SDK initialized
  - ✅ Test error appears in Sentry dashboard
  - ✅ Source maps uploaded for production

#### HIGH PRIORITY:

**4. P0-UX-DEMO-SEED-DATA** (2 hours)
- Seed Firestore with demo dispensary data
- Files:
  - `scripts/seed-demo-data.ts` (create)
  - `docs/DEMO_MODE.md` (create)
- Seed data:
  - Demo brand: "40 Tons" (brandId: `demo-40tons`)
  - Demo dispensary: "Ultra Cannabis Detroit" (locationId: `demo-ultra-detroit`)
  - 10 demo products (flower, concentrates, edibles)
  - 5 demo orders (various statuses)
- Definition of Done:
  - ✅ Script creates all demo data
  - ✅ Demo mode displays real data
  - ✅ Demo users can log in and browse

**5. P0-COMP-AGE-VERIFY-SERVER** (1 hour)
- Add server-side age verification to checkout API
- Files:
  - `src/app/api/checkout/process-payment/route.ts` (already has Deebo integration)
  - Verify Deebo age check is enforced before payment
- Definition of Done:
  - ✅ Cannot process payment if age < state minimum
  - ✅ Age stored in customer record
  - ✅ Integration test validates enforcement

---

## 🏗️ DEV 2 (Infrastructure - Antigravity Gemini)

**Focus:** Deployment, Monitoring, Production Config
**Current Sprint 1 Performance:** A EXCELLENT (5/5 tickets)

### Sprint 2 Assignments:

#### CRITICAL (Must Complete):

**1. P0-VERIFY-GCP-SECRETS** (30 minutes)
- Verify all CEO-created secrets are accessible
- Files: N/A (verification only)
- Test script:
  ```bash
  gcloud secrets versions access latest --secret="CANPAY_APP_KEY"
  gcloud secrets versions access latest --secret="SENTRY_DSN"
  ```
- Dependencies: CEO creates secrets
- Definition of Done:
  - ✅ All 7 secrets accessible (or 5 if no Stripe)
  - ✅ Secrets appear in `apphosting.yaml`
  - ✅ Test deployment pulls secrets correctly

**2. P0-DEPLOY-PRODUCTION-BUILD** (1 hour)
- Trigger production deployment to Firebase App Hosting
- Verify build succeeds with all secrets
- Monitor for errors in Cloud Logging
- Dependencies: CEO creates secrets, deploys Firestore rules
- Definition of Done:
  - ✅ Build completes without errors
  - ✅ Site loads at https://bakedbot.ai
  - ✅ No 500 errors in logs
  - ✅ Sentry receiving errors

**3. P0-MON-ALERTS-CONFIG** (1 hour)
- Configure Google Cloud Monitoring alerts
- Files:
  - `docs/MONITORING_ALERTS.md` (create)
- Alerts to create:
  - Payment failures (>5/hour)
  - 500 errors (>10/hour)
  - Firestore quota exceeded
  - Cloud Run crashes
- Dependencies: CEO grants monitoring permissions
- Definition of Done:
  - ✅ Alerts configured in GCP Console
  - ✅ Test alert fires and delivers to email/Slack
  - ✅ Runbook documented

#### HIGH PRIORITY:

**4. P0-CI-CD-GITHUB-ACTIONS** (2 hours)
- Set up GitHub Actions CI/CD pipeline
- Files:
  - `.github/workflows/ci.yml` (create)
  - `.github/workflows/deploy.yml` (create)
- Pipeline steps:
  - Lint (ESLint)
  - Type check (TypeScript)
  - Unit tests (Jest)
  - E2E tests (Playwright)
  - Deploy to staging (on PR)
  - Deploy to production (on main merge)
- Definition of Done:
  - ✅ All checks pass on PR
  - ✅ Auto-deploy to staging on PR
  - ✅ Auto-deploy to production on merge

**5. P0-LIGHTHOUSE-PERFORMANCE** (1 hour)
- Run Lighthouse audit on production
- Files:
  - `docs/PERFORMANCE_REPORT.md` (create)
- Target scores:
  - Performance: >90
  - Accessibility: >95
  - Best Practices: >95
  - SEO: >90
- Definition of Done:
  - ✅ Lighthouse report generated
  - ✅ Scores meet targets (or action plan for fixes)
  - ✅ Report committed to repo

---

## 🧪 DEV 3 (QA/Security - Antigravity Claude)

**Focus:** Testing, Security Audits, Compliance Validation
**Current Sprint 1 Performance:** INCOMPLETE (0/3 tickets - NEEDS IMPROVEMENT)

### Sprint 2 Assignments:

#### CRITICAL (Must Complete - REDEMPTION SPRINT):

**1. P0-E2E-CHECKOUT-FLOW** (3 hours)
- Create end-to-end Playwright tests for checkout
- Files:
  - `tests/e2e/checkout.spec.ts` (create)
  - `tests/e2e/age-gate.spec.ts` (create)
  - `tests/e2e/compliance.spec.ts` (create)
- Test scenarios:
  - Age gate blocks underage users
  - Age gate allows 21+ users
  - Medical-only states require medical card
  - Purchase limits enforced
  - Payment processing (mocked)
  - Order confirmation email sent
- Dependencies: CEO deploys Firestore rules
- Definition of Done:
  - ✅ All tests passing
  - ✅ Tests run in CI/CD
  - ✅ Coverage report generated

**2. P0-SECURITY-AUDIT** (2 hours)
- Perform security audit of authentication/authorization
- Files:
  - `docs/SECURITY_AUDIT.md` (create)
- Audit checklist:
  - ✅ No API routes accessible without authentication
  - ✅ Role-based access enforced on server
  - ✅ Firestore rules prevent unauthorized access
  - ✅ Webhook signatures verified
  - ✅ Secrets not exposed in client code
  - ✅ No SQL injection vulnerabilities
  - ✅ XSS protection enabled
  - ✅ CSRF protection enabled
- Dependencies: None
- Definition of Done:
  - ✅ Audit report completed
  - ✅ All critical vulnerabilities fixed
  - ✅ High/Medium vulnerabilities documented with remediation plan

**3. P0-COMPLIANCE-TEST-SUITE** (2 hours)
- Create compliance validation tests
- Files:
  - `tests/compliance/state-rules.spec.ts` (create)
  - `tests/compliance/age-verification.spec.ts` (create)
- Test all 51 states:
  - Legal status correct
  - Age requirements correct
  - Medical card requirements correct
  - Purchase limits correct
- Dependencies: None
- Definition of Done:
  - ✅ All 51 states tested
  - ✅ Tests validate against `src/lib/compliance/compliance-rules.ts`
  - ✅ Tests pass in CI/CD

#### HIGH PRIORITY:

**4. P0-LOAD-TESTING** (2 hours)
- Perform load testing on production
- Files:
  - `tests/load/checkout.js` (create with k6)
  - `docs/LOAD_TEST_REPORT.md` (create)
- Test scenarios:
  - 100 concurrent users browsing products
  - 50 concurrent checkouts
  - API response times <500ms
- Definition of Done:
  - ✅ Load tests completed
  - ✅ Report shows performance metrics
  - ✅ Bottlenecks identified and documented

---

## 💻 DEV 4 (Integration - Codex in Browser)

**Focus:** CannPay Integration, Payment Testing, Brand Onboarding
**New Developer - Welcome to the team!**

### Sprint 2 Assignments:

#### CRITICAL (Must Complete):

**1. P0-CANNPAY-INTEGRATION-TEST** (3 hours)
- Test CannPay payment flow end-to-end
- Files:
  - `tests/integration/cannpay.spec.ts` (create)
  - `docs/CANNPAY_TESTING.md` (create)
- Test scenarios:
  - Create payment intent
  - Process payment (sandbox)
  - Webhook signature verification
  - Order status updates
  - Payment failure handling
- Dependencies: CEO creates CannPay secrets
- Definition of Done:
  - ✅ Successful test payment in CannPay sandbox
  - ✅ Webhook received and verified
  - ✅ Order status updated correctly
  - ✅ Integration tests passing

**2. P0-BRAND-ONBOARDING-FLOW** (3 hours)
- Test and document brand onboarding process
- Files:
  - `docs/BRAND_ONBOARDING.md` (create)
  - `tests/e2e/onboarding.spec.ts` (create)
- Onboarding steps to validate:
  - Brand signup form
  - Firebase Auth account creation
  - Custom claims set (role: 'brand', brandId)
  - Brand profile created in Firestore
  - Dashboard access granted
- Definition of Done:
  - ✅ Can onboard new brand from signup to dashboard
  - ✅ E2E test validates full flow
  - ✅ Documentation complete

#### HIGH PRIORITY:

**3. P0-DISPENSARY-DASHBOARD-TEST** (2 hours)
- Test dispensary manager dashboard
- Files:
  - `tests/e2e/dispensary-dashboard.spec.ts` (create)
- Test scenarios:
  - View pending orders
  - Update order status (confirmed → preparing → ready → completed)
  - Send customer notifications (email/SMS)
  - View analytics
- Definition of Done:
  - ✅ All dashboard features tested
  - ✅ Tests passing in CI/CD

**4. P0-STRIPE-FALLBACK-CONFIG** (1 hour)
- Configure Stripe as payment fallback (optional)
- Files:
  - `docs/STRIPE_SETUP.md` (create)
- Tasks:
  - Create Stripe account (if not exists)
  - Configure webhook endpoint
  - Test payment flow
- Definition of Done:
  - ✅ Stripe configured as backup payment processor
  - ✅ Fallback logic tested

---

## 📊 SPRINT 2 METRICS

### Success Criteria:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Production Readiness Score | 8.5/10 | 7.35/10 | 🟡 In Progress |
| Critical Blockers Resolved | 100% | 60% | 🟡 In Progress |
| Test Coverage | >80% | ~40% | 🔴 Needs Work |
| Security Audit | Complete | Not Started | 🔴 Needs Work |
| CI/CD Pipeline | Operational | Not Started | 🔴 Needs Work |

### Velocity Targets:

- **Dev 1:** 5 tickets (20 hours)
- **Dev 2:** 5 tickets (15 hours)
- **Dev 3:** 4 tickets (18 hours) - REDEMPTION SPRINT
- **Dev 4:** 4 tickets (15 hours)
- **CEO:** 3 manual tasks (45 minutes)

**Total Sprint Capacity:** 68 hours + CEO setup

---

## 🚀 SPRINT 2 MILESTONES

### Day 1-2 (Nov 29-30):
- ✅ CEO completes manual setup (GCP secrets, Firestore deployment)
- ✅ Dev 2 verifies secrets and deploys production build
- ✅ Dev 1 completes Deebo test suite
- ✅ Dev 3 starts security audit

### Day 3-4 (Dec 1-2):
- ✅ Dev 1 completes Firestore rules tests
- ✅ Dev 3 completes E2E checkout tests
- ✅ Dev 4 completes CannPay integration testing
- ✅ Dev 2 configures CI/CD pipeline

### Day 5-6 (Dec 3-4):
- ✅ All tests passing in CI/CD
- ✅ Security audit complete
- ✅ Load testing complete
- ✅ Production deployment verified

### Day 7 (Dec 5):
- ✅ Sprint review/demo
- ✅ Legal review prepared
- ✅ Production readiness assessment
- ✅ Sprint 3 planning

---

## 📝 DAILY STANDUPS

**Time:** 9:00 AM EST daily
**Format:** Async in Slack or 15-minute call

Each dev posts:
1. What I completed yesterday
2. What I'm working on today
3. Any blockers

---

## 🎉 SPRINT 2 COMPLETION CHECKLIST

- [ ] All 18 tickets completed (Dev 1: 5, Dev 2: 5, Dev 3: 4, Dev 4: 4)
- [ ] All tests passing in CI/CD
- [ ] Production readiness score ≥ 8.5/10
- [ ] Security audit complete with no critical issues
- [ ] CEO manual setup complete
- [ ] Production deployment successful
- [ ] No 500 errors in production logs
- [ ] Sentry receiving error reports
- [ ] Legal review package prepared

---

## 🚨 ESCALATION PATH

**Blockers:**
1. Post in dev team Slack channel
2. If unresolved in 2 hours, escalate to CEO
3. CEO can grant permissions, create secrets, or reassign work

**Critical Issues:**
- Production downtime → Immediately notify CEO
- Security vulnerability discovered → Immediately notify CEO + Dev 3
- Payment processing failure → Immediately notify CEO + Dev 4

---

*Generated by Dev 1 @ November 29, 2025*
*Sprint 2 Start: November 29, 2025*
*Sprint 2 End: December 6, 2025*
