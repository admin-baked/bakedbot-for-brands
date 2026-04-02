/**
 * Next.js instrumentation for server-side errors.
 *
 * Keep this file extremely thin. Importing Slack or Linus services here causes
 * webpack to pull server-only packages into the instrumentation bundle.
 */

const _seenErrors = new Map<string, number>();
const DEDUP_TTL_MS = 10 * 60 * 1000;
const SERVER_ERROR_WEBHOOK_PATH = '/api/webhooks/error-report';
const SERVER_ERROR_DISPATCH_TIMEOUT_MS = 5_000;

function isDuplicate(key: string): boolean {
    const now = Date.now();
    const last = _seenErrors.get(key);
    if (last && now - last < DEDUP_TTL_MS) return true;

    _seenErrors.set(key, now);

    if (_seenErrors.size > 200) {
        const cutoff = now - DEDUP_TTL_MS;
        for (const [entryKey, timestamp] of _seenErrors.entries()) {
            if (timestamp < cutoff) _seenErrors.delete(entryKey);
        }
    }

    return false;
}

function isNoise(err: Error & { digest?: string }): boolean {
    const digest = err.digest ?? '';
    const message = err.message ?? '';

    if (digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT')) return true;
    if (/unauthorized|forbidden|not\s*found|unauthenticated/i.test(message)) return true;
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(message)) return true;

    return false;
}

function isInternalIncidentRoute(routePath: string): boolean {
    return routePath === SERVER_ERROR_WEBHOOK_PATH;
}

function isInOurCode(stack: string | undefined): boolean {
    if (!stack) return false;
    return stack.includes('/src/') || stack.includes('\\src\\');
}

let _cachedWebhookUrl: string | null | undefined;

function getServerErrorWebhookUrl(): string | null {
    if (_cachedWebhookUrl !== undefined) return _cachedWebhookUrl;

    if (!process.env.CRON_SECRET) {
        return (_cachedWebhookUrl = null);
    }

    const baseUrl =
        process.env.APP_BASE_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || (process.env.NODE_ENV === 'production'
            ? 'https://bakedbot.ai'
            : `http://127.0.0.1:${process.env.PORT || '3000'}`);

    return (_cachedWebhookUrl = `${baseUrl.replace(/\/$/, '')}${SERVER_ERROR_WEBHOOK_PATH}`);
}

async function dispatchServerErrorInterrupt(payload: {
    error: string;
    stack: string | undefined;
    digest: string | null;
    method: string;
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
}): Promise<void> {
    const cronSecret = process.env.CRON_SECRET;
    const url = getServerErrorWebhookUrl();
    if (!cronSecret || !url) {
        return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVER_ERROR_DISPATCH_TIMEOUT_MS);

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: payload.error,
                stack: payload.stack,
                context: {
                    digest: payload.digest,
                    method: payload.method,
                    routePath: payload.routePath,
                    routeType: payload.routeType,
                    source: 'next-instrumentation',
                },
            }),
            signal: controller.signal,
        });
    } catch {
        // Best-effort only. Never cascade the original request failure.
    } finally {
        clearTimeout(timeout);
    }
}

export async function register(): Promise<void> {
    // No-op required by Next.js instrumentation API.
}

export async function onRequestError(
    err: Error & { digest?: string },
    request: { path: string; method: string },
    context: {
        routerKind: string;
        routePath: string;
        routeType: 'render' | 'route' | 'action' | 'middleware';
    },
): Promise<void> {
    if (context.routeType === 'render') return;
    if (isInternalIncidentRoute(context.routePath)) return;
    if (isNoise(err)) return;

    const message = err.message || 'Unknown server error';
    const digest = err.digest ?? null;
    const dedupKey = digest ?? `${context.routePath}:${message.slice(0, 120)}`;

    if (isDuplicate(dedupKey)) return;

    const stack = err.stack;
    if (!isInOurCode(stack)) return;

    try {
        // Fire and forget without Node-only schedulers so Edge can evaluate this hook.
        void dispatchServerErrorInterrupt({
            error: message,
            stack,
            digest,
            method: request.method,
            routePath: context.routePath,
            routeType: context.routeType,
        });
    } catch {
        // Never throw from the instrumentation hook.
    }
}
