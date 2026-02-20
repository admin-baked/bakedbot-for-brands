# Test Week 2 Features - Gemini Testing Agent Prompt

> **Context:** Week 2 features (Pagination + Caching) were just deployed. Run comprehensive tests to verify functionality and catch edge cases before production load.

---

## Your Mission

You are a QA testing agent. Your job is to:
1. **Read** the implementation files for pagination and caching
2. **Write** comprehensive test suites (Jest unit tests + integration tests)
3. **Execute** the tests and report results
4. **Flag** any bugs, edge cases, or missing error handling

---

## Features to Test

### 1. API Caching Layer (`src/lib/cache.ts`)

**Implementation Files:**
- `src/lib/cache.ts` — Core caching utilities
- `src/app/api/products/route.ts` — Products API with caching
- `src/app/api/analytics/forecast/route.ts` — Analytics with caching
- `src/app/api/cannmenus/product-search/route.ts` — External API proxy with caching
- `src/app/api/recommendations/personalized/route.ts` — Recommendations with caching
- `src/app/api/ezal/insights/route.ts` — Competitive insights with cache invalidation

**Test File to Create:** `tests/unit/cache.test.ts`

**Test Cases:**

```typescript
describe('Cache Layer - Unit Tests', () => {
  describe('withCache()', () => {
    it('should return cached value on cache hit', async () => {
      // Setup: Mock Redis to return a cached value
      // Action: Call withCache() with a function
      // Assert: Function should NOT be called, cached value returned
    });

    it('should call function on cache miss', async () => {
      // Setup: Mock Redis to return null (cache miss)
      // Action: Call withCache() with a function
      // Assert: Function IS called, result is cached
    });

    it('should handle Redis unavailable gracefully', async () => {
      // Setup: Mock Redis to throw connection error
      // Action: Call withCache() with a function
      // Assert: Function IS called, no error thrown (fail-open)
    });

    it('should respect TTL parameter', async () => {
      // Setup: Mock Redis set() method
      // Action: Call withCache() with custom TTL (900 seconds)
      // Assert: Redis.set() was called with correct TTL
    });
  });

  describe('invalidateCachePattern()', () => {
    it('should delete all keys matching pattern', async () => {
      // Setup: Mock Redis.keys() to return 3 matching keys
      // Action: Call invalidateCachePattern('analytics:insights:org_123:*')
      // Assert: Redis.del() was called with all 3 keys
    });

    it('should handle no matching keys gracefully', async () => {
      // Setup: Mock Redis.keys() to return empty array
      // Action: Call invalidateCachePattern('nonexistent:*')
      // Assert: No error thrown, Redis.del() not called
    });
  });

  describe('Cache Key Building', () => {
    it('should build correct cache key format', () => {
      // Action: Call buildCacheKey('products', 'org_123')
      // Assert: Returns 'bakedbot:cache:products:org_123'
    });
  });
});
```

**Integration Tests:**

```typescript
describe('Cache Layer - Integration Tests', () => {
  it('should cache products API response', async () => {
    // Setup: Make first request to /api/products?orgId=org_test
    // Assert: Response time baseline (e.g., 300ms)

    // Action: Make second identical request
    // Assert: Response time < 50ms (cached)
    // Assert: Response data matches first request
  });

  it('should invalidate products cache after POS sync', async () => {
    // Setup: Cache products for org_test
    // Action: Trigger POS sync for org_test
    // Assert: Next products request shows cache MISS in logs
  });

  it('should invalidate Ezal insights cache on POST dismiss', async () => {
    // Setup: Cache insights for tenant_123
    // Action: POST /api/ezal/insights with action=dismiss
    // Assert: Next GET shows cache MISS
  });
});
```

---

### 2. Pagination (`src/server/actions/inbox.ts`, `src/server/repos/productRepo.ts`)

**Implementation Files:**
- `src/server/actions/inbox.ts` — Inbox pagination
- `src/server/actions/drive.ts` — Drive pagination
- `src/server/repos/productRepo.ts` — Product repo pagination

**Test File to Create:** `tests/unit/pagination.test.ts`

**Test Cases:**

```typescript
describe('Inbox Pagination', () => {
  it('should return nextCursor when more threads exist', async () => {
    // Setup: Create 51 inbox threads in Firestore
    // Action: Call getInboxThreads({ limit: 50 })
    // Assert: hasMore = true, nextCursor = ID of 50th thread
  });

  it('should return hasMore=false on last page', async () => {
    // Setup: Create 30 inbox threads
    // Action: Call getInboxThreads({ limit: 50 })
    // Assert: hasMore = false, nextCursor = undefined
  });

  it('should fetch correct threads after cursor', async () => {
    // Setup: Create 100 threads with sequential timestamps
    // Action: Get page 1 (threads 1-50), then page 2 with cursor
    // Assert: Page 2 returns threads 51-100, no duplicates
  });

  it('should handle invalid cursor gracefully', async () => {
    // Action: Call getInboxThreads({ cursor: 'nonexistent_id' })
    // Assert: Returns first page (no error thrown)
  });
});

describe('Product Repo Pagination', () => {
  it('should respect limit parameter', async () => {
    // Setup: Seed 200 products for brand_test
    // Action: Call getAllByBrand('brand_test', { limit: 50 })
    // Assert: Returns exactly 50 products
  });

  it('should paginate through tenant catalog products', async () => {
    // Setup: Seed 150 products in tenants/org_test/publicViews/products/items
    // Action: Get page 1 (limit: 100), get page 2 with cursor
    // Assert: Total products retrieved = 150, no duplicates
  });

  it('should paginate through legacy products collection', async () => {
    // Setup: Seed 75 products in legacy products collection
    // Action: Get page 1 (limit: 50), get page 2 with cursor
    // Assert: Page 2 returns remaining 25 products
  });

  it('should handle cursor at exact page boundary', async () => {
    // Setup: Create exactly 100 products
    // Action: Get page 1 (limit: 100), check hasMore logic
    // Assert: Should not indicate more pages exist
  });
});

describe('Drive Pagination', () => {
  it('should paginate files but not folders', async () => {
    // Setup: Create 150 files + 10 folders in folder_test
    // Action: Call getFolderContents('folder_test', { limit: 100 })
    // Assert: Returns all 10 folders + 100 files, hasMore = true
  });

  it('should maintain sort order across pages', async () => {
    // Setup: Create 200 files with random names
    // Action: Get all files across 2 pages (sorted by name)
    // Assert: Combined list is alphabetically sorted
  });
});
```

