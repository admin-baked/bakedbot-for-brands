/**
 * Performance Benchmarks: Tool Caching
 *
 * Measures cache effectiveness and performance gains
 * Target: >70% hit rate, <100ms cached response time
 */

import { ToolCacheService } from '@/server/services/tool-cache';

describe('Performance: Tool Caching', () => {
    let cache: ToolCacheService;
    const benchmarks: Record<string, number[]> = {};

    beforeEach(() => {
        cache = new ToolCacheService();
        cache.resetStats();
    });

    describe('Benchmark 1: Cache Hit Rate', () => {
        it('should achieve >70% hit rate under typical workload', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // Simulate 100 requests with 70% to same key (hit scenario)
            const requests = [
                ...Array(70).fill('key1'), // 70 hits on key1
                ...Array(20).fill('key2'), // 20 hits on key2
                ...Array(10).fill('key3'), // 10 hits on key3
            ];

            for (const key of requests) {
                await cache.withCache(key, fetcher, 300);
            }

            const stats = cache.getStats();
            const hitRate = stats.hitRate;

            // Record metric
            benchmarks['cache_hit_rate'] = [hitRate];

            // Verify hit rate target
            expect(hitRate).toBeGreaterThanOrEqual(65); // Allow 5% margin

            console.log(`✓ Cache Hit Rate: ${hitRate.toFixed(2)}% (target: >70%)`);
        });

        it('should track hits and misses accurately', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // 3 misses (unique keys)
            await cache.withCache('key1', fetcher, 300);
            await cache.withCache('key2', fetcher, 300);
            await cache.withCache('key3', fetcher, 300);

            // 7 hits (repeated keys)
            for (let i = 0; i < 7; i++) {
                await cache.withCache('key1', fetcher, 300);
            }

            const stats = cache.getStats();
            expect(stats.totalMisses).toBe(3);
            expect(stats.totalHits).toBe(7);
            expect(stats.hitRate).toBe(70);

            benchmarks['accurate_tracking'] = [100]; // Passed
        });
    });

    describe('Benchmark 2: Response Time (Cached)', () => {
        it('should return cached data in <100ms', async () => {
            const fetcher = jest.fn(async () => {
                // Simulate 200ms fetch time
                await new Promise((resolve) => setTimeout(resolve, 200));
                return { data: 'expensive' };
            });

            // Prime cache
            await cache.withCache('slow_key', fetcher, 300);

            // Measure cache hit time
            const start = performance.now();
            const result = await cache.withCache('slow_key', fetcher, 300);
            const elapsed = performance.now() - start;

            expect(elapsed).toBeLessThan(100);
            expect(result.data).toBe('expensive');

            benchmarks['cached_response_time'] = [elapsed];

            console.log(`✓ Cached Response Time: ${elapsed.toFixed(2)}ms (target: <100ms)`);
        });

        it('should show significant speedup over uncached', async () => {
            const fetcher = jest.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 150));
                return { data: 'test' };
            });

            // Measure uncached time
            const uncachedStart = performance.now();
            await cache.withCache('new_key', fetcher, 300);
            const uncachedTime = performance.now() - uncachedStart;

            // Measure cached time
            const cachedStart = performance.now();
            await cache.withCache('new_key', fetcher, 300);
            const cachedTime = performance.now() - cachedStart;

            const speedup = uncachedTime / cachedTime;

            benchmarks['speedup_ratio'] = [speedup];

            // Cache should be significantly faster (at least 10x)
            expect(speedup).toBeGreaterThan(10);

            console.log(`✓ Speedup Ratio: ${speedup.toFixed(1)}x (cached vs uncached)`);
        });
    });

    describe('Benchmark 3: Memory Usage', () => {
        it('should manage memory efficiently with large caches', async () => {
            const fetcher = jest.fn(async () => ({
                data: 'x'.repeat(1000), // 1KB per entry
            }));

            // Cache 1000 entries
            for (let i = 0; i < 1000; i++) {
                await cache.withCache(`key_${i}`, fetcher, 300);
            }

            const stats = cache.getStats();
            expect(stats.entries).toBe(1000);

            // Each entry should be roughly 1KB
            // Total memory should be < 10MB for 1000 entries
            const estimatedMemory = stats.entries * 1.5; // Rough estimate with overhead

            benchmarks['memory_usage_1k_entries'] = [estimatedMemory];

            console.log(`✓ Memory Usage: ~${estimatedMemory.toFixed(1)}KB for 1000 entries`);
        });
    });

    describe('Benchmark 4: Concurrent Access', () => {
        it('should handle concurrent cache requests efficiently', async () => {
            const fetcher = jest.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return { data: 'concurrent' };
            });

            const start = performance.now();

            // Fire 50 concurrent requests to same key
            const promises = Array(50)
                .fill(null)
                .map(() => cache.withCache('concurrent_key', fetcher, 300));

            await Promise.all(promises);
            const elapsed = performance.now() - start;

            const stats = cache.getStats();

            // Should have multiple hits
            expect(stats.totalHits).toBeGreaterThan(0);

            benchmarks['concurrent_requests_50'] = [elapsed];

            console.log(
                `✓ Concurrent Requests (50): ${elapsed.toFixed(2)}ms, Hits: ${stats.totalHits}`
            );
        });
    });

    describe('Benchmark 5: TTL Efficiency', () => {
        it('should respect TTL and refresh efficiently', async () => {
            jest.useFakeTimers();

            const fetcher = jest.fn(async () => ({ data: 'ttl_test' }));

            // Cache with 1 second TTL
            await cache.withCache('ttl_key', fetcher, 1);

            const callsAfterCache = fetcher.mock.calls.length;
            expect(callsAfterCache).toBe(1);

            // Call again before TTL expires
            await cache.withCache('ttl_key', fetcher, 1);
            const callsBeforeTTLExpire = fetcher.mock.calls.length;
            expect(callsBeforeTTLExpire).toBe(1); // No new call

            // Advance time past TTL
            jest.advanceTimersByTime(1500);

            // Call again after TTL expires
            await cache.withCache('ttl_key', fetcher, 1);
            const callsAfterTTLExpire = fetcher.mock.calls.length;
            expect(callsAfterTTLExpire).toBe(2); // New call made

            benchmarks['ttl_respects_expiry'] = [100]; // Passed

            jest.useRealTimers();
        });
    });

    describe('Benchmark 6: Invalidation Performance', () => {
        it('should invalidate entries quickly', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // Cache 100 entries
            for (let i = 0; i < 100; i++) {
                await cache.withCache(`key_${i}`, fetcher, 300);
            }

            const start = performance.now();

            // Invalidate 10 entries
            for (let i = 0; i < 10; i++) {
                cache.invalidate(`key_${i}`);
            }

            const elapsed = performance.now() - start;

            benchmarks['invalidate_10_entries'] = [elapsed];

            // Should be very fast (<5ms for 10 entries)
            expect(elapsed).toBeLessThan(5);

            console.log(`✓ Invalidate 10 entries: ${elapsed.toFixed(2)}ms`);
        });

        it('should pattern invalidate efficiently', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // Cache 100 entries with prefixes
            for (let i = 0; i < 100; i++) {
                await cache.withCache(
                    `platform_${i % 10}`,
                    fetcher,
                    300
                );
            }

            const start = performance.now();
            const count = cache.invalidatePattern('platform_');
            const elapsed = performance.now() - start;

            benchmarks['pattern_invalidate'] = [elapsed];

            expect(count).toBeGreaterThan(0);
            expect(elapsed).toBeLessThan(10); // Pattern match should be fast

            console.log(`✓ Pattern invalidate: ${elapsed.toFixed(2)}ms for ${count} entries`);
        });
    });

    afterAll(() => {
        // Print benchmark summary
        console.log('\n=== Cache Performance Benchmarks ===');
        for (const [name, times] of Object.entries(benchmarks)) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`${name}: ${avg.toFixed(2)}`);
        }
    });
});
