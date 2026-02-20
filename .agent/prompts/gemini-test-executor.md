# Gemini: Execute Week 2 Feature Tests

> **Paste this prompt into Gemini to run automated testing**

---

## Context

BakedBot just deployed Week 2 features:
- **Pagination:** Cursor-based pagination for Inbox (1000+ threads), Drive (unlimited files), Products (1000+ items)
- **Caching:** Redis-backed API response caching for 6 high-traffic routes (5-15min TTLs)

Your task: Write and execute comprehensive tests to verify these features work correctly.

---

## Test Suite 1: Cache Layer (`src/lib/cache.ts`)

**Read these files first:**
```
src/lib/cache.ts
src/app/api/products/route.ts
src/app/api/ezal/insights/route.ts
```

**Create:** `tests/unit/cache.test.ts`

**Required Test Cases:**

1. ✅ `withCache()` returns cached value on hit
2. ✅ `withCache()` calls function on cache miss
3. ✅ `withCache()` handles Redis unavailable (fail-open)
4. ✅ `invalidateCachePattern()` deletes matching keys
5. ✅ Cache keys built correctly (`bakedbot:cache:prefix:id`)
6. ✅ TTL values passed correctly to Redis

**Mock Setup:**
```typescript
jest.mock('@upstash/redis');
const mockRedis = new Redis() as jest.Mocked<Redis>;
```

---

## Test Suite 2: Pagination (`src/server/repos/productRepo.ts`)

**Read these files first:**
```
src/server/actions/inbox.ts
src/server/actions/drive.ts
src/server/repos/productRepo.ts
```

**Create:** `tests/unit/pagination.test.ts`

**Required Test Cases:**

1. ✅ `getInboxThreads()` returns `nextCursor` when hasMore=true
2. ✅ `getInboxThreads()` returns `hasMore=false` on last page
3. ✅ Invalid cursor handled gracefully (no error)
4. ✅ `getAllByBrand()` respects `limit` parameter
5. ✅ `getAllByBrand()` cursor points to correct next page
6. ✅ Pagination works with tenant catalog products
7. ✅ Pagination works with legacy products collection
8. ✅ `getFolderContents()` paginates files, not folders

**Mock Setup:**
```typescript
jest.mock('@google-cloud/firestore');
// Mock Firestore queries with startAfter() and limit()
```

---

## Test Suite 3: Integration Tests

**Create:** `tests/integration/cache-integration.test.ts`

**Required Test Cases:**

1. ✅ Products API cache hit on second identical request
2. ✅ POS sync invalidates products cache
3. ✅ Ezal insights POST action invalidates cache
4. ✅ Analytics forecast caches per brandId + days
5. ✅ CannMenus proxy caches per query params

---

## Execution Steps

### 1. Write Tests
For each test file, use Jest + TypeScript syntax:
```typescript
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';

describe('Cache Layer', () => {
  it('returns cached value on hit', async () => {
    // Test implementation
  });
});
```

### 2. Run Tests
```bash
npm test -- tests/unit/cache.test.ts
npm test -- tests/unit/pagination.test.ts
npm test -- tests/integration/cache-integration.test.ts
```

### 3. Report Results
Format:
```
## Test Results

### ✅ cache.test.ts: 8/10 passing (80%)
- ✅ withCache() cache hit
- ✅ withCache() cache miss
- ❌ invalidateCachePattern() - Fix: Mock Redis.keys() return value

### ✅ pagination.test.ts: 10/10 passing (100%)
- ✅ All pagination edge cases covered

### Edge Cases Found:
- ⚠️ Cache key collision risk with colon characters
- ⚠️ Pagination hasMore flag incorrect at exact page boundary
```

---

## Success Criteria

- [ ] 90%+ tests passing
- [ ] All cache hit/miss scenarios covered
- [ ] All pagination edge cases covered (empty, last page, invalid cursor)
- [ ] Fail-open behavior verified
- [ ] No TypeScript errors

---

## Key Implementation Details (For Your Reference)

**Cache TTL Values:**
- Products: 300s (5min)
- Analytics: 600s (10min)
- Brand Guides: 900s (15min)

**Cache Prefixes:**
- `CachePrefix.PRODUCTS` = 'products'
- `CachePrefix.ANALYTICS` = 'analytics'
- `CachePrefix.MENU` = 'menu'

**Pagination Defaults:**
- Inbox: 50 threads per page
- Drive: 100 files per page
- Products: No default limit (all if not specified)

**Fail-Open Design:**
- If Redis unavailable → cache disabled, function executes normally
- If cursor invalid → returns first page (no error)

---

## Begin Testing!

1. Read the implementation files
2. Write comprehensive test suites
3. Execute tests with `npm test`
4. Report results in the format above

**Start now and report your findings!** 🚀
