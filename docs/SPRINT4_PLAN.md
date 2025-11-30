# Sprint 4 Plan - Testing & Security Validation

**Sprint Duration:** December 1-4, 2025 (4 days)
**Sprint Goal:** Complete all testing, security audit, achieve 9.0/10 readiness
**Target Readiness Score:** 9.0/10 (currently 8.8/10)
**Focus:** Testing completion, security validation, production certification

---

## 🎯 SPRINT 4 OBJECTIVES

### Primary Goals:
1. **Complete Sprint 3 Carryover** - Finish all incomplete CRITICAL tickets
2. **Security Audit** - Formal security review and vulnerability assessment
3. **E2E Testing** - Complete end-to-end checkout and compliance testing
4. **Integration Testing** - Validate CannPay, onboarding, and dashboard flows
5. **Legal Review Initiation** - Engage attorney for state compliance certification

### Success Criteria:
- [ ] Production Readiness Score ≥ 9.0/10
- [ ] All CRITICAL tickets completed (100%)
- [ ] Security audit complete with no critical vulnerabilities
- [ ] Test coverage ≥ 80%
- [ ] All E2E tests passing
- [ ] Legal review initiated

---

## 👨‍💻 DEV 1 (Lead Developer) - 6 Hours

**Focus:** Complete Sentry integration, Firestore rules testing

### Assigned Tickets:

#### 1. **P0-INT-SENTRY** (CRITICAL) - 1 hour
**Status:** 90% complete, final 10% remaining
**Remaining Work:**
- Replace `console.error` with `logger.error` in 20+ API routes
- Files to update:
  - `src/app/api/dispensary/orders/[orderId]/status/route.ts`
  - `src/app/api/inventory/forecast/route.ts`
  - `src/app/api/analytics/forecast/route.ts`
  - Plus 17 more API routes

**Definition of Done:**
- ✅ All `console.error` replaced with `logger.error` in API routes
- ✅ Structured logging with `[P0-INT-SENTRY]` prefix
- ✅ Error context included (message, stack, path, user info)
- ✅ Test error appears in Sentry dashboard
- ✅ TypeScript compilation passes

---

#### 2. **P0-TEST-FIRESTORE-RULES** (CRITICAL) - 3 hours
**Status:** Not started
**Description:** Create Firebase emulator test suite for security rules

**Files to Create:**
- `tests/firestore-rules/brands.spec.ts`
- `tests/firestore-rules/customers.spec.ts`
- `tests/firestore-rules/orders.spec.ts`
- `tests/firestore-rules/analytics.spec.ts`
- `tests/firestore-rules/setup.ts` (emulator configuration)

**Test Scenarios:**
1. **Owner Role (Admin)**
   - ✅ Can read all collections
   - ✅ Can write all collections
   - ✅ Can delete all collections

2. **Brand Role**
   - ✅ Can read own brandId resources
   - ❌ Cannot read other brands' resources
   - ✅ Can write own brandId resources
   - ❌ Cannot write other brands' resources

3. **Dispensary Role**
   - ✅ Can read own locationId resources
   - ❌ Cannot read other locations' resources
   - ✅ Can write own locationId resources
   - ❌ Cannot write other locations' resources

4. **Customer Role**
   - ✅ Can read own userId resources
   - ❌ Cannot read other customers' resources
   - ✅ Can write own profile
   - ❌ Cannot write orders (server-only)

5. **Unauthorized User**
   - ❌ Cannot read any collection
   - ❌ Cannot write any collection

**Test Coverage Target:** 90%+ rule coverage

**Definition of Done:**
- ✅ All tests passing in Firebase emulator
- ✅ 90%+ rule coverage achieved
- ✅ Tests documented in README
- ✅ Tests run in CI/CD pipeline
- ✅ TypeScript compilation passes

---

#### 3. **P0-UX-DEMO-SEED-DATA** (HIGH) - 2 hours
**Status:** Not started (optional if time permits)
**Description:** Seed Firestore with demo dispensary data

**Files to Create:**
- `scripts/seed-demo-data.ts`
- `docs/DEMO_MODE.md`

**Seed Data:**
1. **Demo Brand:** "40 Tons"
   - `brandId: "demo-40tons"`
   - Description: "Premium cannabis brand from California"
   - Products: 10 demo products

