# BakedBot Testing Guide
**Living Document - Last Updated: 2026-02-18**

This document tracks all testing tasks, test coverage, and quality assurance procedures for BakedBot.

---

## 🧪 Current Test Suite Status

### Test Coverage Summary
| Category | Tests | Status | Files |
|----------|-------|--------|-------|
| **Tool Caching** | 13 | ✅ Pass | `tests/services/tool-cache.test.ts` |
| **Audit Logging** | 12 | ✅ Pass | `tests/services/audit-log-streaming.test.ts` |
| **Audit API** | 10 | ✅ Pass | `tests/api/ceo/audit-logs-stream.test.ts` |
| **Slack Agent Bridge** | 34 | ✅ Pass | `tests/services/slack-agent-bridge.test.ts` |
| **Email Service** | 7 | ✅ Pass | `tests/services/email-service.test.ts` |
| **Email Warmup** | 20 | ✅ Pass | `tests/services/email-warmup.test.ts` |
| **System Health Checks** | 18 | ✅ Pass | `tests/services/system-health-checks.test.ts` |
| **User Notifications** | 25 | ✅ Pass | `tests/services/user-notification.test.ts` |
| **TOTAL** | **139** | ✅ **All Passing** | |

### Build Health
```bash
npm run check:types        # ✅ Passing (0 errors)
npm test                   # Run all tests
npm run lint              # ESLint checks
```

---

## 📋 Testing Workflows

### Local Testing Before Push
```bash
# 1. Type check
npm run check:types

# 2. Run all tests
npm test

# 3. Run specific test file
npm test -- tests/services/tool-cache.test.ts

# 4. Run tests in watch mode
npm test -- --watch

# 5. Lint check
npm run lint

# 6. Build check (if modifying Next.js pages)
npm run build
```

### Pre-Commit Checklist
- [ ] `npm run check:types` passes (0 errors)
- [ ] `npm test` passes (all tests passing)
- [ ] No console.log statements (use logger)
- [ ] Comments added for non-obvious logic
- [ ] Git diff reviewed for security issues
- [ ] Commit message describes WHAT and WHY

### Pre-Push Checklist
- [ ] All local tests pass
- [ ] Build health: `npm run check:types`
- [ ] No hardcoded secrets/API keys
- [ ] Documentation updated (if needed)
- [ ] Test coverage maintained/improved

---

## 🎯 Phase 2 Test Coverage (2026-02-17)

### ✅ Tool Caching Service Tests (13 tests)
**File:** `tests/services/tool-cache.test.ts`

**Covered Scenarios:**
- ✅ Cache miss → fetcher called
- ✅ Cache hit → fetcher NOT called
- ✅ TTL expiration → cache refreshed
- ✅ Pattern-based invalidation
- ✅ Concurrent access handling
- ✅ Error handling and propagation
- ✅ Statistics tracking (hits/misses/rate)
- ✅ Entry listing and sorting

**Test Command:**
```bash
npm test -- tests/services/tool-cache.test.ts
```

**Expected Output:**
```
PASS  tests/services/tool-cache.test.ts
  ToolCacheService
    withCache
      ✓ should return fresh data on cache miss
      ✓ should return cached data on cache hit
      ✓ should respect TTL expiration
      ✓ should use default TTL when not specified
      ✓ should handle errors in fetcher
      ✓ should not cache when fetcher throws
    invalidate
      ✓ should remove cached entry
      ✓ should handle invalidating non-existent entries
    invalidatePattern
      ✓ should invalidate entries matching pattern
      ✓ should support regex patterns
    ... (3 more tests)
  13 passed
```

### ✅ Audit Log Streaming Tests (12 tests)
**File:** `tests/services/audit-log-streaming.test.ts`

**Covered Scenarios:**
- ✅ Single action logging
- ✅ Batch action logging
- ✅ Log querying with filters
- ✅ Real-time streaming setup
- ✅ Filtering by action/actor/status
- ✅ Statistics calculation
- ✅ Stream cleanup
- ✅ Error handling

