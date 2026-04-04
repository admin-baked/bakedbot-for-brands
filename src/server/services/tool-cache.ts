/**
 * Tool Cache Service
 *
 * Redis-backed L2 cache with in-memory L1 for Super User agent tools.
 * Reduces Firestore queries for read-heavy operations (analytics, listings).
 *
 * L1 (in-memory): 30s TTL, prevents Redis round-trips for rapid-fire tool calls.
 * L2 (Upstash Redis): Configurable TTL, shared across server instances.
 *
 * Usage:
 *   const result = await toolCache.withCache('platform_getAnalytics', () => getPlatformAnalytics(), 300);
 */

import { getCached, setCached, invalidateCache, invalidateCachePattern as redisInvalidatePattern, CachePrefix } from '@/lib/cache';
import { logger } from '@/lib/logger';

/** L1 in-memory entry */
interface L1Entry<T> {
    data: T;
    expiresAt: number;
    createdAt: number;
    hits: number;
}

/** L1 TTL (30 seconds) */
const L1_TTL = 30 * 1000;

/** Maximum L1 entries */
const MAX_L1_SIZE = 500;

interface CacheStats {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    l1Entries: number;
}

class ToolCacheService {
    private l1 = new Map<string, L1Entry<unknown>>();
    private stats = {
        hits: 0,
        misses: 0,
    };

    /**
     * Get cached value or fetch fresh data (L1 → L2 Redis → fetcher)
     */
    async withCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number = 300
    ): Promise<T> {
        const now = Date.now();

        // L1 check
        const l1Entry = this.l1.get(key);
        if (l1Entry && l1Entry.expiresAt > now) {
            l1Entry.hits++;
            this.stats.hits++;
            logger.debug(`[Tool Cache] L1 HIT ${key}`);
            return l1Entry.data as T;
        }
        if (l1Entry) this.l1.delete(key);

        // L2 check (Redis)
        const redisValue = await getCached<T>(CachePrefix.TOOL, key);
        if (redisValue !== null) {
            this.stats.hits++;
            this.setL1(key, redisValue);
            logger.debug(`[Tool Cache] L2 HIT ${key}`);
            return redisValue;
        }

        // Cache miss — fetch fresh data
        logger.debug(`[Tool Cache] MISS ${key}`);
        this.stats.misses++;

        try {
            const data = await fetcher();

            // Store in L1 + L2
            this.setL1(key, data);
            await setCached(CachePrefix.TOOL, key, data, ttlSeconds);

            logger.debug(`[Tool Cache] STORED ${key} (TTL: ${ttlSeconds}s)`);
            return data;
        } catch (error: unknown) {
            logger.error(`[Tool Cache] FETCH FAILED ${key}`, { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Invalidate specific cache entry (L1 + L2)
     */
    async invalidate(key: string): Promise<void> {
        this.l1.delete(key);
        await invalidateCache(CachePrefix.TOOL, key);
        logger.debug(`[Tool Cache] INVALIDATED ${key}`);
    }

    /**
     * Invalidate multiple related cache entries (L1 + L2)
     */
    async invalidatePattern(pattern: string | RegExp): Promise<number> {
        const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
        let count = 0;

        // Clear L1
        for (const key of this.l1.keys()) {
            if (regex.test(key)) {
                this.l1.delete(key);
                count++;
            }
        }

        // Clear L2 (Redis pattern)
        const redisPattern = typeof pattern === 'string' ? `${CachePrefix.TOOL}:${pattern}*` : `${CachePrefix.TOOL}:*`;
        await redisInvalidatePattern(redisPattern);

        logger.debug(`[Tool Cache] INVALIDATED PATTERN ${regex} (${count} L1 entries)`);
        return count;
    }

    /**
     * Clear all cache (L1 + optionally type-filtered)
     */
    async clear(type?: string): Promise<number> {
        const before = this.l1.size;

        if (type) {
            const regex = new RegExp(`^${type}`);
            for (const key of this.l1.keys()) {
                if (regex.test(key)) {
                    this.l1.delete(key);
                }
            }
            await redisInvalidatePattern(`${CachePrefix.TOOL}:${type}*`);
            logger.info(`[Tool Cache] CLEARED TYPE ${type}`);
        } else {
            this.l1.clear();
            await redisInvalidatePattern(`${CachePrefix.TOOL}:*`);
            logger.info(`[Tool Cache] CLEARED ALL`);
        }

        return before - this.l1.size;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            totalHits: this.stats.hits,
            totalMisses: this.stats.misses,
            hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
            l1Entries: this.l1.size,
        };
    }

    /**
     * List all L1 cached entries (for debugging)
     */
    listEntries(): Array<{
        key: string;
        ttlRemaining: number;
        age: number;
        hits: number;
    }> {
        const now = Date.now();
        return Array.from(this.l1.entries())
            .map(([key, entry]) => ({
                key,
                ttlRemaining: Math.max(0, Math.round((entry.expiresAt - now) / 1000)),
                age: Math.round((now - entry.createdAt) / 1000),
                hits: entry.hits,
            }))
            .sort((a, b) => b.hits - a.hits);
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        const stats = this.getStats();
        logger.info(`[Tool Cache] Stats before reset:`, stats);
        this.stats = { hits: 0, misses: 0 };
    }

    private setL1<T>(key: string, data: T): void {
        if (this.l1.size >= MAX_L1_SIZE) {
            const keysToRemove = Array.from(this.l1.keys()).slice(0, 50);
            keysToRemove.forEach(k => this.l1.delete(k));
        }
        this.l1.set(key, {
            data,
            expiresAt: Date.now() + L1_TTL,
            createdAt: Date.now(),
            hits: 1,
        });
    }
}

// Singleton instance
const toolCache = new ToolCacheService();

export { ToolCacheService, toolCache };

/**
 * Predefined cache configurations for all tools (TTL in seconds)
 */
export const TOOL_CACHE_CONFIG = {
    // Heartbeat tools — data changes frequently, short TTL
    heartbeat_getStatus: 30,          // 30 sec
    heartbeat_getHistory: 60,         // 1 min
    heartbeat_getAlerts: 30,          // 30 sec
    heartbeat_diagnose: 60,           // 1 min

    // Platform analytics — revenue/stats are stable, longer TTL
    platform_getAnalytics: 600,       // 10 min
    platform_getHealthMetrics: 60,    // 1 min (CPU/memory changes fast)
    platform_listTenants: 1800,       // 30 min (customers added infrequently)
    platform_listPlaybooks: 1800,     // 30 min (rarely changed)
    platform_listFeatureFlags: 3600,  // 1 hour (beta flags change slowly)
    platform_listCoupons: 300,        // 5 min (coupon inventory can change)

    // User tools — no caching for security/timeliness
    user_getAll: 0,                   // No cache
    user_getPending: 0,               // No cache (approval workflow needs fresh data)
    user_approve: 0,                  // No cache (mutation)
    user_reject: 0,                   // No cache (mutation)
    user_promote: 0,                  // No cache (mutation)

    // System tools — mostly stable config
    system_getConfig: 3600,           // 1 hour
    system_setConfig: 0,              // No cache (mutation)
    system_listIntegrations: 1800,    // 30 min
    system_getAuditLog: 60,           // 1 min (logs change frequently)
    system_getStats: 300,             // 5 min
    system_clearCache: 0,             // No cache (mutation)
} as const;
