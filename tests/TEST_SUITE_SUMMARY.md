# Track C: End-to-End Testing Suite - Summary

> Comprehensive test coverage for Tier 1 critical systems (Revenue + Compliance)

**Created:** 2026-02-19
**Status:** ✅ Complete (5 test suites)
**Framework:** Jest (unit), Playwright (E2E)

---

## Test Suites Created

### 1. Campaign Send Flow E2E Test ✅
**File:** `tests/e2e/campaign-send-flow.spec.ts`
**Type:** E2E (Playwright)
**Test Count:** 20+ test cases
**Priority:** Tier 1 - Revenue + Compliance Critical

#### Coverage Areas:
- ✅ Campaign creation (form validation, draft save)
- ✅ Deebo compliance check integration
- ✅ Compliance failures block campaign approval
- ✅ Campaign scheduling (future send dates)
- ✅ Tier limits enforcement (Pro/Enterprise restrictions)
- ✅ Send tracking and performance metrics
- ✅ Error handling (missing config, delivery failures)
- ✅ Negative cases (no compliance check, past dates, empty audience)

#### Key Test Cases:
1. **Happy Path:** Create → Compliance Check → Schedule → Send → Verify
2. **Compliance Gate:** Medical claims block send until fixed
3. **Tier Limits:** Blocks send when limit exceeded
4. **Error Recovery:** Graceful failure handling

#### Mocking Strategy:
- No mocks (true E2E)
- Requires test brand account with campaigns enabled
- Uses real Firestore, real email/SMS providers in test mode

---

### 2. POS Sync Flow E2E Test ✅
**File:** `tests/e2e/pos-sync-flow.spec.ts`
**Type:** E2E (Playwright)
**Test Count:** 25+ test cases
**Priority:** Tier 1 - Revenue Critical (Menu accuracy drives sales)

#### Coverage Areas:
- ✅ POS connection status display
- ✅ Manual sync trigger
- ✅ Product reconciliation (add/remove/update)
- ✅ Menu updates on public site
- ✅ Sync status indicators (count badges, mismatch warnings)
- ✅ Error handling (POS offline, partial failures)
- ✅ POS as single source of truth (removes manual products)
- ✅ Edge cases (zero products, concurrent syncs, category mapping)

#### Key Test Cases:
1. **Manual Sync:** Click → Loading → Success → Timestamp updates
2. **Product Reconcile:** New products added, removed products deleted
3. **Menu Parity:** Dashboard products match public menu
4. **Error States:** Helpful errors on POS offline/failure

#### Mocking Strategy:
- No mocks (true E2E)
- Requires test dispensary account with POS connected
- Tests actual Alleaves/CannMenus API integration

---

### 3. Public Menu Age Gate E2E Test ✅
**File:** `tests/e2e/public-menu-age-gate.spec.ts`
**Type:** E2E (Playwright)
**Test Count:** 30+ test cases
**Priority:** Tier 1 - Compliance Critical (Legal requirement)

#### Coverage Areas:
- ✅ Age gate display on first visit
- ✅ Age gate blocks menu content initially
- ✅ Required elements (Yes/No buttons, age question)
- ✅ Age verification flow (confirm grants access, deny blocks)
- ✅ Cookie persistence (verified state saved)
- ✅ Subsequent visits skip gate when cookie present
- ✅ Middleware enforcement (API calls blocked without verification)
- ✅ Server-side rendering fallback (works without JS)
- ✅ Edge cases (cookie tampering, expiration, rapid clicks)
- ✅ Mobile responsiveness
- ✅ Accessibility (keyboard nav, ARIA labels)

#### Key Test Cases:
1. **First Visit:** Age gate appears → Blocks menu
2. **Verification:** Click Yes → Cookie set → Menu visible
3. **Persistence:** Second visit → No gate → Direct menu access
4. **No-JS:** SSR renders gate correctly
5. **Security:** Invalid cookies ignored

#### Mocking Strategy:
- No mocks (true E2E)
- Tests real middleware enforcement
- Includes JS-disabled browser test

---

### 4. Billing Webhook Test ✅ (Already Exists - Reviewed)
**File:** `src/app/api/billing/authorize-net-webhook/__tests__/route.test.ts`
**Type:** Unit (Jest)
**Test Count:** 35+ test cases
**Priority:** Tier 1 - Revenue Critical

