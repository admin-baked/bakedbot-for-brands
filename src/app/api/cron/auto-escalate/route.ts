/**
 * POST /api/cron/auto-escalate
 *
 * Called by GitHub Actions workflows when monitoring detects a failure:
 *   - pulse.yaml: heartbeat non-200 → type: 'heartbeat'
 *   - synthetic-monitoring.yml: k6 p95 breach → type: 'latency'
 *
 * Returns 202 immediately. Escalation (bug filing + Slack + Linus) runs async
 * so GitHub Actions doesn't time out waiting for Linus to finish.
 *
 * Auth: CRON_SECRET (same pattern as all other cron routes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    escalateHeartbeatFailure,
    escalateLatencyBreach,
    type HeartbeatFailure,
    type LatencyBreach,
} from '@/server/services/auto-escalator';

export const dynamic = 'force-dynamic';

function authGuard(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[AutoEscalate] CRON_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
}

export async function POST(req: NextRequest) {
    const authError = authGuard(req);
    if (authError) return authError;

    let body: { type: string; data: Record<string, unknown> };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { type, data } = body;

    if (!type || !data) {
        return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    logger.info('[AutoEscalate] Received escalation request', { type });

    // Return 202 immediately — escalation runs async
    // GitHub Actions step gets a fast ACK without waiting for Linus analysis
    if (type === 'heartbeat') {
        const failure = data as unknown as HeartbeatFailure;
        setImmediate(() => void escalateHeartbeatFailure(failure).catch(err => {
            logger.error('[AutoEscalate] Heartbeat escalation failed', { error: String(err) });
        }));
        return NextResponse.json({ accepted: true, type: 'heartbeat', message: 'Escalation queued' }, { status: 202 });
    }

    if (type === 'latency') {
        const breach = data as unknown as LatencyBreach;
        setImmediate(() => void escalateLatencyBreach(breach).catch(err => {
            logger.error('[AutoEscalate] Latency escalation failed', { error: String(err) });
        }));
        return NextResponse.json({ accepted: true, type: 'latency', message: 'Escalation queued' }, { status: 202 });
    }

    return NextResponse.json({ error: `Unknown escalation type: ${type}` }, { status: 400 });
}

// GET for manual testing / curl
export async function GET(req: NextRequest) {
    const authError = authGuard(req);
    if (authError) return authError;

    const url = new URL(req.url);
    const testType = url.searchParams.get('test');

    if (testType === 'heartbeat') {
        logger.info('[AutoEscalate] Test heartbeat escalation triggered');
        setImmediate(() => void escalateHeartbeatFailure({
            httpStatus: 500,
            responseBody: '{"error":"Test escalation from GET /api/cron/auto-escalate?test=heartbeat"}',
            endpoint: 'https://bakedbot.ai/api/cron/tick',
            failedAt: new Date().toISOString(),
        }).catch(err => logger.error('[AutoEscalate] Test escalation error', { error: String(err) })));
        return NextResponse.json({ accepted: true, type: 'heartbeat', message: 'Test escalation queued' }, { status: 202 });
    }

    if (testType === 'latency') {
        logger.info('[AutoEscalate] Test latency escalation triggered');
        setImmediate(() => void escalateLatencyBreach({
            overallP95: 1250,
            endpoints: { health: 180, menu: 1250, llmTxt: 420 },
            breachedAt: new Date().toISOString(),
        }).catch(err => logger.error('[AutoEscalate] Test escalation error', { error: String(err) })));
        return NextResponse.json({ accepted: true, type: 'latency', message: 'Test escalation queued' }, { status: 202 });
    }

    return NextResponse.json({
        status: 'ok',
        usage: 'POST with { type: "heartbeat" | "latency", data: {...} }',
        test: 'GET ?test=heartbeat or ?test=latency',
    });
}