**Test Command:**
```bash
npm test -- tests/services/audit-log-streaming.test.ts
```

### ✅ Audit Log API Tests (10 tests)
**File:** `tests/api/ceo/audit-logs-stream.test.ts`

**Covered Scenarios:**
- ✅ 401 when not authenticated
- ✅ 200 with SSE response
- ✅ Query parameter parsing
- ✅ Filter syntax parsing
- ✅ Multiple action filtering
- ✅ Default values
- ✅ SSE header validation
- ✅ Error handling

**Test Command:**
```bash
npm test -- tests/api/ceo/audit-logs-stream.test.ts
```

---

## 🎯 Phase 3 Test Coverage (2026-02-18)

### ✅ System Health Checks Tests (18 tests)
**File:** `tests/services/system-health-checks.test.ts`

**Covered Scenarios:**
- ✅ Execute system_stats check (tenant/user/order counts)
- ✅ Execute heartbeat_diagnose check (health + issues)
- ✅ Execute platform_analytics check (service availability)
- ✅ Execute database_latency check (query performance)
- ✅ Return warning on stale heartbeat (>35 min)
- ✅ Return error on failed heartbeat
- ✅ Log health check runs to Firestore
- ✅ Calculate health statistics (success rate, breakdown)
- ✅ Handle unknown check types
- ✅ Handle execution errors gracefully
- ✅ Latency thresholds: healthy <200ms, warning 200-500ms, error >500ms

**Test Command:**
```bash
npm test -- tests/services/system-health-checks.test.ts
```

**Expected Output:**
```
PASS  tests/services/system-health-checks.test.ts
  SystemHealthChecksService
    executeCheck
      ✓ should execute system_stats check
      ✓ should execute heartbeat_diagnose check
      ✓ should return warning when heartbeat is stale
      ✓ should return error when heartbeat last run failed
      ... (8 more tests)
  18 passed
```

### ✅ User Notifications Tests (25 tests)
**File:** `tests/services/user-notification.test.ts`

**Covered Scenarios:**
- ✅ Send approval email with user context
- ✅ Send rejection email with reason
- ✅ Send promotion email with role info
- ✅ Include org admin email (fallback to users collection)
- ✅ Mailjet API integration (authentication, endpoint, headers)
- ✅ HTML email templates (approval, rejection, promotion)
- ✅ Handle missing user gracefully
- ✅ Handle Mailjet failures gracefully
- ✅ Handle missing Mailjet credentials
- ✅ Firestore error handling
- ✅ Network error handling

**Test Command:**
```bash
npm test -- tests/services/user-notification.test.ts
```

**Expected Output:**
```
PASS  tests/services/user-notification.test.ts
  UserNotificationService
    notifyUserApproved
      ✓ should send approval email to user
      ✓ should include user and org info in email
      ✓ should return false if user not found
      ... (7 more tests)
  25 passed
```

---

## 🚀 Manual Testing Checklist

### Super User Agent Tools - Manual Verification

#### Tool 1: Platform Analytics Caching
- [ ] **Test:** Call `platform_getAnalytics` twice within 10 minutes
- [ ] **Expected:** Second call returns cached data instantly
- [ ] **Verify:** Check logs for "HIT platform_getAnalytics"
- [ ] **Command:** Ask Leo agent "What's our MRR?"

