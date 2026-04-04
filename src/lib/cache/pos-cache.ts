/**
 * POS Data Cache
 *
 * Redis-backed cache for POS data (customers, orders)
 * with in-memory L1 for hot-path performance.
 *
 * L1 (in-memory): 30s TTL, reduces Redis round-trips.
 * L2 (Upstash Redis): 5 min TTL, shared across server instances.
 */

import { getCached, setCached, invalidateCachePattern, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

/** L1 in-memory entry */
interface L1Entry<T> {
    data: T;
    expiry: number;
}

/** L1 TTL (30 seconds) */
const L1_TTL = 30 * 1000;

/** Maximum L1 entries */
const MAX_L1_SIZE = 500;

class POSCache {
    private l1 = new Map<string, L1Entry<unknown>>();

    /**
     * Get cached data (L1 → L2 Redis)
     */
    async get<T>(key: string): Promise<T | null> {
        // L1 check
        const l1Entry = this.l1.get(key);
        if (l1Entry && Date.now() < l1Entry.expiry) {
            logger.debug('[POS_CACHE] L1 hit', { key });
            return l1Entry.data as T;
        }
        if (l1Entry) this.l1.delete(key);

        // L2 check (Redis)
        const redisValue = await getCached<T>(CachePrefix.POS_DATA, key);
        if (redisValue !== null) {
            this.setL1(key, redisValue);
            logger.debug('[POS_CACHE] L2 hit', { key });
            return redisValue;
        }

        logger.debug('[POS_CACHE] miss', { key });
        return null;
    }

    /**
     * Set cached data (L1 + L2 Redis)
     */
    async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
        const ttl = ttlSeconds ?? CacheTTL.POS_DATA;
        this.setL1(key, data);
        await setCached(CachePrefix.POS_DATA, key, data, ttl);
        logger.debug('[POS_CACHE] set', { key, ttl });
    }

    /**
     * Invalidate cached data (L1 + L2)
     */
    async invalidate(key: string): Promise<void> {
        this.l1.delete(key);
        const { invalidateCache } = await import('@/lib/cache');
        await invalidateCache(CachePrefix.POS_DATA, key);
        logger.debug('[POS_CACHE] invalidated', { key });
    }

    /**
     * Invalidate all cached data for an org (L1 + L2)
     */
    async invalidateOrg(orgId: string): Promise<void> {
        // Clear L1 entries for this org
        for (const key of this.l1.keys()) {
            if (key.startsWith(orgId)) {
                this.l1.delete(key);
            }
        }

        // Clear L2 Redis entries matching org pattern
        await invalidateCachePattern(`${CachePrefix.POS_DATA}:${orgId}*`);
        logger.info('[POS_CACHE] Invalidated org', { orgId });
    }

    /**
     * Clear entire L1 cache
     */
    clear(): void {
        const size = this.l1.size;
        this.l1.clear();
        logger.info('[POS_CACHE] L1 cleared', { size });
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            l1Size: this.l1.size,
            maxL1Size: MAX_L1_SIZE,
        };
    }

    private setL1<T>(key: string, data: T): void {
        if (this.l1.size >= MAX_L1_SIZE) {
            const keysToRemove = Array.from(this.l1.keys()).slice(0, 50);
            keysToRemove.forEach(k => this.l1.delete(k));
        }
        this.l1.set(key, { data, expiry: Date.now() + L1_TTL });
    }
}

// Singleton instance
export const posCache = new POSCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
    customers: (orgId: string) => `${orgId}:customers`,
    orders: (orgId: string) => `${orgId}:orders`,
    customer: (orgId: string, customerId: string) => `${orgId}:customer:${customerId}`,
    order: (orgId: string, orderId: string) => `${orgId}:order:${orderId}`,
};
