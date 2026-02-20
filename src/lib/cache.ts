/**
 * API Response Caching Layer
 * Uses Upstash Redis for distributed caching across server instances
 *
 * Cache Strategy:
 * - Menu data: 5 min TTL (invalidate on POS sync)
 * - Brand guides: 15 min TTL (invalidate on brand guide update)
 * - Products: 5 min TTL (invalidate on product update/POS sync)
 * - Analytics: 10 min TTL (acceptable staleness for dashboards)
 *
 * Fallback: If Redis unavailable, cache disabled (fail-through to origin)
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Initialize Redis client (lazy initialization)
let redis: Redis | null = null;

function initializeRedis() {
    if (redis) return redis;

    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
        logger.warn('[Cache] UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured — caching disabled');
        return null;
    }

    redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });

    logger.info('[Cache] Initialized Redis cache');
    return redis;
}

/**
 * Cache key prefixes for different data types
 */
export const CachePrefix = {
    MENU: 'menu',
    PRODUCTS: 'products',
    BRAND_GUIDE: 'brand_guide',
    ANALYTICS: 'analytics',
    POS_SYNC: 'pos_sync',
} as const;

/**
 * Default TTL (seconds) for each cache type
 */
export const CacheTTL = {
    MENU: 300, // 5 minutes
    PRODUCTS: 300, // 5 minutes
    BRAND_GUIDE: 900, // 15 minutes
    ANALYTICS: 600, // 10 minutes
    POS_SYNC: 3600, // 1 hour
} as const;

/**
 * Build cache key from prefix and identifier
 */
function buildCacheKey(prefix: string, id: string): string {
    return `bakedbot:cache:${prefix}:${id}`;
}

/**
 * Get cached value
 *
 * @param prefix - Cache prefix (e.g., 'menu', 'products')
 * @param id - Unique identifier (e.g., orgId, brandSlug)
 * @returns Cached value or null if not found/expired/error
 */
export async function getCached<T>(prefix: string, id: string): Promise<T | null> {
    const client = initializeRedis();
    if (!client) return null; // Cache disabled

    try {
        const key = buildCacheKey(prefix, id);
        const cached = await client.get<T>(key);

        if (cached) {
            logger.debug('[Cache] HIT', { prefix, id });
            return cached;
        }

        logger.debug('[Cache] MISS', { prefix, id });
        return null;
    } catch (error) {
        // On error, fail through (return null, let caller fetch fresh data)
        logger.error('[Cache] Failed to get cached value', {
            prefix,
            id,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Set cached value with TTL
 *
 * @param prefix - Cache prefix
 * @param id - Unique identifier
 * @param value - Value to cache (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 300 = 5 min)
 */
export async function setCached<T>(
    prefix: string,
    id: string,
    value: T,
    ttlSeconds = 300
): Promise<void> {
    const client = initializeRedis();
    if (!client) return; // Cache disabled

    try {
        const key = buildCacheKey(prefix, id);
        await client.set(key, value, { ex: ttlSeconds });

        logger.debug('[Cache] SET', { prefix, id, ttl: ttlSeconds });
    } catch (error) {
        // On error, fail silently (don't block the request)
        logger.error('[Cache] Failed to set cached value', {
            prefix,
            id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Invalidate cache for specific key
 *
 * @param prefix - Cache prefix
 * @param id - Unique identifier
 */
export async function invalidateCache(prefix: string, id: string): Promise<void> {
    const client = initializeRedis();
    if (!client) return;

    try {
        const key = buildCacheKey(prefix, id);
        await client.del(key);

        logger.info('[Cache] INVALIDATE', { prefix, id });
    } catch (error) {
        logger.error('[Cache] Failed to invalidate cache', {
            prefix,
            id,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Invalidate all cache keys matching a pattern
 *
 * Example: invalidateCachePattern('menu:*') invalidates all menu caches
 *
 * @param pattern - Redis pattern (e.g., 'menu:*', 'products:org_123:*')
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
    const client = initializeRedis();
    if (!client) return;

    try {
        const fullPattern = `bakedbot:cache:${pattern}`;

        // Upstash Redis REST API doesn't support SCAN, so we use KEYS (acceptable for small datasets)
        // For production at scale, consider using Redis Cluster with SCAN
        const keys = await client.keys(fullPattern);

        if (keys.length > 0) {
            await client.del(...keys);
            logger.info('[Cache] INVALIDATE_PATTERN', { pattern, count: keys.length });
        }
    } catch (error) {
        logger.error('[Cache] Failed to invalidate cache pattern', {
            pattern,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Wrapper for cached function execution
 *
 * Checks cache first, executes function if cache miss, stores result
 *
 * @param prefix - Cache prefix
 * @param id - Unique identifier
 * @param fn - Function to execute on cache miss
 * @param ttlSeconds - Cache TTL (default: 300)
 * @returns Result from cache or function
 */
export async function withCache<T>(
    prefix: string,
    id: string,
    fn: () => Promise<T>,
    ttlSeconds = 300
): Promise<T> {
    // Check cache first
    const cached = await getCached<T>(prefix, id);
    if (cached !== null) {
        return cached;
    }

    // Cache miss — execute function
    const result = await fn();

    // Store in cache (don't await — fire and forget)
    setCached(prefix, id, result, ttlSeconds).catch(() => {
        // Error already logged in setCached
    });

    return result;
}
