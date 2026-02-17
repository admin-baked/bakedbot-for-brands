import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { processSlackMessage } from '@/server/services/slack-agent-bridge';

// Force dynamic - never cache webhook handlers
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Slack signature verification
// ---------------------------------------------------------------------------

function verifySlackSignature(
    signingSecret: string,
    rawBody: string,
    timestamp: string,
    slackSignature: string
): boolean {
    // Reject if timestamp is more than 5 minutes old (replay attack prevention)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
        return false;
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature = 'v0=' + createHmac('sha256', signingSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');

    try {
        const myBuf = Buffer.from(mySignature, 'utf8');
        const slackBuf = Buffer.from(slackSignature, 'utf8');
        // Must be same length for timingSafeEqual
        if (myBuf.length !== slackBuf.length) return false;
        return timingSafeEqual(myBuf, slackBuf);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/slack/events
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (!signingSecret) {
        logger.error('[Slack/Events] SLACK_SIGNING_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Read raw body for signature verification
    const rawBody = await req.text();

    const timestamp = req.headers.get('x-slack-request-timestamp') ?? '';
    const slackSignature = req.headers.get('x-slack-signature') ?? '';

    if (!verifySlackSignature(signingSecret, rawBody, timestamp, slackSignature)) {
        logger.warn('[Slack/Events] Signature verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ---------------------------------------------------------------------------
    // URL Verification Challenge (one-time, when you first set the Events URL)
    // ---------------------------------------------------------------------------
    if (body.type === 'url_verification') {
        logger.info('[Slack/Events] URL verification challenge received');
        return NextResponse.json({ challenge: body.challenge });
    }

    // ---------------------------------------------------------------------------
    // Event Callback
    // ---------------------------------------------------------------------------
    if (body.type !== 'event_callback') {
        return NextResponse.json({ ok: true });
    }

    const event = body.event;

    // ACK immediately — Slack requires a response within 3 seconds
    // We fire-and-forget the heavy processing
    const response = NextResponse.json({ ok: true });

    // Skip messages from bots (prevents infinite loop with our own replies)
    if (event.bot_id || event.subtype === 'bot_message') {
        return response;
    }

    // Only handle app_mention and direct messages
    if (event.type !== 'app_mention' && event.type !== 'message') {
        return response;
    }

    // For message events, only handle DMs (channel type 'im')
    if (event.type === 'message' && body.event?.channel_type !== 'im') {
        return response;
    }

    const text: string = event.text ?? '';
    const slackUserId: string = event.user ?? '';
    const channel: string = event.channel ?? '';
    const threadTs: string = event.thread_ts ?? event.ts ?? '';
    const channelName: string = event.channel_name ?? '';
    const isDm = body.event?.channel_type === 'im';

    if (!text || !channel) {
        return response;
    }

    // Fire-and-forget: process asynchronously so we don't block the ACK
    Promise.resolve().then(async () => {
        try {
            await processSlackMessage({ text, slackUserId, channel, threadTs, channelName, isDm });
        } catch (err: any) {
            logger.error('[Slack/Events] Background processing error:', err.message);
        }
    });

    return response;
}

// Handle Slack's retry mechanism — always 200 to prevent spam retries
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({ ok: true, service: 'BakedBot Slack Events' });
}