2. **Demo Dispensary:** "Ultra Cannabis Detroit"
   - `locationId: "demo-ultra-detroit"`
   - Address: "123 Main St, Detroit, MI 48201"
   - State: Michigan (recreational legal, 21+, 71g flower limit)

3. **Demo Products (10 total):**
   - 4 flower products (3.5g, 7g, 14g, 28g)
   - 3 concentrate products (1g, 2g, 3.5g)
   - 3 edible products (100mg, 250mg, 500mg)

4. **Demo Orders (5 total):**
   - 1 pending order
   - 2 confirmed orders
   - 1 completed order
   - 1 failed order

**Definition of Done:**
- ✅ Script creates all demo data in Firestore
- ✅ Demo mode displays real products
- ✅ Demo users can log in and browse
- ✅ Demo orders show various statuses
- ✅ Documentation complete

---

## 🧪 DEV 3 (QA/Security) - 9 Hours ⚠️ CRITICAL SPRINT

**Focus:** Security audit, E2E testing, compliance validation
**Note:** REDEMPTION SPRINT - All Sprint 3 tasks incomplete

### Assigned Tickets:

#### 1. **P0-SECURITY-AUDIT** (CRITICAL) - 2 hours
**Status:** Not started
**Description:** Perform comprehensive security audit of authentication/authorization

**Files to Create:**
- `docs/SECURITY_AUDIT.md` (audit report)
- `docs/SECURITY_FIXES.md` (remediation plan)

**Audit Checklist:**

**Authentication:**
- [ ] Firebase Auth properly configured
- [ ] Token verification on all API routes
- [ ] Token expiration enforced (1 hour)
- [ ] Refresh tokens working correctly
- [ ] No authentication bypass possible