#### Tool 2: Audit Log Streaming
- [ ] **Test:** Subscribe to `/api/ceo/audit-logs/stream` endpoint
- [ ] **Expected:** Historical logs returned, then real-time updates stream
- [ ] **Verify:** Browser DevTools Network tab shows "text/event-stream"
- [ ] **Command:** Open browser console:
```javascript
const es = new EventSource('/api/ceo/audit-logs/stream?limit=50');
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

#### Tool 3: User Approval Flow
- [ ] **Test:** Create pending user, approve via agent
- [ ] **Expected:** Status changes to 'active', lifecycleStage → 'customer'
- [ ] **Verify:** Check Firestore `users/{uid}` document
- [ ] **Command:** Ask Linus agent "Approve user rishabh@bakedbot.ai"

#### Tool 4: Cache Invalidation
- [ ] **Test:** Toggle a playbook, verify cache cleared
- [ ] **Expected:** Next `platform_listPlaybooks` call fetches fresh data
- [ ] **Verify:** Logs show "INVALIDATED platform_listPlaybooks"
- [ ] **Command:** Ask Glenda agent "Disable the campaign_automation playbook"

#### Tool 5: System Stats Caching
- [ ] **Test:** Call `system_getStats` multiple times
- [ ] **Expected:** Cache hit after first call (5-min TTL)
- [ ] **Verify:** Response latency <50ms on cache hits
- [ ] **Command:** Ask Leo agent "What are our system stats?"

#### Tool 6: System Health Checks (Phase 3a)
- [ ] **Test:** Trigger cron endpoint with valid CRON_SECRET
- [ ] **Expected:** 4 checks executed, results logged to Firestore
- [ ] **Verify:** `health_check_runs` collection contains run record
- [ ] **Command:** `curl -X POST http://localhost:3000/api/cron/system-health-checks -H "Authorization: Bearer $CRON_SECRET"`
- [ ] **Check statuses:** system_stats (healthy), heartbeat_diagnose, platform_analytics, database_latency

#### Tool 7: User Notifications (Phase 3b)
- [ ] **Test:** Approve a pending user via agent
- [ ] **Expected:** Approval email sent, audit logged, status → active
- [ ] **Verify:** Check user email inbox + Firestore `users/{uid}` document
- [ ] **Command:** Ask Linus agent "Approve user pending@example.com"
- [ ] **Email content:** Should include "Welcome", org name, dashboard link
- [ ] **Test rejection:** Reject user with reason
- [ ] **Expected:** Rejection email with reason message
- [ ] **Test promotion:** Promote user to super_user
- [ ] **Expected:** Promotion email with feature list (Analytics, User Mgmt, etc.)

---

## 🔧 Debugging & Troubleshooting

### Test Failures

**If tests fail:**
1. Read full error message from test output
2. Check if it's a mocking issue or logic issue
3. Run test in isolation: `npm test -- --testNamePattern="specific test"`
4. Check if Firebase mocks are set up correctly
5. Verify no external API calls in tests

**Common Issues:**
- **Mock not working:** Check jest.mock paths are absolute (@/path)
- **Async issues:** Ensure tests return promises or use done() callback
- **State leakage:** Clear mocks/state in beforeEach()
- **TTL timing:** Use jest.useFakeTimers() for time-dependent tests

### Cache Debugging

**Check cache status:**
```bash
# In agent chat, ask Leo:
"What are our cache statistics?"  # Returns hits/misses/hitRate/entries
```

**Clear cache manually:**
```bash
# In agent chat, ask Leo:
"Clear all caches"  # Calls system_clearCache()
```

**Monitor real-time caching:**
```bash
# Watch logs for cache operations
# Look for: "[Tool Cache] HIT", "[Tool Cache] MISS", "[Tool Cache] STORED"
```

---

## 📊 Metrics to Monitor

### Performance Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Cache hit rate | >70% | TBD | 📊 Monitor |
| Avg response time (cached) | <100ms | TBD | 📊 Monitor |
| Avg response time (uncached) | <500ms | TBD | 📊 Monitor |
| Test pass rate | 100% | 100% | ✅ Pass |

### Quality Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| TypeScript errors | 0 | 0 | ✅ Pass |
| Test coverage | >80% | TBD | 📊 Monitor |
| Type safety | strict | strict | ✅ Pass |
| Linting errors | 0 | 0 | ✅ Pass |

---

## 🔄 Continuous Integration

### GitHub Actions Pipeline
**Triggered on:** Every push to main

