/**
 * Rate Limiting Middleware
 * Protects public routes from abuse using Upstash Redis
 *
 * Production-ready rate limiting with:
 * - Distributed rate limiting (works across multiple server instances)
 * - Persistent storage (survives server restarts)
 * - Sliding window algorithm (more accurate than fixed window)
 * - Analytics and monitoring support
 *
 * Fallback: If Redis not configured, allows all requests (fail-open)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
// Note: Cannot use @/lib/logger in Edge Runtime (middleware)
// Google Cloud Logging is Node.js-only; use console for Edge

// Initialize Redis client (lazy initialization — only if env vars present)
let redis: Redis | null = null;
let rateLimit: Ratelimit | null = null;

function initializeRateLimit() {
    if (rateLimit) return rateLimit;

    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
        console.warn(
            '[RateLimit] UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not configured — rate limiting disabled'
        );
        return null;
    }

    redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });

    // 100 requests per minute per IP (sliding window)
    // Sliding window is more accurate than fixed window:
    // - Fixed: 100 req at 0:59, 100 req at 1:01 = 200 req in 2 seconds (burst)
    // - Sliding: 100 req across any 60-second window (smooth)
    rateLimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'bakedbot:ratelimit',
    });

    console.log('[RateLimit] Initialized with 100 req/min sliding window');
    return rateLimit;
}

/**
 * Check rate limit for given IP address
 *
 * @param ip - IP address to check (from x-forwarded-for or x-real-ip header)
 * @returns { success: true } if request is allowed
 * @returns { success: false, remaining: 0, reset: Date } if limit exceeded
 *
 * If rate limiting not configured (missing env vars), allows all requests (fail-open)
 * If Redis errors occur, allows requests (fail-open) — prevents outages from killing entire site
 */
export async function checkRateLimit(
    ip: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: Date }> {
    const limiter = initializeRateLimit();

    if (!limiter) {
        // Rate limiting not configured — allow all requests (fail-open)
        return { success: true };
    }

    try {
        const { success, limit, remaining, reset } = await limiter.limit(ip);

        if (!success) {
            console.warn('[RateLimit] Rate limit exceeded', {
                ip,
                limit,
                remaining,
                reset: reset ? new Date(reset).toISOString() : undefined,
            });
        }

        return { success, limit, remaining, reset: reset ? new Date(reset) : undefined };
    } catch (error) {
        // On error (Redis down, network issue), fail open (allow request)
        // This prevents rate limiting from causing site-wide outages
        console.error('[RateLimit] Failed to check rate limit — allowing request', {
            ip,
            error: error instanceof Error ? error.message : String(error),
        });
        return { success: true };
    }
}