#### Coverage Areas:
- ✅ AUTHNET_SIGNATURE_KEY validation (missing → 500)
- ✅ HMAC-SHA512 signature validation
- ✅ Event processing (all subscription lifecycle events)
- ✅ Subscription status updates (active, failed, suspended, cancelled)
- ✅ Slack alerts on payment failures
- ✅ Error handling (invalid JSON, DB errors)

#### Key Test Cases:
1. **Signature Validation:** Invalid → 401, Valid → 200
2. **Status Transitions:** Payment success → active, declined → payment_failed
3. **Slack Alerts:** Failed payment → Slack notification
4. **Security:** Wrong signing key rejected

#### Mocking Strategy:
- ✅ Firestore fully mocked
- ✅ Slack webhook mocked via global fetch
- ✅ Crypto functions real (actual HMAC-SHA512)

**Status:** Already comprehensive. No expansion needed.

---

### 5. Deebo Compliance Check Unit Test ✅
**File:** `src/server/agents/__tests__/deebo-compliance.test.ts`
**Type:** Unit (Jest)
**Test Count:** 60+ test cases (driven by golden sets)
**Priority:** Tier 1 - Compliance Critical

#### Coverage Areas:
- ✅ Regex medical claims detection (cure, treat, prevent)
- ✅ LLM semantic checks (anecdotal vs medical, minors appeal)
- ✅ Age verification function (`deeboCheckAge`)
- ✅ State restrictions function (`deeboCheckStateAllowed`)
- ✅ Rule pack service (NY/CA/IL + fallback)
- ✅ Error handling (LLM failures, malformed responses)
- ✅ Multi-jurisdiction support
- ✅ Edge cases (empty content, special chars, case-insensitive)

#### Key Test Cases:
1. **Regex Fast Path:** "cure" → fail WITHOUT calling LLM
2. **LLM Semantic:** "customers report better sleep" → pass (anecdotal)
3. **Age Check:** 21+ allowed, under 21 blocked
4. **State Check:** NY/CA/IL allowed, ID/KS/NE blocked
5. **Golden Sets:** All 23 Deebo compliance cases from `.agent/golden-sets/deebo-compliance.json`

#### Mocking Strategy:
- ✅ AI/Genkit module fully mocked (controls LLM responses)
- ✅ Logger mocked
- ✅ Rule packs loaded from real JSON files
- ✅ Age/state functions unmocked (pure logic)

#### Golden Set Integration:
```typescript
import goldenSets from '@/../.agent/golden-sets/deebo-compliance.json';

goldenSets.test_cases.forEach(testCase => {
  it(`${testCase.id}: ${testCase.notes}`, async () => {
    // Test implementation driven by golden set
  });
});
```

---

## Test Quality Standards

All tests follow these principles:

### Independence
- ✅ Each test is independent (no shared state)
- ✅ Setup and teardown isolated per test
- ✅ No test depends on another test's side effects

### Descriptive Names
```typescript
it('should block campaign send when compliance check fails', async () => {
  // Clear intent from test name
});
```

### Coverage Types
- ✅ **Happy path:** Normal successful flow
- ✅ **Edge cases:** Boundary conditions, empty states
- ✅ **Error cases:** API failures, network issues, validation errors
- ✅ **Security cases:** Invalid cookies, signature tampering

### Assertion Quality
- ✅ Specific assertions (not just "truthy")
- ✅ Multiple assertions per test when appropriate
- ✅ Clear failure messages

---

## Running the Tests

### All Tests
```bash
npm test
```

### Specific Suite
```bash
# E2E tests (Playwright)
npx playwright test tests/e2e/campaign-send-flow.spec.ts
npx playwright test tests/e2e/pos-sync-flow.spec.ts
npx playwright test tests/e2e/public-menu-age-gate.spec.ts

# Unit tests (Jest)
npm test -- src/server/agents/__tests__/deebo-compliance.test.ts
npm test -- src/app/api/billing/authorize-net-webhook/__tests__/route.test.ts
```

### With Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

---

## Test Environment Setup

### E2E Tests (Playwright)
Requires:
- Local dev server running (`npm run dev`)
- Test accounts seeded:
  - Brand account: `test-brand@bakedbot.ai`
  - Dispensary account: `test-dispensary@bakedbot.ai`
- Test data:
  - Sample campaigns
  - POS connection configured
  - Public menu at `/thrivesyracuse`

