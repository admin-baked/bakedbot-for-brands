/**
 * Agent Runner Cache
 *
 * Redis-backed cache with in-memory L1 for expensive agent-runner operations.
 * Reduces latency from 5-8s to <1s for repeated queries.
 *
 * L1 (in-memory): 30s TTL, prevents Redis round-trips for hot paths.
 * L2 (Upstash Redis): Full TTL, shared across all server instances.
 */

import { getCached, setCached, invalidateCache, CachePrefix } from '@/lib/cache';

/** L1 in-memory entry */
interface L1Entry<T> {
    value: T;
    expiresAt: number;
}

/** L1 TTL in ms (30 seconds — keep hot data local) */
const L1_TTL = 30 * 1000;

class AgentRunnerCache {
    private l1 = new Map<string, L1Entry<unknown>>();

    /**
     * Get cached value (L1 → L2 Redis)
     */
    async get<T>(key: string): Promise<T | null> {
        // L1 check
        const l1Entry = this.l1.get(key);
        if (l1Entry && Date.now() < l1Entry.expiresAt) {
            return l1Entry.value as T;
        }
        if (l1Entry) this.l1.delete(key);

        // L2 check (Redis)
        const redisValue = await getCached<T>(CachePrefix.AGENT_RUNNER, key);
        if (redisValue !== null) {
            this.setL1(key, redisValue);
            return redisValue;
        }

        return null;
    }

    /**
     * Set cache value with TTL in seconds (L1 + L2)
     */
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        this.setL1(key, value);
        await setCached(CachePrefix.AGENT_RUNNER, key, value, ttlSeconds);
    }

    /**
     * Clear all L1 entries (Redis entries expire via TTL)
     */
    clear(): void {
        this.l1.clear();
    }

    /**
     * Invalidate a specific key (L1 + L2)
     */
    async invalidate(key: string): Promise<void> {
        this.l1.delete(key);
        await invalidateCache(CachePrefix.AGENT_RUNNER, key);
    }

    /**
     * Clean up expired L1 entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.l1.entries()) {
            if (now > entry.expiresAt) {
                this.l1.delete(key);
            }
        }
    }

    private setL1<T>(key: string, value: T): void {
        this.l1.set(key, {
            value,
            expiresAt: Date.now() + L1_TTL,
        });
    }
}

// Singleton instance
export const agentCache = new AgentRunnerCache();

// Auto-cleanup L1 every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => agentCache.cleanup(), 5 * 60 * 1000);
}

/**
 * Cache key builders for type safety
 */
export const CacheKeys = {
    brandProfile: (orgId: string) => `brand:${orgId}`,
    aiSettings: (tenantId: string, userId?: string) => `ai-settings:${tenantId}:${userId || 'none'}`,
    agentConfig: (personaId: string, brandId: string) => `agent-config:${personaId}:${brandId}`,
    kbSearch: (agentId: string, query: string, orgId: string) => `kb:${agentId}:${orgId}:${query.substring(0, 50)}`,
    lettaMemory: (agentId: string, query: string, orgId: string) => `letta:${agentId}:${orgId}:${query.substring(0, 50)}`,
} as const;

/**
 * Cache TTLs (in seconds) — maps legacy names to centralized CacheTTL values
 */
export const CacheTTL = {
    BRAND_PROFILE: 300,   // 5 minutes
    AI_SETTINGS: 300,     // 5 minutes
    AGENT_CONFIG: 300,    // 5 minutes
    KB_SEARCH: 60,        // 1 minute (shorter for freshness)
    LETTA_MEMORY: 120,    // 2 minutes
} as const;
