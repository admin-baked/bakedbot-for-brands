/**
 * Domain Cache
 *
 * Redis-backed cache for domain -> tenant lookups with in-memory L1.
 * L1 (in-memory) prevents Redis round-trips for hot domains.
 * L2 (Upstash Redis) ensures cross-instance consistency.
 *
 * Fallback: If Redis is unavailable, L1 still works per-instance.
 */

import { getCached, setCached, invalidateCache, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

/** L1 in-memory entry with short TTL */
interface L1Entry {
    tenantId: string | null;
    expiry: number;
}

/** L1 TTL in milliseconds (30 seconds — short to stay fresh with Redis) */
const L1_TTL = 30 * 1000;

/** Maximum L1 cache size to prevent memory issues */
const MAX_L1_SIZE = 500;

/** In-memory L1 domain cache */
const l1Cache = new Map<string, L1Entry>();

/**
 * Get tenant ID from cache (L1 → L2 Redis)
 * @param domain - The domain to lookup
 * @returns Tenant ID if found and not expired, undefined if not cached
 */
export async function getCachedTenant(domain: string): Promise<string | null | undefined> {
    const normalizedDomain = domain.toLowerCase();

    // L1 check (synchronous, fast)
    const l1 = l1Cache.get(normalizedDomain);
    if (l1 && Date.now() < l1.expiry) {
        return l1.tenantId;
    }
    if (l1) l1Cache.delete(normalizedDomain);

    // L2 check (Redis)
    const redisValue = await getCached<string | null>(CachePrefix.DOMAIN, normalizedDomain);
    if (redisValue !== null) {
        // Promote to L1
        setL1(normalizedDomain, redisValue);
        return redisValue;
    }

    return undefined; // Not in any cache
}

/**
 * Set tenant ID in cache (L1 + L2 Redis)
 * @param domain - The domain
 * @param tenantId - The tenant ID (or null if not found)
 */
export async function setCachedTenant(domain: string, tenantId: string | null): Promise<void> {
    const normalizedDomain = domain.toLowerCase();

    // Set L1
    setL1(normalizedDomain, tenantId);

    // Set L2 (Redis) — store "null" as empty string sentinel
    await setCached(
        CachePrefix.DOMAIN,
        normalizedDomain,
        tenantId ?? '__null__',
        CacheTTL.DOMAIN
    );
}

/**
 * Invalidate cache entry for a domain (L1 + L2)
 * @param domain - The domain to invalidate
 */
export async function invalidateDomainCache(domain: string): Promise<void> {
    const normalized = domain.toLowerCase();
    l1Cache.delete(normalized);
    await invalidateCache(CachePrefix.DOMAIN, normalized);
}

/**
 * Clear entire domain cache (L1 only — Redis entries expire via TTL)
 */
export function clearDomainCache(): void {
    l1Cache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getDomainCacheStats(): { l1Size: number; maxL1Size: number } {
    return {
        l1Size: l1Cache.size,
        maxL1Size: MAX_L1_SIZE,
    };
}

// --- Internal helpers ---

function setL1(domain: string, tenantId: string | null): void {
    // Prevent L1 from growing too large
    if (l1Cache.size >= MAX_L1_SIZE) {
        const keysToRemove = Array.from(l1Cache.keys()).slice(0, 50);
        keysToRemove.forEach(key => l1Cache.delete(key));
        logger.warn('[DomainCache] Pruned L1 cache', { removed: 50 });
    }

    l1Cache.set(domain, {
        tenantId,
        expiry: Date.now() + L1_TTL,
    });
}
