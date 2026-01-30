/**
 * POS Data Cache
 *
 * Simple in-memory cache for POS data (customers, orders)
 * with TTL (time-to-live) support
 *
 * Future: Replace with Redis for production
 */

import { logger } from '@/lib/logger';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // milliseconds
}

class POSCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get cached data if still valid
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            // Expired
            this.cache.delete(key);
            logger.debug('[POS_CACHE] Cache miss (expired)', { key, age: Math.round(age / 1000) });
            return null;
        }

        logger.debug('[POS_CACHE] Cache hit', { key, age: Math.round(age / 1000) });
        return entry.data as T;
    }

    /**
     * Set cached data with optional TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.DEFAULT_TTL,
        };

        this.cache.set(key, entry);
        logger.debug('[POS_CACHE] Cache set', {
            key,
            ttl: Math.round(entry.ttl / 1000),
            size: this.cache.size,
        });
    }

    /**
     * Invalidate cached data
     */
    invalidate(key: string): void {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug('[POS_CACHE] Cache invalidated', { key });
        }
    }

    /**
     * Invalidate all cached data for an org
     */
    invalidateOrg(orgId: string): void {
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(orgId)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        logger.info('[POS_CACHE] Invalidated org cache', {
            orgId,
            count: keysToDelete.length,
        });
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        logger.info('[POS_CACHE] Cache cleared', { size });
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());

        const stats = {
            size: entries.length,
            valid: 0,
            expired: 0,
            totalAge: 0,
        };

        entries.forEach(([key, entry]) => {
            const age = now - entry.timestamp;
            stats.totalAge += age;

            if (age > entry.ttl) {
                stats.expired++;
            } else {
                stats.valid++;
            }
        });

        return {
            ...stats,
            avgAge: stats.size > 0 ? Math.round(stats.totalAge / stats.size / 1000) : 0,
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));

        if (keysToDelete.length > 0) {
            logger.debug('[POS_CACHE] Cleanup completed', {
                removed: keysToDelete.length,
                remaining: this.cache.size,
            });
        }
    }
}

// Singleton instance
export const posCache = new POSCache();

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => posCache.cleanup(), 10 * 60 * 1000);
}

/**
 * Cache key generators
 */
export const cacheKeys = {
    customers: (orgId: string) => `${orgId}:customers`,
    orders: (orgId: string) => `${orgId}:orders`,
    customer: (orgId: string, customerId: string) => `${orgId}:customer:${customerId}`,
    order: (orgId: string, orderId: string) => `${orgId}:order:${orderId}`,
};