Configure in `.env.test.local`:
```env
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
TEST_BRAND_EMAIL=test-brand@bakedbot.ai
TEST_BRAND_PASSWORD=TestPassword123!
TEST_DISPENSARY_EMAIL=test-dispensary@bakedbot.ai
TEST_DISPENSARY_PASSWORD=TestPassword123!
TEST_MENU_SLUG=thrivesyracuse
```

### Unit Tests (Jest)
No special setup required. Mocks handle all external dependencies.

---

## Coverage Report

### Tier 1 Critical Systems
| System | E2E Coverage | Unit Coverage | Status |
|--------|-------------|---------------|--------|
| Campaign Send | ✅ 20 tests | ✅ Indirect (sender) | Complete |
| POS Sync | ✅ 25 tests | ⚠️ TODO | E2E covers critical path |
| Age Gate | ✅ 30 tests | ⚠️ TODO | E2E + middleware sufficient |
| Billing Webhooks | N/A (external) | ✅ 35 tests | Complete |
| Compliance (Deebo) | ✅ Indirect | ✅ 60 tests | Complete |

### Overall Stats
- **Total Test Files:** 5
- **Total Test Cases:** 170+
- **E2E Tests:** 75+
- **Unit Tests:** 95+
- **Compliance Tests:** 60+
- **Coverage Target:** 70% (lines, branches, functions, statements)

---

## Next Steps

### Immediate (Before Production)
1. ✅ Run full test suite: `npm test && npx playwright test`
2. ✅ Verify coverage meets 70% threshold
3. ✅ Fix any failing tests
4. ✅ Seed test accounts in staging environment

### Short-term
1. Add unit tests for POS sync service
2. Add age gate middleware unit tests
3. Expand campaign sender test coverage
4. Add visual regression tests (Playwright screenshots)

### Long-term
1. CI/CD integration (run tests on every PR)
2. Nightly E2E runs against staging
3. Performance benchmarks
4. Load testing for campaign sends

---

## Test Patterns & Examples

### E2E Pattern (Playwright)
```typescript
test('User can complete checkout flow', async () => {
  // Arrange
  await page.goto('/menu');

  // Act
  await page.click('[data-product-id="123"]');
  await page.click('button:has-text("Add to Cart")');
  await page.goto('/checkout');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button:has-text("Place Order")');

  // Assert
  await expect(page.locator('text=/Order Confirmed/i')).toBeVisible();
});
```

### Unit Test Pattern (Jest)
```typescript
it('personalizes email template with customer data', () => {
  // Arrange
  const template = 'Hi {{firstName}}, you have {{loyaltyPoints}} points!';
  const customer = { firstName: 'Alice', loyaltyPoints: 500 };

  // Act
  const result = personalize(template, customer);

  // Assert
  expect(result).toBe('Hi Alice, you have 500 points!');
});
```

### Mock Pattern (Jest)
```typescript
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => mockData })
      })
    })
  })
}));
```

---

## Gotchas & Known Issues

### E2E Tests
- **Timeout Issues:** Default 60s. Increase for slow operations: `test.setTimeout(120000)`
- **Age Gate Cookie:** Clear cookies in `beforeEach` for fresh tests
- **Network Idle:** Use `waitForLoadState('networkidle')` for dynamic content
- **Selectors:** Prefer `data-testid` over text/CSS selectors for stability

### Unit Tests
- **Firestore Mocks:** Must mock BOTH `@/firebase/admin` AND `firebase-admin/firestore`
- **Date Mocking:** Use `jest.useFakeTimers()` for time-dependent tests
- **Async Errors:** Always `await` async calls or use `.rejects.toThrow()`
- **Golden Sets:** Import path must be `@/../.agent/...` (outside src/)

### Jest Config
- **Module Aliases:** `@/` mapped to `<rootDir>/src/` in `moduleNameMapper`
- **ESM Modules:** Added to `transformIgnorePatterns` for transpilation
- **Server-Only:** Mocked to prevent client/server boundary violations

---

## Contact & Support

**Test Suite Owner:** Track C (Production Readiness Audit)
**Documentation:** This file + inline test comments
**Issues:** File in `dev/backlog.json` with `test` label

**Quick Links:**
- [Jest Config](../jest.config.js)
- [Playwright Config](../playwright.config.ts)
- [Golden Sets](../.agent/golden-sets/)
- [Campaign Sender Tests](../src/server/services/__tests__/campaign-sender.test.ts)