**Steps:**
1. Checkout code
2. Install dependencies
3. Run `npm run check:types` (fail fast)
4. Run `npm test` (all unit tests)
5. Run `npm run lint` (code style)
6. Deploy to Firebase App Hosting (on success)

**Expected:** All steps complete in <5 minutes

---

## 📝 Test Writing Guidelines

### When to Write Tests
- [ ] New service created
- [ ] New API endpoint created
- [ ] Complex business logic added
- [ ] Bug fixed (add regression test)
- [ ] Public method added to service

### Test Structure
```typescript
describe('MyService', () => {
    let service: MyService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MyService();
    });

    describe('methodName', () => {
        it('should do X when Y happens', async () => {
            // Arrange
            const input = { test: 'data' };

            // Act
            const result = await service.methodName(input);

            // Assert
            expect(result).toEqual({ expected: 'output' });
        });
    });
});
```

### Mocking Strategy
- Mock external services (Firebase, APIs)
- Mock time-dependent functions (Date, setTimeout)
- Don't mock internal helpers (use real implementations)
- Use jest.fn() for spy/mock functions
- Verify mock was called with correct parameters

---

## 🎓 Test Coverage by Feature

### Super User Agent Tools (Phase 2)
| Tool | Unit Tests | Integration | Manual | Status |
|------|-----------|-------------|--------|--------|
| platform_getAnalytics | ✅ | ⏳ | ⏳ | 🟡 Partial |
| platform_listTenants | ✅ | ⏳ | ⏳ | 🟡 Partial |
| user_approve | ✅ | ⏳ | ⏳ | 🟡 Partial |
| heartbeat_trigger | ✅ | ⏳ | ⏳ | 🟡 Partial |
| system_getStats | ✅ | ⏳ | ⏳ | 🟡 Partial |

### Legend
- ✅ = Complete
- ⏳ = Pending
- 🟡 = Partial
- ❌ = Not applicable

---

## 🚦 Testing Roadmap & Status

### Phase 3a: Scheduled System Checks ✅ Complete
- [x] System health check service (18 tests)
- [x] Cron endpoint for scheduled execution
- [x] Firestore logging of check runs
- [x] Health statistics calculations
- [x] Manual verification checklist

### Phase 3b: User Notifications ✅ Complete
- [x] Email notification service (25 tests)
- [x] Approval email with context
- [x] Rejection email with reasons
- [x] Promotion email with features
- [x] Mailjet API integration
- [x] HTML email templates
- [x] Manual verification checklist

### Phase 4: Integration Tests (Planned)
- [ ] Tool caching + Firebase integration
- [ ] Audit streaming + Firestore listeners
- [ ] Health checks + alert triggering
- [ ] Scheduled checks + Cloud Tasks

### Phase 5: E2E Tests (Planned)
- [ ] Super User agent workflows
- [ ] Dashboard audit log UI
- [ ] Real-time streaming in browser
- [ ] Cache invalidation on mutations
- [ ] Health check alerts via Slack

### Phase 6: Performance Tests (Planned)
- [ ] Cache hit rate monitoring (target: >70%)
- [ ] Response time benchmarks
- [ ] Concurrent user load testing
- [ ] Database query optimization

### Phase 7: Security Tests (Planned)
- [ ] Authentication checks on all endpoints
- [ ] Authorization (role-based access)
- [ ] Input validation
- [ ] No secrets in logs/errors

---

## 📞 Questions & Support

**For test-related questions:**
1. Check this document first
2. Review existing test files for patterns
3. Ask in team chat with test error message
4. Open GitHub issue if test is broken

**Running Tests:**
```bash
# All tests
npm test

# Specific file
npm test -- path/to/test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

## 🗂️ Related Files

- **Test Files:** `tests/` directory
- **Services:** `src/server/services/`
- **API Routes:** `src/app/api/`
- **Agent Tools:** `src/server/agents/tools/`
- **CI/CD Config:** `.github/workflows/`
- **Jest Config:** `jest.config.js`
