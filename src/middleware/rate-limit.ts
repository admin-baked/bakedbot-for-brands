/**
 * Rate Limiting Middleware
 * Protects API routes from abuse
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
    '/api/auth': { requests: 5, window: 60000 }, // 5 per minute
    '/api/payments': { requests: 10, window: 60000 }, // 10 per minute
    '/api/': { requests: 100, window: 60000 }, // 100 per minute default
};

export function rateLimitMiddleware(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const path = req.nextUrl.pathname;

    // Find matching rate limit
    let limit = RATE_LIMITS['/api/'];
    for (const [route, config] of Object.entries(RATE_LIMITS)) {
        if (path.startsWith(route)) {
            limit = config;
            break;
        }
    }

    const key = `${ip}:${path}`;
    const now = Date.now();
    const record = rateLimit.get(key);

    if (record) {
        if (now < record.resetTime) {
            if (record.count >= limit.requests) {
                return NextResponse.json(
                    { error: 'Too many requests' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)) } }
                );
            }
            record.count++;
        } else {
            rateLimit.set(key, { count: 1, resetTime: now + limit.window });
        }
    } else {
        rateLimit.set(key, { count: 1, resetTime: now + limit.window });
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
        const entries = Array.from(rateLimit.entries());
        for (const [k, v] of entries) {
            if (now > v.resetTime) rateLimit.delete(k);
        }
    }

    return null; // Allow request
}
