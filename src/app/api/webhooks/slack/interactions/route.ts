/**
 * Slack Interactive Components Handler
 * Processes button clicks, select menu changes, modal submissions, etc.
 *
 * Slack sends interactive payloads as form-encoded with a 'payload' field containing JSON
 * Example payload:
 * {
 *   type: 'block_actions',
 *   actions: [{ type: 'button', action_id: 'approve_action', value: 'approval-id-123' }],
 *   user: { id: 'U123456', username: 'john.doe' },
 *   channel: { id: 'C123456', name: 'general' },
 *   team: { id: 'T123456' },
 *   response_url: 'https://hooks.slack.com/...',
 *   trigger_id: 'trigger123'
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';
import {
    getApprovalRequest,
    approveAction,
    rejectAction,
    formatApprovalConfirmationBlocks,
} from '@/server/services/slack-approval';
import { slackService } from '@/server/services/communications/slack';

export const dynamic = 'force-dynamic';

/**
 * Verify Slack request signature (same as events handler)
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
    const mySignature =
        'v0=' +
        createHmac('sha256', signingSecret)
            .update(sigBasestring, 'utf8')
            .digest('hex');

    try {
        const myBuf = Buffer.from(mySignature, 'utf8');
        const slackBuf = Buffer.from(slackSignature, 'utf8');
        if (myBuf.length !== slackBuf.length) return false;
        return mySignature === slackSignature;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const rawBody = await request.text();

    // Verify Slack signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        logger.error('[Slack/Interactions] SLACK_SIGNING_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const timestamp = request.headers.get('x-slack-request-timestamp') ?? '';
    const slackSignature = request.headers.get('x-slack-signature') ?? '';

    if (!verifySlackSignature(signingSecret, rawBody, timestamp, slackSignature)) {
        logger.warn('[Slack/Interactions] Signature verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form-encoded payload
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
        logger.warn('[Slack/Interactions] No payload in request');
        return NextResponse.json({ error: 'No payload' }, { status: 400 });
    }

    let payload: any;
    try {
        payload = JSON.parse(payloadStr);
    } catch (e: any) {
        logger.error('[Slack/Interactions] Failed to parse payload', { error: e.message });
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // ACK immediately (required within 3 seconds)
    const ack = NextResponse.json({ ok: true });

    // Fire-and-forget processing
    Promise.resolve()
        .then(async () => {
            // Handle block_actions (button clicks)
            if (payload.type === 'block_actions') {
                await handleBlockActions(payload);
            } else {
                logger.info('[Slack/Interactions] Unhandled payload type', {
                    type: payload.type,
                });
            }
        })
        .catch((err: any) => {
            logger.error('[Slack/Interactions] Processing failed', {
                error: err.message,
            });
        });

    return ack;
}

/**
 * Handle block_actions (button clicks from approval messages)
 */
async function handleBlockActions(payload: any): Promise<void> {
    const actions = payload.actions || [];
    const userId = payload.user?.id;
    const channel = payload.channel?.id;
    const responseUrl = payload.response_url;

    logger.info('[Slack/Interactions] Block action from user', {
        userId,
        actionCount: actions.length,
    });

    for (const action of actions) {
        const actionId = action.action_id;
        const value = action.value; // approvalId

        if (!value) {
            logger.warn('[Slack/Interactions] No value in action', { actionId });
            continue;
        }

        // Get the approval request
        const approval = await getApprovalRequest(value);
        if (!approval) {
            logger.warn('[Slack/Interactions] Approval request not found', {
                approvalId: value,
            });
            await sendErrorResponse(responseUrl, 'Approval request not found or expired');
            continue;
        }

        // Handle approve/reject
        if (actionId === 'approve_action') {
            await handleApproveAction(approval, userId, channel, responseUrl);
        } else if (actionId === 'reject_action') {
            await handleRejectAction(approval, userId, channel, responseUrl);
        } else {
            logger.warn('[Slack/Interactions] Unknown action', { actionId });
        }
    }
}

/**
 * Handle approval button click
 */
async function handleApproveAction(
    approval: any,
    reviewerSlackId: string,
    channel: string,
    responseUrl: string
): Promise<void> {
    try {
        // Mark as approved in Firestore
        await approveAction(approval.id, reviewerSlackId);

        // Update the approval message to show approval confirmation
        if (approval.slackApprovalMessageTs) {
            const confirmationBlocks = formatApprovalConfirmationBlocks(
                true,
                approval.agentName,
                reviewerSlackId
            );
            await slackService.updateMessage(
                approval.slackChannel,
                approval.slackApprovalMessageTs,
                `✅ Approved by <@${reviewerSlackId}>`,
                confirmationBlocks
            );
        }

        // Send confirmation via response_url
        await sendSuccessResponse(
            responseUrl,
            `✅ Approved! ${approval.agentName} can now execute this action.`
        );

        logger.info('[Slack/Interactions] Action approved', {
            approvalId: approval.id,
            reviewer: reviewerSlackId,
        });
    } catch (error: any) {
        logger.error('[Slack/Interactions] Failed to approve action', {
            approvalId: approval.id,
            error: error.message,
        });
        await sendErrorResponse(responseUrl, 'Failed to approve action. Please try again.');
    }
}

/**
 * Handle rejection button click
 */
async function handleRejectAction(
    approval: any,
    reviewerSlackId: string,
    channel: string,
    responseUrl: string
): Promise<void> {
    try {
        // Mark as rejected in Firestore
        await rejectAction(approval.id, reviewerSlackId, 'Rejected by user');

        // Update the approval message to show rejection confirmation
        if (approval.slackApprovalMessageTs) {
            const confirmationBlocks = formatApprovalConfirmationBlocks(
                false,
                approval.agentName,
                reviewerSlackId
            );
            await slackService.updateMessage(
                approval.slackChannel,
                approval.slackApprovalMessageTs,
                `❌ Rejected by <@${reviewerSlackId}>`,
                confirmationBlocks
            );
        }

        // Send confirmation via response_url
        await sendSuccessResponse(responseUrl, '❌ Action has been rejected.');

        logger.info('[Slack/Interactions] Action rejected', {
            approvalId: approval.id,
            reviewer: reviewerSlackId,
        });
    } catch (error: any) {
        logger.error('[Slack/Interactions] Failed to reject action', {
            approvalId: approval.id,
            error: error.message,
        });
        await sendErrorResponse(responseUrl, 'Failed to reject action. Please try again.');
    }
}

/**
 * Send success response via response_url
 */
async function sendSuccessResponse(responseUrl: string, text: string): Promise<void> {
    if (!responseUrl) return;

    try {
        await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                response_type: 'ephemeral',
                text,
            }),
        });
    } catch (error: any) {
        logger.error('[Slack/Interactions] Failed to send response', {
            error: error.message,
        });
    }
}

/**
 * Send error response via response_url
 */
async function sendErrorResponse(responseUrl: string, text: string): Promise<void> {
    if (!responseUrl) return;

    try {
        await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                response_type: 'ephemeral',
                text: `⚠️ ${text}`,
            }),
        });
    } catch (error: any) {
        logger.error('[Slack/Interactions] Failed to send error response', {
            error: error.message,
        });
    }
}
