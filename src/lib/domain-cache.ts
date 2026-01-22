/**
 * Domain Cache
 *
 * In-memory cache for domain -> tenant lookups.
 * Prevents Firestore latency on every request in middleware.
 *
 * Note: In production, consider using Redis or Cloudflare KV for
 * better performance and cross-instance cache sharing.
 */

import { logger } from '@/lib/logger';

/** Cache entry with TTL */
interface CacheEntry {
    tenantId: string | null;
    expiry: number;
}

/** Cache TTL in milliseconds (1 minute) */
const CACHE_TTL = 60 * 1000;

/** Maximum cache size to prevent memory issues */
const MAX_CACHE_SIZE = 1000;

/** In-memory domain cache */
const domainCache = new Map<string, CacheEntry>();

/**
 * Get tenant ID from cache
 * @param domain - The domain to lookup
 * @returns Tenant ID if found and not expired, undefined otherwise
 */
export function getCachedTenant(domain: string): string | null | undefined {
    const normalizedDomain = domain.toLowerCase();
    const entry = domainCache.get(normalizedDomain);

    if (!entry) {
        return undefined; // Not in cache
    }

    if (Date.now() > entry.expiry) {
        // Expired, remove and return undefined
        domainCache.delete(normalizedDomain);
        return undefined;
    }

    return entry.tenantId;
}

/**
 * Set tenant ID in cache
 * @param domain - The domain
 * @param tenantId - The tenant ID (or null if not found)
 */
export function setCachedTenant(domain: string, tenantId: string | null): void {
    const normalizedDomain = domain.toLowerCase();

    // Prevent cache from growing too large
    if (domainCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entries (first 100)
        const keysToRemove = Array.from(domainCache.keys()).slice(0, 100);
        keysToRemove.forEach(key => domainCache.delete(key));
        logger.warn('[DomainCache] Pruned cache due to size limit', { removed: 100 });
    }

    domainCache.set(normalizedDomain, {
        tenantId,
        expiry: Date.now() + CACHE_TTL,
    });
}

/**
 * Invalidate cache entry for a domain
 * @param domain - The domain to invalidate
 */
export function invalidateDomainCache(domain: string): void {
    domainCache.delete(domain.toLowerCase());
}

/**
 * Clear entire domain cache
 */
export function clearDomainCache(): void {
    domainCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getDomainCacheStats(): { size: number; maxSize: number } {
    return {
        size: domainCache.size,
        maxSize: MAX_CACHE_SIZE,
    };
}
