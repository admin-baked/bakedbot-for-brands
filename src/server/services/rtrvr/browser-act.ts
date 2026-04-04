'use server';

/**
 * Generic Authenticated Browser Action
 *
 * Core abstraction for running RTRVR /agent tasks against any service
 * using cookies stored in Firestore by the Super User's standardized login flow.
 *
 * All service-specific browser modules (LinkedIn, Twitter, Reddit, etc.) build
 * on this — inject cookies, pass task, get result. We own the session; RTRVR
 * only receives cookies per-call and never stores them.
 *
 * Firestore path: users/{uid}/integrations/{serviceId} → { cookies: Record<string, string> }
 */

import { getRTRVRClient } from './client';
import { SERVICE_REGISTRY, type ServiceId } from './service-registry';
import { getServiceSessionCookies } from '@/server/actions/service-session';
import { logger } from '@/lib/logger';

export interface BrowserActOptions {
    /** Task description for the autonomous agent */
    task: string;
    /** URL(s) to open before executing the task */
    urls: string[];
    /** Additional cookies beyond the stored session (rarely needed) */
    extraCookies?: Array<{ name: string; value: string; domain: string }>;
    /** Timeout override in ms (default: 120s) */
    timeoutMs?: number;
}

export interface BrowserActResult {
    success: boolean;
    output?: unknown;
    error?: string;
}

// Per-uid session cache — avoids Firestore reads on every tool call within a session.
// Cookies are valid for days/weeks so 5-min TTL is safe.
const SESSION_TTL_MS = 5 * 60 * 1000;
const cookieCache = new Map<string, { cookies: Record<string, string>; expiresAt: number }>();

async function getSessionCookies(uid: string, serviceId: ServiceId): Promise<Record<string, string> | null> {
    const cacheKey = `${uid}:${serviceId}`;
    const cached = cookieCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.cookies;

    // Purge stale entries on miss
    for (const [key, entry] of cookieCache) {
        if (entry.expiresAt <= Date.now()) cookieCache.delete(key);
    }

    const cookies = await getServiceSessionCookies(uid, serviceId);
    if (!cookies || Object.keys(cookies).length === 0) return null;

    cookieCache.set(cacheKey, { cookies, expiresAt: Date.now() + SESSION_TTL_MS });
    return cookies;
}

/**
 * Run an authenticated browser task against any registered service.
 *
 * The user's stored session cookies are injected into the RTRVR browser;
 * credentials are never sent and sessions are never held by RTRVR.
 */
export async function browserAct(
    uid: string,
    serviceId: ServiceId,
    options: BrowserActOptions
): Promise<BrowserActResult> {
    const service = SERVICE_REGISTRY[serviceId];
    const rtrvr = getRTRVRClient();

    if (!rtrvr.isAvailable()) {
        return { success: false, error: 'Browser automation unavailable (RTRVR not configured)' };
    }

    const storedCookies = await getSessionCookies(uid, serviceId);
    if (!storedCookies) {
        return {
            success: false,
            error: `${service.displayName} not connected. Ask the Super User to connect ${service.displayName} in Settings.`,
        };
    }

    const cookies = [
        ...Object.entries(storedCookies).map(([name, value]) => ({
            name,
            value,
            domain: service.cookieDomain,
        })),
        ...(options.extraCookies ?? []),
    ];

    logger.info('[BrowserAct] Executing task', {
        serviceId,
        uid,
        urlCount: options.urls.length,
        taskLength: options.task.length,
    });

    const result = await rtrvr.agent<{ result?: unknown; output?: unknown }>({
        input: options.task,
        urls: options.urls,
        cookies,
    });

    if (!result.success) {
        logger.warn('[BrowserAct] Task failed', { serviceId, uid, error: result.error });
        return { success: false, error: result.error };
    }

    const output = result.data?.result ?? result.data?.output ?? result.data;
    logger.info('[BrowserAct] Task succeeded', { serviceId, uid });
    return { success: true, output };
}
