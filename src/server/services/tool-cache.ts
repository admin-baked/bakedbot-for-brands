/**
 * Tool Cache Service
 *
 * In-memory caching layer for Super User agent tools with configurable TTL.
 * Reduces Firestore queries for read-heavy operations (analytics, listings).
 * Auto-invalidates on CloudFirestore write events.
 *
 * Usage:
 *   const result = await withCache('platform_getAnalytics', () => getPlatformAnalytics(), 300); // 5 min TTL
 */

import { logger } from '@/lib/logger';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;  // timestamp in ms
    createdAt: number;
    hits: number;       // for metrics
}

interface CacheStats {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    entries: number;
}

class ToolCacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private stats = {
        hits: 0,
        misses: 0,
    };

    /**
     * Get cached value or fetch fresh data
     *
     * @param key Cache key (e.g., 'platform_getAnalytics')
     * @param fetcher Async function that fetches fresh data
     * @param ttlSeconds Time-to-live in seconds (default: 300 = 5 min)
     */
    async withCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number = 300
    ): Promise<T> {
        const now = Date.now();
        const cached = this.cache.get(key);

        // Return cached data if still valid
        if (cached && cached.expiresAt > now) {
            cached.hits++;
            this.stats.hits++;
            logger.debug(`[Tool Cache] HIT ${key} (age: ${Math.round((now - cached.createdAt) / 1000)}s)`);
            return cached.data as T;
        }

        // Cache miss — fetch fresh data
        logger.debug(`[Tool Cache] MISS ${key}`);
        this.stats.misses++;

        try {
            const data = await fetcher();
            const expiresAt = now + ttlSeconds * 1000;

            // Store in cache
            this.cache.set(key, {
                data,
                expiresAt,
                createdAt: now,
                hits: 1,
            });

            logger.debug(`[Tool Cache] STORED ${key} (TTL: ${ttlSeconds}s)`);
            return data;
        } catch (error) {
            logger.error(`[Tool Cache] FETCH FAILED ${key}`, error);
            throw error;
        }
    }

    /**
     * Invalidate specific cache entry (called after mutations)
     */
    invalidate(key: string): void {
        const existed = this.cache.has(key);
        this.cache.delete(key);
        logger.debug(`[Tool Cache] INVALIDATED ${key}${existed ? '' : ' (was not cached)'}`);
    }

    /**
     * Invalidate multiple related cache entries (e.g., after user approval, invalidate user listings)
     */
    invalidatePattern(pattern: string | RegExp): number {
        const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        logger.debug(`[Tool Cache] INVALIDATED PATTERN ${regex} (${count} entries)`);
        return count;
    }

    /**
     * Clear all cache (e.g., system_clearCache tool)
     */
    clear(type?: string): number {
        const before = this.cache.size;

        if (type) {
            // Clear specific type (e.g., 'analytics')
            const regex = new RegExp(`^${type}`);
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            }
            logger.info(`[Tool Cache] CLEARED TYPE ${type}`);
        } else {
            // Clear all
            this.cache.clear();
            logger.info(`[Tool Cache] CLEARED ALL`);
        }

        const after = this.cache.size;
        return before - after;
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
            entries: this.cache.size,
        };
    }

    /**
     * List all cached entries (for debugging)
     */
    listEntries(): Array<{
        key: string;
        ttlRemaining: number;
        age: number;
        hits: number;
    }> {
        const now = Date.now();
        const entries = Array.from(this.cache.entries())
            .map(([key, entry]) => ({
                key,
                ttlRemaining: Math.max(0, Math.round((entry.expiresAt - now) / 1000)),
                age: Math.round((now - entry.createdAt) / 1000),
                hits: entry.hits,
            }))
            .sort((a, b) => b.hits - a.hits);

        return entries;
    }

    /**
     * Reset statistics (e.g., for daily metrics)
     */
    resetStats(): void {
        const stats = this.getStats();
        logger.info(`[Tool Cache] Stats before reset:`, stats);
        this.stats = { hits: 0, misses: 0 };
    }
}

// Singleton instance
const toolCache = new ToolCacheService();

export { ToolCacheService, toolCache };

/**
 * Predefined cache configurations for all tools
 * Lower TTL for frequently-changing data, higher TTL for stable data
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
