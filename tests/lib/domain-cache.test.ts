/**
 * Tests for domain cache utilities
 */

import {
    getCachedTenant,
    setCachedTenant,
    invalidateDomainCache,
    clearDomainCache,
    getDomainCacheStats,
} from '@/lib/domain-cache';

describe('domain-cache', () => {
    // Clear cache before each test
    beforeEach(() => {
        clearDomainCache();
    });

    describe('setCachedTenant and getCachedTenant', () => {
        it('should store and retrieve tenant ID', () => {
            setCachedTenant('shop.example.com', 'tenant-123');
            expect(getCachedTenant('shop.example.com')).toBe('tenant-123');
        });

        it('should normalize domain to lowercase', () => {
            setCachedTenant('SHOP.EXAMPLE.COM', 'tenant-123');
            expect(getCachedTenant('shop.example.com')).toBe('tenant-123');
            expect(getCachedTenant('Shop.Example.COM')).toBe('tenant-123');
        });

        it('should return undefined for uncached domains', () => {
            expect(getCachedTenant('uncached.com')).toBeUndefined();
        });

        it('should cache null values (domain not found)', () => {
            setCachedTenant('notfound.com', null);
            expect(getCachedTenant('notfound.com')).toBeNull();
        });

        it('should distinguish between null and undefined', () => {
            setCachedTenant('exists-but-null.com', null);

            // Cached null value returns null
            expect(getCachedTenant('exists-but-null.com')).toBeNull();

            // Uncached returns undefined
            expect(getCachedTenant('never-cached.com')).toBeUndefined();
        });
    });

    describe('invalidateDomainCache', () => {
        it('should remove specific domain from cache', () => {
            setCachedTenant('domain1.com', 'tenant-1');
            setCachedTenant('domain2.com', 'tenant-2');

            invalidateDomainCache('domain1.com');

            expect(getCachedTenant('domain1.com')).toBeUndefined();
            expect(getCachedTenant('domain2.com')).toBe('tenant-2');
        });

        it('should normalize domain when invalidating', () => {
            setCachedTenant('MIXED.CASE.com', 'tenant-1');
            invalidateDomainCache('mixed.case.COM');
            expect(getCachedTenant('mixed.case.com')).toBeUndefined();
        });

        it('should not throw for non-existent domains', () => {
            expect(() => invalidateDomainCache('nonexistent.com')).not.toThrow();
        });
    });

    describe('clearDomainCache', () => {
        it('should remove all cached entries', () => {
            setCachedTenant('domain1.com', 'tenant-1');
            setCachedTenant('domain2.com', 'tenant-2');
            setCachedTenant('domain3.com', 'tenant-3');

            clearDomainCache();

            expect(getCachedTenant('domain1.com')).toBeUndefined();
            expect(getCachedTenant('domain2.com')).toBeUndefined();
            expect(getCachedTenant('domain3.com')).toBeUndefined();
        });

        it('should reset cache size to zero', () => {
            setCachedTenant('domain1.com', 'tenant-1');
            setCachedTenant('domain2.com', 'tenant-2');

            clearDomainCache();

            const stats = getDomainCacheStats();
            expect(stats.size).toBe(0);
        });
    });

    describe('getDomainCacheStats', () => {
        it('should return correct size and maxSize', () => {
            const stats = getDomainCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.maxSize).toBe(1000);
        });

        it('should track cache size accurately', () => {
            setCachedTenant('domain1.com', 'tenant-1');
            setCachedTenant('domain2.com', 'tenant-2');
            setCachedTenant('domain3.com', 'tenant-3');

            const stats = getDomainCacheStats();
            expect(stats.size).toBe(3);
        });

        it('should not double-count overwrites', () => {
            setCachedTenant('domain1.com', 'tenant-1');
            setCachedTenant('domain1.com', 'tenant-updated');

            const stats = getDomainCacheStats();
            expect(stats.size).toBe(1);
        });
    });

    describe('cache expiry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should expire entries after TTL', () => {
            setCachedTenant('expiring.com', 'tenant-123');
            expect(getCachedTenant('expiring.com')).toBe('tenant-123');

            // Advance time past the 1-minute TTL
            jest.advanceTimersByTime(61 * 1000);

            expect(getCachedTenant('expiring.com')).toBeUndefined();
        });

        it('should return valid entry before TTL expires', () => {
            setCachedTenant('valid.com', 'tenant-123');

            // Advance time but stay within TTL
            jest.advanceTimersByTime(30 * 1000);

            expect(getCachedTenant('valid.com')).toBe('tenant-123');
        });

        it('should remove expired entry from cache on access', () => {
            setCachedTenant('toexpire.com', 'tenant-123');

            jest.advanceTimersByTime(61 * 1000);

            // Access triggers cleanup
            getCachedTenant('toexpire.com');

            // Verify it was removed (stats should reflect this)
            const stats = getDomainCacheStats();
            expect(stats.size).toBe(0);
        });
    });

    describe('cache size limits', () => {
        it('should prune old entries when max size is reached', () => {
            // Add 1001 entries to exceed the limit of 1000
            for (let i = 0; i < 1001; i++) {
                setCachedTenant(`domain${i}.com`, `tenant-${i}`);
            }

            const stats = getDomainCacheStats();
            // After pruning 100 entries and adding 1 more, should have 901
            expect(stats.size).toBeLessThanOrEqual(1000);
        });
    });
});
