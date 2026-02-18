import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { processSlackMessage, welcomeNewMember } from '@/server/services/slack-agent-bridge';

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
    const tsNum = parseInt(timestamp, 10);
    if (Math.abs(now - tsNum) > 300) {
        logger.warn(`[Slack/Events] Timestamp too old: now=${now}, ts=${tsNum}, diff=${Math.abs(now - tsNum)}`);
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
        if (myBuf.length !== slackBuf.length) {
            return false;
        }
        return timingSafeEqual(myBuf, slackBuf);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/slack/events
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
    // Read raw body first — needed for both challenge and signature verification
    const rawBody = await req.text();

    let body: any;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ---------------------------------------------------------------------------
    // URL Verification Challenge — handle BEFORE signature check so initial
    // setup works even before SLACK_SIGNING_SECRET is in the environment.
    // ---------------------------------------------------------------------------
    if (body.type === 'url_verification') {
        logger.info('[Slack/Events] URL verification challenge received');
        return NextResponse.json({ challenge: body.challenge });
    }

    // ---------------------------------------------------------------------------
    // All real events require signature verification
    // ---------------------------------------------------------------------------
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (!signingSecret) {
        logger.error('[Slack/Events] SLACK_SIGNING_SECRET not configured — rejecting event');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const timestamp = req.headers.get('x-slack-request-timestamp') ?? '';
    const slackSignature = req.headers.get('x-slack-signature') ?? '';

    if (!verifySlackSignature(signingSecret, rawBody, timestamp, slackSignature)) {
        logger.warn('[Slack/Events] Signature verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // -------------------------------------------------------------------------
    // member_joined_channel — Mrs. Parker welcomes new members
    // -------------------------------------------------------------------------
    if (event.type === 'member_joined_channel') {
        const joinedUserId: string = event.user ?? '';
        const channel: string = event.channel ?? '';
        if (joinedUserId && channel) {
            Promise.resolve().then(async () => {
                try {
                    await welcomeNewMember(joinedUserId, channel);
                } catch (err: any) {
                    logger.error('[Slack/Events] Welcome error:', err.message);
                }
            });
        }
        return response;
    }

    // -------------------------------------------------------------------------
    // Message events: app_mention, DMs (im), and channel messages
    // -------------------------------------------------------------------------
    if (event.type !== 'app_mention' && event.type !== 'message') {
        return response;
    }

    const channelType: string = body.event?.channel_type ?? '';
    const isDm = channelType === 'im';
    const isChannelMsg = channelType === 'channel';

    // Only handle DMs and public channel messages (not group DMs or private groups)
    if (event.type === 'message' && !isDm && !isChannelMsg) {
        return response;
    }

    const text: string = event.text ?? '';
    const slackUserId: string = event.user ?? '';
    const channel: string = event.channel ?? '';
    const threadTs: string = event.thread_ts ?? event.ts ?? '';
    const channelName: string = event.channel_name ?? '';

    if (!text || !channel) {
        return response;
    }

    // Fire-and-forget: process asynchronously so we don't block the ACK
    Promise.resolve().then(async () => {
        try {
            await processSlackMessage({
                text, slackUserId, channel, threadTs, channelName, isDm,
                isChannelMsg
            });
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