**Authorization:**
- [ ] Role-based access control (RBAC) enforced server-side
- [ ] Custom claims (role, brandId, locationId) set correctly
- [ ] No API routes accessible without authorization
- [ ] Firestore rules prevent unauthorized access
- [ ] Cross-account access prevented (brand can't access other brands)

**Secrets Management:**
- [ ] No secrets exposed in client code
- [ ] All secrets stored in GCP Secret Manager
- [ ] No hardcoded credentials in source code
- [ ] Environment variables properly scoped (NEXT_PUBLIC_* only for client)

**Webhook Security:**
- [ ] CannPay webhook signature verification working
- [ ] Stripe webhook signature verification working
- [ ] Invalid signatures return 403 Forbidden
- [ ] Replay attack prevention (timestamp validation)

**Input Validation:**
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (React escapes by default)
- [ ] No CSRF vulnerabilities
- [ ] File upload validation (if applicable)
- [ ] API input validation on all routes

**Dependency Security:**
- [ ] Run `npm audit` - no critical vulnerabilities
- [ ] Run `npm audit fix` if needed
- [ ] Document any remaining vulnerabilities with justification

**Definition of Done:**
- ✅ Audit report completed (docs/SECURITY_AUDIT.md)
- ✅ All critical vulnerabilities fixed
- ✅ High/medium vulnerabilities documented with remediation plan
- ✅ `npm audit` shows zero critical vulnerabilities
- ✅ Security certification ready for legal review

---

#### 2. **P0-E2E-CHECKOUT-FLOW** (CRITICAL) - 3 hours
**Status:** Not started
**Description:** Create end-to-end Playwright tests for checkout

**Files to Create:**
- `tests/e2e/checkout.spec.ts`
- `tests/e2e/age-gate.spec.ts`
- `tests/e2e/compliance.spec.ts`
- `playwright.config.ts` (if not exists)

**Test Scenarios:**

**Age Gate Tests:**
1. ✅ Underage user (< 21) blocked from browsing products
2. ✅ 21+ user can proceed to product catalog
3. ✅ Age gate remembers verified users (localStorage)
4. ✅ Medical-only state (FL) requires 18+ with medical card
5. ✅ Illegal state (TX) shows "not available" message

**Checkout Flow Tests:**
1. ✅ Add product to cart
2. ✅ Update cart quantities
3. ✅ Remove product from cart
4. ✅ Proceed to checkout
5. ✅ Enter delivery address (state validation)
6. ✅ Compliance check blocks illegal states
7. ✅ Compliance check enforces purchase limits
8. ✅ Select payment method (CannPay/Stripe)
9. ✅ Process payment (mocked)
10. ✅ Order confirmation displayed
11. ✅ Email confirmation sent (mocked)

**Compliance Tests:**
1. ✅ Purchase exceeding state limits blocked
2. ✅ Medical-only state requires medical card
3. ✅ Cross-state shipping blocked
4. ✅ Underage purchase blocked server-side
5. ✅ Illegal state purchase blocked server-side

**Definition of Done:**
- ✅ All tests passing
- ✅ Tests run in CI/CD pipeline
- ✅ Coverage report generated
- ✅ Test documentation complete
- ✅ Tests use realistic scenarios (not just happy path)

---

#### 3. **P0-COMPLIANCE-TEST-SUITE** (CRITICAL) - 2 hours
**Status:** Not started (may already be complete - verify)
**Description:** Validate Deebo compliance test suite covers all 51 states

**Files to Review:**
- `tests/server/agents/deebo.spec.ts` (already exists - 153 tests)
- `tests/server/agents/deebo-states.spec.ts` (already exists)

**Verification Checklist:**
- [ ] All 51 states tested (24 legal + 15 medical + 12 illegal)
- [ ] Age requirements correct for each state
- [ ] Medical card requirements correct
- [ ] Purchase limits correct (flower, concentrate, edibles)
- [ ] Legal status correct (legal, medical, illegal, decriminalized)
- [ ] Cross-state edge cases covered
- [ ] All tests passing

**Additional Tests (if missing):**
1. **Medical Card Expiration** (if applicable)
2. **Multi-state customer scenarios**
3. **Gift-a-Gram compliance** (if feature exists)

**Definition of Done:**
- ✅ All 51 states validated
- ✅ Tests validate against `src/lib/compliance/compliance-rules.ts`
- ✅ All tests passing in CI/CD
- ✅ Coverage report shows 100% state coverage
- ✅ Test documentation complete

---

#### 4. **P0-LOAD-TESTING** (HIGH) - 2 hours
**Status:** Not started
**Description:** Perform load testing on production environment

**Files to Create:**
- `tests/load/checkout.js` (k6 script)
- `tests/load/browse-products.js` (k6 script)
- `docs/LOAD_TEST_REPORT.md`

**Load Test Scenarios:**

**Scenario 1: Product Browsing (Low Load)**
- **Users:** 100 concurrent users
- **Duration:** 5 minutes
- **Actions:** Browse products, view product details, add to cart
- **Target:** P95 < 500ms

**Scenario 2: Checkout Flow (Medium Load)**
- **Users:** 50 concurrent users
- **Duration:** 10 minutes
- **Actions:** Full checkout flow (browse → cart → checkout → payment)
- **Target:** P95 < 1000ms

**Scenario 3: Peak Traffic (High Load)**
- **Users:** 200 concurrent users
- **Duration:** 5 minutes
- **Actions:** Mixed traffic (browsing + checkout)
- **Target:** P95 < 2000ms, error rate < 1%

**Metrics to Track:**
- **Response Time:** P50, P95, P99
- **Error Rate:** 4xx and 5xx responses
- **Throughput:** Requests per second
- **Resource Utilization:** CPU, memory, network

**Definition of Done:**
- ✅ Load tests completed for all 3 scenarios
- ✅ Report shows performance metrics
- ✅ Bottlenecks identified and documented
- ✅ Recommendations for optimization (if needed)
- ✅ P95 < 2000ms under peak load
- ✅ Error rate < 1% under peak load

---

## 💻 DEV 4 (Integration) - 9 Hours ⚠️ CRITICAL SPRINT

**Focus:** CannPay integration, onboarding validation, dashboard testing
**Note:** All Sprint 3 tasks incomplete - must catch up

### Assigned Tickets:

#### 1. **P0-CANNPAY-INTEGRATION-TEST** (CRITICAL) - 3 hours
**Status:** Not started
**Description:** Test CannPay payment flow end-to-end in sandbox

**Files to Create:**
- `tests/integration/cannpay.spec.ts`
- `docs/CANNPAY_TESTING.md`

**Test Scenarios:**

**Payment Intent Creation:**
1. ✅ Create payment intent with valid order
2. ✅ Receive intent ID and checkout URL
3. ✅ Verify intent stored in Firestore

**Payment Processing (Sandbox):**
1. ✅ Simulate successful payment
2. ✅ Simulate failed payment (declined card)
3. ✅ Simulate payment timeout
4. ✅ Simulate payment cancellation

**Webhook Handling:**
1. ✅ Webhook received with valid signature
2. ✅ Webhook signature verification passes
3. ✅ Order status updated correctly
4. ✅ Customer notification sent (email/SMS)
5. ✅ Dispensary notification sent

**Edge Cases:**
1. ✅ Duplicate webhook handling (idempotency)
2. ✅ Out-of-order webhooks
3. ✅ Invalid signature returns 403
4. ✅ Missing signature returns 403

**Definition of Done:**
- ✅ Successful test payment in CannPay sandbox
- ✅ Webhook received and verified
- ✅ Order status updated correctly
- ✅ Integration tests passing
- ✅ Documentation complete with sandbox credentials
- ✅ Error handling tested

---

#### 2. **P0-BRAND-ONBOARDING-FLOW** (CRITICAL) - 3 hours
**Status:** Not started
**Description:** Test and document brand onboarding process

**Files to Create:**
- `tests/e2e/onboarding.spec.ts`
- `docs/BRAND_ONBOARDING.md`

**Onboarding Steps to Validate:**

**Step 1: Signup Form**
1. ✅ Form validation works (required fields)
2. ✅ Email validation (valid format)
3. ✅ Password requirements enforced (min length, complexity)
4. ✅ Business information collected (brand name, license number)

**Step 2: Firebase Auth**
1. ✅ Account created in Firebase Auth
2. ✅ Email verification sent (optional)
3. ✅ User can log in with credentials

**Step 3: Custom Claims**
1. ✅ Custom claims set: `{ role: 'brand', brandId: '<uuid>' }`
2. ✅ Claims propagated to token
3. ✅ Token refresh includes claims

**Step 4: Firestore Profile**
1. ✅ Brand document created in `brands` collection
2. ✅ Brand fields populated: name, license, contact, address
3. ✅ Brand ID matches custom claim brandId

**Step 5: Dashboard Access**
1. ✅ User redirected to `/dashboard` after onboarding
2. ✅ Dashboard shows brand-specific data
3. ✅ Navigation works (products, analytics, orders)

**Step 6: CannMenus Integration (Optional)**
1. ✅ CannMenus search works
2. ✅ Manual entry fallback works
3. ✅ Brand data populated from CannMenus

**Definition of Done:**
- ✅ Can onboard new brand from signup to dashboard
- ✅ E2E test validates full flow
- ✅ Documentation complete with screenshots
- ✅ Error handling tested (duplicate email, invalid license, etc.)

---

#### 3. **P0-DISPENSARY-DASHBOARD-TEST** (HIGH) - 2 hours
**Status:** Not started
**Description:** Test dispensary manager dashboard functionality

**Files to Create:**
- `tests/e2e/dispensary-dashboard.spec.ts`
- `docs/DISPENSARY_DASHBOARD.md`

**Dashboard Features to Test:**

**Orders Tab:**
1. ✅ View pending orders list
2. ✅ Update order status (confirmed → preparing → ready → completed)
3. ✅ View order details (products, customer, total)
4. ✅ Cancel order (if allowed)

**Notifications:**
1. ✅ Send customer email notification
2. ✅ Send customer SMS notification (if phone provided)
3. ✅ Notification template correct

**Analytics Tab:**
1. ✅ View sales analytics (daily, weekly, monthly)
2. ✅ View top products
3. ✅ View customer demographics (if available)

**Settings Tab:**
1. ✅ Update dispensary profile
2. ✅ Update business hours
3. ✅ Update inventory settings

**Definition of Done:**
- ✅ All dashboard features tested
- ✅ Tests passing in CI/CD
- ✅ Documentation complete
- ✅ Screenshots included

---

#### 4. **P0-STRIPE-FALLBACK-CONFIG** (HIGH) - 1 hour
**Status:** Not started (optional)
**Description:** Configure Stripe as payment fallback

**Tasks:**
1. ✅ Create Stripe account (if not exists)
2. ✅ Configure webhook endpoint (`/api/payments/webhooks`)
3. ✅ Test payment flow with Stripe sandbox
4. ✅ Verify fallback logic works (CannPay fails → Stripe used)
5. ✅ Document Stripe configuration

**Definition of Done:**
- ✅ Stripe configured as backup payment processor
- ✅ Fallback logic tested
- ✅ Documentation complete

---

## 🏗️ DEV 2 (Infrastructure) - 2 Hours (Support Role)

**Focus:** Support team, monitor production, fix urgent issues

### Assigned Tasks:

#### 1. **Production Deployment Support** (1 hour)
- Monitor production deployment
- Verify all services healthy
- Check Cloud Logging for errors
- Support team with GCP/Firebase issues

#### 2. **CI/CD Pipeline Monitoring** (1 hour)
- Ensure all tests run in GitHub Actions
- Fix any pipeline failures
- Update workflow if needed

---

## 📊 SPRINT 4 METRICS

### Success Criteria:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Production Readiness Score | 9.0/10 | 8.8/10 | 🟡 In Progress |
| Tickets Completed | 100% | 0% | 🔴 Not Started |
| Test Coverage | >80% | ~65% | 🟡 Needs Work |
| Security Audit | Complete | Not Started | 🔴 Critical |
| E2E Tests | Passing | Not Exists | 🔴 Critical |
| Legal Review | Initiated | Not Started | 🟡 Pending |

### Velocity Targets:
- **Dev 1:** 3 tickets (6 hours) - Complete Sentry + Firestore tests
- **Dev 2:** Support role (2 hours) - Monitor production
- **Dev 3:** 4 tickets (9 hours) - ⚠️ CRITICAL REDEMPTION SPRINT
- **Dev 4:** 4 tickets (9 hours) - ⚠️ CRITICAL CATCH-UP SPRINT

**Total Sprint Capacity:** 26 hours

---

## 🚨 SPRINT 4 CRITICAL SUCCESS FACTORS

### For Dev 3:
**MUST COMPLETE:** All 4 tickets. This is the final opportunity to contribute before production launch.
- Security audit is BLOCKING production
- E2E tests are BLOCKING deployment
- If unable to complete, immediate escalation required

### For Dev 4:
**MUST COMPLETE:** CannPay integration + Onboarding validation (minimum).
- Payment processing must be validated before launch
- Onboarding must work for first customers

### For Dev 1:
**MUST COMPLETE:** Sentry integration + Firestore rules tests.
- Production monitoring is CRITICAL
- Security rules must be validated

---

## 📅 SPRINT 4 MILESTONES

### Day 1 (Dec 1):
- ✅ Dev 1: Complete Sentry integration (1h)
- ✅ Dev 3: Start security audit (2h)
- ✅ Dev 4: Start CannPay integration testing (2h)

### Day 2 (Dec 2):
- ✅ Dev 1: Complete Firestore rules tests (3h)
- ✅ Dev 3: Complete E2E checkout tests (3h)
- ✅ Dev 4: Complete onboarding validation (3h)

### Day 3 (Dec 3):
- ✅ Dev 3: Complete compliance test validation (2h)
- ✅ Dev 3: Complete load testing (2h)
- ✅ Dev 4: Complete dispensary dashboard tests (2h)
- ✅ Legal review initiated

### Day 4 (Dec 4):
- ✅ All tests passing
- ✅ Security audit complete
- ✅ Sprint review/demo
- ✅ Production deployment decision (GO/NO-GO)

---

## 🎯 SPRINT 4 COMPLETION CHECKLIST

- [ ] All CRITICAL tickets completed
- [ ] Security audit complete with no critical vulnerabilities
- [ ] All E2E tests passing
- [ ] Test coverage ≥ 80%
- [ ] Production readiness score ≥ 9.0/10
- [ ] Legal review initiated
- [ ] Production deployment GO decision

---

## 🚀 NEXT: SPRINT 5 PREVIEW

**Duration:** December 5-6, 2025 (2 days)
**Goal:** Production launch, legal certification, first customer onboarding
**Activities:** Production deployment, post-launch monitoring, bug fixes

---

*Generated: November 30, 2025*
*Sprint 4 Start: December 1, 2025*
*Sprint 4 End: December 4, 2025*
*Production Launch Target: December 6, 2025*
