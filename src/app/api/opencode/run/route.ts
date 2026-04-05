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
 *   { prompt: string, model?: string }
 *
 * Response:
 *   { success: true, result: string, model: string }
 *
 * Models (set via `model` field):
 *   google/gemini-2.0-flash      — fast, cheap (default)
 *   google/gemini-2.5-pro        — most capable Google
 *   anthropic/claude-haiku-4-5   — fast, cheap Anthropic
 *   anthropic/claude-sonnet-4-6  — most capable Anthropic (billed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const OPENCODE_AGENT_URL = process.env.OPENCODE_AGENT_URL;

const DEFAULT_MODEL = 'google/gemini-2.0-flash';
// 55s — stays under Next.js 60s default route timeout
const OPENCODE_TIMEOUT_MS = 55_000;

// Precompute Basic auth header once at module init (password is static per instance)
const OPENCODE_HEADERS: Record<string, string> = (() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const password = (process.env.OPENCODE_SERVER_PASSWORD ?? '').replace(/[\r\n]/g, '');
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

    let body: { prompt: string; model?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.prompt?.trim()) {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const model = body.model ?? DEFAULT_MODEL;

    logger.info('[opencode] Dispatching task', {
        model,
        promptPreview: body.prompt.slice(0, 100),
    });

    try {
        const res = await fetch(`${OPENCODE_AGENT_URL}/run`, {
            method: 'POST',
            headers: OPENCODE_HEADERS,
            body: JSON.stringify({ prompt: body.prompt, model }),
            signal: AbortSignal.timeout(OPENCODE_TIMEOUT_MS),
        });

        if (!res.ok) {
            const err = await res.text();
            logger.error('[opencode] Cloud Run returned error', { status: res.status, err });
            return NextResponse.json({ error: `Opencode error: ${err}` }, { status: 502 });
        }

        const data: { result: string; model: string; exitCode: number } = await res.json();

        logger.info('[opencode] Task complete', { model, resultLength: data.result.length });
        return NextResponse.json({ success: true, result: data.result, model: data.model });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[opencode] Unexpected error', { error: message });
        return NextResponse.json({ error: `Opencode error: ${message}` }, { status: 500 });
    }
}

// Health check — proxies to Cloud Run /health
export async function GET() {
    if (!OPENCODE_AGENT_URL) {
        return NextResponse.json({ status: 'unconfigured' }, { status: 503 });
    }
    try {
        const res = await fetch(`${OPENCODE_AGENT_URL}/health`, {
            headers: OPENCODE_HEADERS,
            signal: AbortSignal.timeout(5_000),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.ok ? 200 : 502 });
    } catch {
        return NextResponse.json({ status: 'unreachable' }, { status: 503 });
    }
}