---

## Execution Instructions

### Step 1: Read Implementation Files
Before writing tests, read these files to understand the implementation:
```bash
src/lib/cache.ts
src/server/actions/inbox.ts
src/server/actions/drive.ts
src/server/repos/productRepo.ts
src/app/api/products/route.ts
src/app/api/ezal/insights/route.ts
```

### Step 2: Write Test Files
Create test files in `tests/unit/` directory:
- `tests/unit/cache.test.ts`
- `tests/unit/pagination.test.ts`

Use Jest + TypeScript syntax. Import actual implementations, mock external dependencies (Firestore, Redis).

### Step 3: Execute Tests
```bash
npm test -- tests/unit/cache.test.ts
npm test -- tests/unit/pagination.test.ts
```

### Step 4: Report Results
For each test file, report:
- ✅ **Passing tests:** Count + list
- ❌ **Failing tests:** Count + error messages
- ⚠️ **Edge cases discovered:** Bugs or missing validation
- 📊 **Coverage:** Which functions/branches are tested

---

## Success Criteria

**Minimum Requirements:**
- [ ] 90%+ of unit tests passing
- [ ] All cache hit/miss scenarios covered
- [ ] All pagination edge cases covered (empty results, last page, invalid cursor)
- [ ] Fail-open behavior verified (Redis down, invalid inputs)
- [ ] No TypeScript errors in test files

**Bonus Coverage:**
- [ ] Performance benchmarks (cached vs uncached response times)
- [ ] Concurrent request handling (cache race conditions)
- [ ] Memory leak detection (pagination doesn't load all records into memory)

---

## Known Considerations

1. **Redis Mocking:** Use `jest.mock('@upstash/redis')` to mock Redis client. Do NOT require actual Redis connection.

2. **Firestore Mocking:** Use `@google-cloud/firestore` test utilities or mock entire Firestore queries.

3. **Environment Variables:** Tests should work even if `UPSTASH_REDIS_URL` is not set (fail-open design).

4. **Cursor Format:** Firestore cursors are document snapshots, not string IDs. Test must handle this correctly.

5. **TTL Values:** Tests should verify that correct TTL values are passed to Redis (5min products, 10min analytics, 15min brand guides).

---

## Example Test Structure

```typescript
import { withCache, invalidateCachePattern, CachePrefix, CacheTTL } from '@/lib/cache';
import { Redis } from '@upstash/redis';

jest.mock('@upstash/redis');

describe('Cache Layer', () => {
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should return cached value on hit', async () => {
    const cachedValue = { data: 'cached' };
    mockRedis.get.mockResolvedValue(cachedValue);

    const result = await withCache(
      CachePrefix.PRODUCTS,
      'test_id',
      async () => ({ data: 'fresh' }),
      CacheTTL.PRODUCTS
    );

    expect(result).toEqual(cachedValue);
    expect(mockRedis.get).toHaveBeenCalledWith('bakedbot:cache:products:test_id');
  });
});
```

---

## Output Format

Please structure your response as:

```markdown
## Test Execution Report

### Cache Layer Tests
**File:** tests/unit/cache.test.ts
**Status:** ✅ 12/14 passing (85.7%)

#### Passing Tests (12):
- ✅ withCache() returns cached value on hit
- ✅ withCache() calls function on miss
- ✅ withCache() handles Redis unavailable
...

#### Failing Tests (2):
- ❌ invalidateCachePattern() with wildcards
  **Error:** Redis.keys() not returning expected pattern
  **Fix needed:** Update mock to return array of matching keys

#### Edge Cases Discovered:
- ⚠️ Cache key collisions possible if prefix + id contain colons
- ⚠️ No test for concurrent cache writes (race condition)

---

### Pagination Tests
**File:** tests/unit/pagination.test.ts
**Status:** ✅ 10/10 passing (100%)

#### Passing Tests (10):
- ✅ Inbox returns nextCursor when more threads exist
- ✅ Products pagination respects limit
...

---

## Recommendations
1. Add validation for cache keys containing special characters
2. Add concurrent request test for cache race conditions
3. Add integration test for full pagination flow (100+ pages)
```

---

## Ready to Execute

Once you understand the requirements:
1. Read the implementation files listed above
2. Write comprehensive test suites
3. Execute the tests
4. Report results in the format specified

**Begin testing when ready!**
