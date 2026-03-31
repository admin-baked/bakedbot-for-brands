/**
 * Next.js Instrumentation — Server-Side Error → Linus Alerting
 *
 * `onRequestError` fires for every unhandled server error:
 *   - API route crashes (500s)
 *   - SSR / RSC render failures
 *   - Server Action throws
 *   - Middleware crashes
 *
 * Client-side React errors are already handled by error.tsx → FelishaErrorBoundary → /api/tickets.
 * This covers the server-side blind spot.
 */

import { generateId } from '@/lib/utils';

// In-memory dedup: prevent Linus alert spam for recurring errors.
// Key = stable error fingerprint (digest or routePath:message).
const _seenErrors = new Map<string, number>();
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Returns true if this error key was seen recently; records it if not.
// Naming reflects the side-effect: both checks AND marks.
function isDuplicate(key: string): boolean {
    const now = Date.now();
    const last = _seenErrors.get(key);
    if (last && now - last < DEDUP_TTL_MS) return true;

    _seenErrors.set(key, now);

    // Evict stale entries to prevent unbounded growth (max 200 keys)
    if (_seenErrors.size > 200) {
        const cutoff = now - DEDUP_TTL_MS;
        for (const [k, v] of _seenErrors.entries()) {
            if (v < cutoff) _seenErrors.delete(k);
        }
    }

    return false;
}

function isNoise(err: Error & { digest?: string }): boolean {
    const digest = err.digest ?? '';
    const message = err.message ?? '';

    // Next.js control-flow "errors" — notFound() and redirect() are not real errors
    if (digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT')) return true;

    // Expected auth / client errors
    if (/unauthorized|forbidden|not\s*found|unauthenticated/i.test(message)) return true;

    // Connection / infrastructure noise (handled by monitoring, not Linus)
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(message)) return true;

    return false;
}

function isInOurCode(stack: string | undefined): boolean {
    if (!stack) return false;
    // Stack frames referencing src/ indicate the error originated in our code
    return stack.includes('/src/') || stack.includes('\\src\\');
}

function buildSlackBlocks(
    routePath: string,
    routeType: string,
    method: string,
    message: string,
    digest: string | null,
): Record<string, unknown>[] {
    const fields: Array<{ type: string; text: string }> = [
        { type: 'mrkdwn', text: `*Route*\n\`${method} ${routePath}\`` },
        { type: 'mrkdwn', text: `*Type*\n${routeType}` },
    ];
    if (digest) {
        fields.push({ type: 'mrkdwn', text: `*Digest*\n\`${digest}\`` });
    }

    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: '🔴 Server Error — Linus Notified', emoji: true },
        },
        {
            type: 'section',
            fields,
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Error*\n\`\`\`${message.slice(0, 500)}\`\`\``,
            },
        },
    ];
}

function buildLinusPrompt(
    routePath: string,
    routeType: string,
    method: string,
    message: string,
    stack: string | undefined,
    digest: string | null,
): string {
    return `CRITICAL INTERRUPT: A production server error has been automatically detected.

ROUTE: ${method} ${routePath}
TYPE: ${routeType}
DIGEST: ${digest ?? 'N/A'}

ERROR: ${message}

STACK TRACE:
${stack?.slice(0, 3000) ?? 'No stack trace available'}

YOUR TASK:
1. Search the codebase for the affected file and function from the stack trace.
2. Determine the root cause.
3. If the fix is safe and obvious, implement it, verify with run_health_check (build_only), and push via github_push_api.
4. If you cannot safely repair it, explain the blocker and next action.
5. Report back to Slack: MISSION_READY, NEEDS_REVIEW, or BLOCKED.`;
}

export async function register(): Promise<void> {
    // No-op — registration hook required by Next.js instrumentation API
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
    // Client-side render errors are already handled by error.tsx → FelishaErrorBoundary
    if (context.routeType === 'render') return;

    if (isNoise(err)) return;

    const message = err.message || 'Unknown server error';
    const digest = err.digest ?? null;
    const dedupKey = digest ?? `${context.routePath}:${message.slice(0, 120)}`;

    if (isDuplicate(dedupKey)) return;

    try {
        const [{ postLinusIncidentSlack }, { dispatchLinusIncidentResponse }] = await Promise.all([
            import('@/server/services/incident-notifications'),
            import('@/server/services/linus-incident-response'),
        ]);

        const incidentId = `server-error-${generateId()}`;

        // Always post the Slack alert so Linus is aware
        setImmediate(() => void postLinusIncidentSlack({
            source: 'server-error',
            incidentId,
            channelName: 'linus-cto',
            fallbackText: `Server error: ${message.slice(0, 100)} on ${context.routePath}`,
            blocks: buildSlackBlocks(context.routePath, context.routeType, request.method, message, digest),
        }));

        // Only dispatch the full Linus repair agent if the error is in our code —
        // avoids running Claude for every third-party or infrastructure error.
        if (isInOurCode(err.stack)) {
            setImmediate(() => void dispatchLinusIncidentResponse({
                prompt: buildLinusPrompt(context.routePath, context.routeType, request.method, message, err.stack, digest),
                source: 'server-error',
                incidentId,
                channelName: 'linus-cto',
                maxIterations: 8,
                analysisHeader: '🛠️ Linus — Server Error Fix',
                analysisFallbackPrefix: '🛠️ Server error fix',
            }));
        }
    } catch {
        // Never throw from the instrumentation hook — it would crash the server response
    }
}
