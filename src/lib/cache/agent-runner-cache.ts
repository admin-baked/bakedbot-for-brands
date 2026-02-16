/**
 * Agent Runner Cache
 *
 * In-memory cache for expensive operations in agent-runner.ts
 * Reduces latency from 5-8s to <1s for repeated queries
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class AgentRunnerCache {
    private cache = new Map<string, CacheEntry<any>>();

    /**
     * Get cached value if not expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set cache value with TTL in seconds
     */
    set<T>(key: string, value: T, ttlSeconds: number): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000),
        });
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear expired entries (cleanup)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
export const agentCache = new AgentRunnerCache();

// Auto-cleanup every 5 minutes
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
} as const;

/**
 * Cache TTLs (in seconds)
 */
export const CacheTTL = {
    BRAND_PROFILE: 5 * 60, // 5 minutes
    AI_SETTINGS: 5 * 60,   // 5 minutes
    AGENT_CONFIG: 5 * 60,  // 5 minutes
    KB_SEARCH: 60,         // 1 minute (shorter for freshness)
} as const;
