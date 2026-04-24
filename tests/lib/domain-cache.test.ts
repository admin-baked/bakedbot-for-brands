/**
 * Tests for domain cache utilities
 */

// Mock Redis layer so tests run without a Redis connection
jest.mock('@/lib/cache', () => ({
    getCached: jest.fn().mockResolvedValue(null),
    setCached: jest.fn().mockResolvedValue(undefined),
    invalidateCache: jest.fn().mockResolvedValue(undefined),
    CachePrefix: { DOMAIN: 'domain' },
    CacheTTL: { DOMAIN: 300 },
}));

import {
    getCachedTenant,
    setCachedTenant,
    invalidateDomainCache,
    clearDomainCache,
    getDomainCacheStats,
} from '@/lib/domain-cache';

describe('domain-cache', () => {
    beforeEach(() => {
        clearDomainCache();
    });

    describe('setCachedTenant and getCachedTenant', () => {
        it('should store and retrieve tenant ID', async () => {
            await setCachedTenant('shop.example.com', 'tenant-123');
            expect(await getCachedTenant('shop.example.com')).toBe('tenant-123');
        });

        it('should normalize domain to lowercase', async () => {
            await setCachedTenant('SHOP.EXAMPLE.COM', 'tenant-123');
            expect(await getCachedTenant('shop.example.com')).toBe('tenant-123');
            expect(await getCachedTenant('Shop.Example.COM')).toBe('tenant-123');
        });

        it('should return undefined for uncached domains', async () => {
            expect(await getCachedTenant('uncached.com')).toBeUndefined();
        });

        it('should cache null values (domain not found)', async () => {
            await setCachedTenant('notfound.com', null);
            expect(await getCachedTenant('notfound.com')).toBeNull();
        });

        it('should distinguish between null and undefined', async () => {
            await setCachedTenant('exists-but-null.com', null);
            expect(await getCachedTenant('exists-but-null.com')).toBeNull();
            expect(await getCachedTenant('never-cached.com')).toBeUndefined();
        });
    });

    describe('invalidateDomainCache', () => {
        it('should remove specific domain from cache', async () => {
            await setCachedTenant('domain1.com', 'tenant-1');
            await setCachedTenant('domain2.com', 'tenant-2');

            await invalidateDomainCache('domain1.com');

            expect(await getCachedTenant('domain1.com')).toBeUndefined();
            expect(await getCachedTenant('domain2.com')).toBe('tenant-2');
        });

        it('should normalize domain when invalidating', async () => {
            await setCachedTenant('MIXED.CASE.com', 'tenant-1');
            await invalidateDomainCache('mixed.case.COM');
            expect(await getCachedTenant('mixed.case.com')).toBeUndefined();
        });

        it('should not throw for non-existent domains', async () => {
            await expect(invalidateDomainCache('nonexistent.com')).resolves.not.toThrow();
        });
    });

    describe('clearDomainCache', () => {
        it('should remove all cached entries', async () => {
            await setCachedTenant('domain1.com', 'tenant-1');
            await setCachedTenant('domain2.com', 'tenant-2');

            clearDomainCache();

            expect(await getCachedTenant('domain1.com')).toBeUndefined();
            expect(await getCachedTenant('domain2.com')).toBeUndefined();
        });

        it('should reset L1 cache size to zero', async () => {
            await setCachedTenant('domain1.com', 'tenant-1');
            clearDomainCache();
            const stats = getDomainCacheStats();
            expect(stats.l1Size).toBe(0);
        });
    });

    describe('getDomainCacheStats', () => {
        it('should return correct l1Size and maxL1Size', () => {
            const stats = getDomainCacheStats();
            expect(stats.l1Size).toBe(0);
            expect(stats.maxL1Size).toBeGreaterThan(0);
        });

        it('should track L1 cache size accurately', async () => {
            await setCachedTenant('domain1.com', 'tenant-1');
            await setCachedTenant('domain2.com', 'tenant-2');
            await setCachedTenant('domain3.com', 'tenant-3');

            const stats = getDomainCacheStats();
            expect(stats.l1Size).toBe(3);
        });

        it('should not double-count overwrites', async () => {
            await setCachedTenant('domain1.com', 'tenant-1');
            await setCachedTenant('domain1.com', 'tenant-updated');

            const stats = getDomainCacheStats();
            expect(stats.l1Size).toBe(1);
        });
    });

    describe('cache expiry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should expire L1 entries after 30s TTL', async () => {
            await setCachedTenant('expiring.com', 'tenant-123');
            expect(await getCachedTenant('expiring.com')).toBe('tenant-123');

            jest.advanceTimersByTime(31 * 1000);

            // After L1 expiry, falls through to Redis mock (returns null → undefined)
            expect(await getCachedTenant('expiring.com')).toBeUndefined();
        });

        it('should return valid entry before L1 TTL expires', async () => {
            await setCachedTenant('valid.com', 'tenant-123');
            jest.advanceTimersByTime(15 * 1000);
            expect(await getCachedTenant('valid.com')).toBe('tenant-123');
        });
    });
});
