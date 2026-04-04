/**
 * Opencode Agent Proxy
 *
 * Internal HTTP gateway to the Opencode Cloud Run service.
 * Any BakedBot agent (Linus, Leo, Super Users) posts a coding task here
 * and gets the result back — default model is Zen (free, no API cost).
 *
 * Endpoint: POST /api/opencode/run
 * Auth: Bearer CRON_SECRET (same secret used by all internal agent endpoints)
 *
 * Body:
 *   { prompt: string, model?: string, sessionId?: string }
 *
 * Response:
 *   { success: true, result: string, model: string, sessionId: string }
 *
 * Models (set via `model` field):
 *   zen/big-pickle        — free, default
 *   zen/mimo-v2-pro       — free, stronger reasoning
 *   zen/kimi-k24          — free, long context
 *   anthropic/claude-sonnet-4-6 — premium (billed against CLAUDE_API_KEY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const OPENCODE_AGENT_URL = process.env.OPENCODE_AGENT_URL;

const DEFAULT_MODEL = 'zen/big-pickle';
// 55s — stays under Next.js 60s default route timeout, giving polling room to finish
const OPENCODE_TIMEOUT_MS = 55_000;
const POLL_INTERVAL_MS = 4_000; // 4s interval → max ~13 polls within timeout window

// Precompute Basic auth header once at module init (password is static per instance)
const OPENCODE_HEADERS: Record<string, string> = (() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const password = process.env.OPENCODE_SERVER_PASSWORD;
    if (password) {
        headers['Authorization'] = `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`;
    }
    return headers;
})();

export async function POST(request: NextRequest) {
    // Auth — same Bearer pattern as all internal cron/agent endpoints
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!CRON_SECRET || token !== CRON_SECRET) {
        logger.warn('[opencode] Unauthorized request', {
            ip: request.headers.get('x-forwarded-for'),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENCODE_AGENT_URL) {
        logger.error('[opencode] OPENCODE_AGENT_URL not configured');
        return NextResponse.json({ error: 'Opencode agent not configured' }, { status: 503 });
    }

    let body: { prompt: string; model?: string; sessionId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.prompt?.trim()) {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const model = body.model ?? DEFAULT_MODEL;
    const sessionId = body.sessionId ?? crypto.randomUUID();

    logger.info('[opencode] Dispatching task', {
        model,
        sessionId,
        promptPreview: body.prompt.slice(0, 100),
    });

    try {
        // Create a session in the opencode server
        const sessionRes = await fetch(`${OPENCODE_AGENT_URL}/session`, {
            method: 'POST',
            headers: OPENCODE_HEADERS,
            body: JSON.stringify({ id: sessionId }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!sessionRes.ok) {
            const err = await sessionRes.text();
            logger.error('[opencode] Failed to create session', { status: sessionRes.status, err });
            return NextResponse.json({ error: 'Failed to create opencode session' }, { status: 502 });
        }

        // Send the prompt as a message to the session
        const msgRes = await fetch(`${OPENCODE_AGENT_URL}/session/${sessionId}/message`, {
            method: 'POST',
            headers: OPENCODE_HEADERS,
            body: JSON.stringify({ role: 'user', parts: [{ type: 'text', text: body.prompt }] }),
            signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
        });

        if (!msgRes.ok) {
            const err = await msgRes.text();
            logger.error('[opencode] Failed to send message', { status: msgRes.status, err });
            return NextResponse.json({ error: 'Opencode message failed' }, { status: 502 });
        }

        // Poll for completion — opencode queues the response, we collect the final assistant message
        const result = await pollForCompletion(sessionId, OPENCODE_TIMEOUT_MS);

        logger.info('[opencode] Task complete', { sessionId, model, resultLength: result.length });

        return NextResponse.json({ success: true, result, model, sessionId });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[opencode] Unexpected error', { error: message });
        return NextResponse.json({ error: `Opencode error: ${message}` }, { status: 500 });
    }
}

// Also support GET to mirror cron pattern (health checks)
export async function GET() {
    if (!OPENCODE_AGENT_URL) {
        return NextResponse.json({ status: 'unconfigured' }, { status: 503 });
    }
    try {
        const res = await fetch(`${OPENCODE_AGENT_URL}/app`, {
            headers: OPENCODE_HEADERS,
            signal: AbortSignal.timeout(5_000),
        });
        const healthy = res.ok;
        return NextResponse.json({ status: healthy ? 'healthy' : 'degraded' }, { status: healthy ? 200 : 502 });
    } catch {
        return NextResponse.json({ status: 'unreachable' }, { status: 503 });
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Poll the opencode session until we get an assistant message.
 * Logs transient fetch failures so they're visible in Cloud Logging.
 */
async function pollForCompletion(sessionId: string, timeoutMs: number): Promise<string> {
    const startMs = Date.now();

    while (Date.now() - startMs < timeoutMs) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        let res: Response;
        try {
            res = await fetch(`${OPENCODE_AGENT_URL}/session/${sessionId}/message`, {
                headers: OPENCODE_HEADERS,
                signal: AbortSignal.timeout(10_000),
            });
        } catch (err) {
            logger.warn('[opencode] Poll fetch failed, retrying', {
                sessionId,
                error: err instanceof Error ? err.message : String(err),
            });
            continue;
        }

        if (!res.ok) {
            logger.warn('[opencode] Poll returned non-OK', { sessionId, status: res.status });
            continue;
        }

        const messages: Array<{ role: string; parts: Array<{ type: string; text?: string }> }> = await res.json();
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        if (assistantMessages.length > 0) {
            const last = assistantMessages[assistantMessages.length - 1];
            const text = last.parts
                .filter(p => p.type === 'text' && p.text)
                .map(p => p.text)
                .join('\n');
            if (text) return text;
        }
    }

    return '[opencode] Task timed out — the prompt may need to be broken into smaller steps.';
}
