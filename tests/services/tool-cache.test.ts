/**
 * Tool Cache Service Tests
 *
 * Tests for in-memory caching layer with TTL-based invalidation
 */

import { ToolCacheService, TOOL_CACHE_CONFIG } from '@/server/services/tool-cache';

describe('ToolCacheService', () => {
    let cache: ToolCacheService;

    beforeEach(() => {
        cache = new ToolCacheService();
    });

    describe('withCache', () => {
        it('should return fresh data on cache miss', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            const result = await cache.withCache('test_key', fetcher, 300);

            expect(result).toEqual({ data: 'test' });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('should return cached data on cache hit', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // First call: cache miss
            await cache.withCache('test_key', fetcher, 300);
            expect(fetcher).toHaveBeenCalledTimes(1);

            // Second call: cache hit
            const result = await cache.withCache('test_key', fetcher, 300);

            expect(result).toEqual({ data: 'test' });
            expect(fetcher).toHaveBeenCalledTimes(1); // Not called again
        });

        it('should respect TTL expiration', async () => {
            jest.useFakeTimers();
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // First call
            await cache.withCache('test_key', fetcher, 1);
            expect(fetcher).toHaveBeenCalledTimes(1);

            // Advance time by 2 seconds (past TTL)
            jest.advanceTimersByTime(2000);

            // Second call should be a cache miss
            await cache.withCache('test_key', fetcher, 1);
            expect(fetcher).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });

        it('should use default TTL when not specified', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            const result = await cache.withCache('test_key', fetcher);

            expect(result).toEqual({ data: 'test' });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in fetcher', async () => {
            const error = new Error('Fetch failed');
            const fetcher = jest.fn(async () => {
                throw error;
            });

            await expect(cache.withCache('test_key', fetcher, 300)).rejects.toThrow('Fetch failed');
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('should not cache when fetcher throws', async () => {
            const fetcher = jest.fn(async () => {
                throw new Error('Test error');
            });

            // First attempt: error
            await expect(cache.withCache('test_key', fetcher, 300)).rejects.toThrow();

            // Second attempt: should try again
            await expect(cache.withCache('test_key', fetcher, 300)).rejects.toThrow();
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalidate', () => {
        it('should remove cached entry', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // Cache data
            await cache.withCache('test_key', fetcher, 300);
            expect(fetcher).toHaveBeenCalledTimes(1);

            // Invalidate
            cache.invalidate('test_key');

            // Next call should fetch again
            await cache.withCache('test_key', fetcher, 300);
            expect(fetcher).toHaveBeenCalledTimes(2);
        });

        it('should handle invalidating non-existent entries', () => {
            expect(() => cache.invalidate('nonexistent')).not.toThrow();
        });
    });

    describe('invalidatePattern', () => {
        it('should invalidate entries matching pattern', async () => {
            const fetcher = jest.fn(async (key) => ({ data: key }));

            // Cache multiple entries
            await cache.withCache('platform_getAnalytics', () => Promise.resolve({ data: 'a' }), 300);
            await cache.withCache('platform_listBrands', () => Promise.resolve({ data: 'b' }), 300);
            await cache.withCache('system_getStats', () => Promise.resolve({ data: 'c' }), 300);

            // Invalidate platform entries
            const count = cache.invalidatePattern('platform_');

            expect(count).toBe(2);

            // platform entries should be re-fetched, system should be cached
            await cache.withCache('platform_getAnalytics', fetcher, 300);
            await cache.withCache('system_getStats', fetcher, 300);

            expect(fetcher).toHaveBeenCalled();
        });

        it('should support regex patterns', async () => {
            await cache.withCache('test_a', () => Promise.resolve({ data: 'a' }), 300);
            await cache.withCache('test_b', () => Promise.resolve({ data: 'b' }), 300);
            await cache.withCache('other_c', () => Promise.resolve({ data: 'c' }), 300);

            const count = cache.invalidatePattern(/^test_/);

            expect(count).toBe(2);
        });
    });

    describe('clear', () => {
        it('should clear all caches when no type specified', async () => {
            await cache.withCache('key1', () => Promise.resolve({ data: '1' }), 300);
            await cache.withCache('key2', () => Promise.resolve({ data: '2' }), 300);

            const cleared = cache.clear();

            expect(cleared).toBe(2);
        });

        it('should clear specific cache type', async () => {
            await cache.withCache('platform_analytics', () => Promise.resolve({ data: 'a' }), 300);
            await cache.withCache('platform_brands', () => Promise.resolve({ data: 'b' }), 300);
            await cache.withCache('system_stats', () => Promise.resolve({ data: 'c' }), 300);

            const cleared = cache.clear('platform');

            expect(cleared).toBe(2);
        });
    });

    describe('getStats', () => {
        it('should track hits and misses', async () => {
            const fetcher = jest.fn(async () => ({ data: 'test' }));

            // Cache miss
            await cache.withCache('key', fetcher, 300);
            // Cache hit
            await cache.withCache('key', fetcher, 300);
            // Cache miss (new key)
            await cache.withCache('key2', fetcher, 300);

            const stats = cache.getStats();

            expect(stats.totalHits).toBe(1);
            expect(stats.totalMisses).toBe(2);
            expect(stats.hitRate).toBeCloseTo(33.33, 1);
            expect(stats.entries).toBe(2);
        });

        it('should calculate hit rate correctly', async () => {
            const fetcher = async () => ({ data: 'test' });

            // 3 hits, 2 misses
            await cache.withCache('a', fetcher, 300);
            await cache.withCache('a', fetcher, 300);
            await cache.withCache('a', fetcher, 300);
            await cache.withCache('b', fetcher, 300);
            await cache.withCache('b', fetcher, 300);

            const stats = cache.getStats();

            expect(stats.hitRate).toBe(60); // 3 / 5 = 60%
        });
    });

    describe('listEntries', () => {
        it('should return list of cached entries', async () => {
            await cache.withCache('key1', () => Promise.resolve({ data: '1' }), 300);
            await cache.withCache('key2', () => Promise.resolve({ data: '2' }), 300);

            const entries = cache.listEntries();

            expect(entries).toHaveLength(2);
            expect(entries[0]).toHaveProperty('key');
            expect(entries[0]).toHaveProperty('ttlRemaining');
            expect(entries[0]).toHaveProperty('age');
            expect(entries[0]).toHaveProperty('hits');
        });

        it('should sort by hit count descending', async () => {
            const fetcher = async () => ({ data: 'test' });

            // key1: 5 hits
            for (let i = 0; i < 5; i++) {
                await cache.withCache('key1', fetcher, 300);
            }

            // key2: 2 hits
            await cache.withCache('key2', fetcher, 300);
            await cache.withCache('key2', fetcher, 300);

            const entries = cache.listEntries();

            expect(entries[0].key).toBe('key1');
            expect(entries[1].key).toBe('key2');
        });
    });

    describe('resetStats', () => {
        it('should reset statistics', async () => {
            await cache.withCache('key', () => Promise.resolve({ data: 'test' }), 300);
            await cache.withCache('key', () => Promise.resolve({ data: 'test' }), 300);

            cache.resetStats();
            const stats = cache.getStats();

            expect(stats.totalHits).toBe(0);
            expect(stats.totalMisses).toBe(0);
        });
    });

    describe('TOOL_CACHE_CONFIG', () => {
        it('should have predefined TTLs for all tools', () => {
            expect(TOOL_CACHE_CONFIG.platform_getAnalytics).toBe(600); // 10 min
            expect(TOOL_CACHE_CONFIG.platform_listTenants).toBe(1800); // 30 min
            expect(TOOL_CACHE_CONFIG.system_getConfig).toBe(3600); // 1 hour
        });

        it('should have zero TTL for security-sensitive tools', () => {
            expect(TOOL_CACHE_CONFIG.user_approve).toBe(0);
            expect(TOOL_CACHE_CONFIG.user_reject).toBe(0);
            expect(TOOL_CACHE_CONFIG.user_promote).toBe(0);
        });
    });

    describe('concurrent access', () => {
        it('should handle concurrent cache misses correctly', async () => {
            const fetcher = jest.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return { data: 'test' };
            });

            // Two concurrent cache misses on same key
            const promises = [
                cache.withCache('key', fetcher, 300),
                cache.withCache('key', fetcher, 300),
            ];

            const results = await Promise.all(promises);

            expect(results[0]).toEqual({ data: 'test' });
            expect(results[1]).toEqual({ data: 'test' });
            // Both should call fetcher (no race condition handling)
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });
});
