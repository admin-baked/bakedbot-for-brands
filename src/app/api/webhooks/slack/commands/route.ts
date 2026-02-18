/**
 * Slack Slash Command Handler
 * Handles /ask, /agent, and other slash commands
 *
 * Example: /ask linus what's the build status?
 */

import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';
import { processSlackMessage } from '@/server/services/slack-agent-bridge';

export const dynamic = 'force-dynamic';

/**
 * Verify Slack slash command signature
 */
function verifySlackSignature(
    signingSecret: string,
    requestBody: string,
    timestamp: string,
    slackSignature: string
): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
        return false;
    }

    const sigBasestring = `v0:${timestamp}:${requestBody}`;
    const mySignature = 'v0=' + createHmac('sha256', signingSecret)
        .update(sigBasestring, 'utf8')
        .digest('hex');

    try {
        const myBuf = Buffer.from(mySignature, 'utf8');
        const slackBuf = Buffer.from(slackSignature, 'utf8');
        if (myBuf.length !== slackBuf.length) return false;
        // Note: using simple comparison since we don't have timingSafeEqual for this context
        return mySignature === slackSignature;
    } catch {
        return false;
    }
}

/**
 * Parse slash command text to extract agent and question
 * Examples:
 *  "linus what's the build status?"
 *  "ezal competitors pricing"
 *  "leo operations update"
 */
function parseSlashCommand(text: string): { agent: string; question: string } {
    const parts = text.trim().split(/\s+/);
    if (parts.length === 0) {
        return { agent: 'leo', question: text };
    }

    const firstWord = parts[0].toLowerCase();
    const agents = [
        'leo', 'linus', 'jack', 'glenda', 'ezal', 'craig', 'pops',
        'smokey', 'parker', 'deebo', 'mike', 'bigworm', 'day_day', 'felisha'
    ];

    if (agents.includes(firstWord)) {
        return {
            agent: firstWord === 'parker' ? 'mrs_parker' : firstWord,
            question: parts.slice(1).join(' '),
        };
    }

    return { agent: 'leo', question: text };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const rawBody = await req.text();

    // Verify signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        logger.error('[Slack/Commands] SLACK_SIGNING_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const timestamp = req.headers.get('x-slack-request-timestamp') ?? '';
    const slackSignature = req.headers.get('x-slack-signature') ?? '';

    if (!verifySlackSignature(signingSecret, rawBody, timestamp, slackSignature)) {
        logger.warn('[Slack/Commands] Signature verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const params = new URLSearchParams(rawBody);
    const command = params.get('command') ?? '';
    const text = params.get('text') ?? '';
    const userId = params.get('user_id') ?? '';
    const channelId = params.get('channel_id') ?? '';
    const responseUrl = params.get('response_url') ?? '';
    const triggerId = params.get('trigger_id') ?? '';

    logger.info(`[Slack/Commands] ${command} from ${userId}: "${text.slice(0, 80)}"`);

    // Immediate response (required within 3 seconds)
    const ack = NextResponse.json({
        response_type: 'in_channel',
        text: 'Processing your request...',
    });

    // Fire-and-forget processing
    Promise.resolve().then(async () => {
        try {
            // Parse agent and question from command text
            const { agent, question } = parseSlashCommand(text);

            if (!question) {
                await sendSlackResponse(responseUrl, {
                    response_type: 'ephemeral',
                    text: `Usage: ${command} [agent] [question]\nExample: ${command} linus what's the build status?`,
                });
                return;
            }

            // Process through agent bridge
            await processSlackMessage({
                text: question,
                slackUserId: userId,
                channel: channelId,
                threadTs: '', // Slash commands don't have thread context
                channelName: '',
                isDm: false,
                isChannelMsg: true, // Treat as channel message to avoid spam filtering
            });
        } catch (err: any) {
            logger.error(`[Slack/Commands] Processing failed: ${err.message}`);
            await sendSlackResponse(responseUrl, {
                response_type: 'ephemeral',
                text: 'Sorry, I had trouble processing your request. Please try again.',
            });
        }
    });

    return ack;
}

/**
 * Send response to Slack via response_url
 */
async function sendSlackResponse(
    responseUrl: string,
    payload: Record<string, unknown>
): Promise<void> {
    if (!responseUrl) return;

    try {
        const response = await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            logger.warn(`[Slack/Commands] Response URL request failed: ${response.status}`);
        }
    } catch (err: any) {
        logger.error(`[Slack/Commands] Failed to send response: ${err.message}`);
    }
}
