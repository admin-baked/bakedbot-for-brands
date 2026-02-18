/**
 * Slack Approval Workflows
 * Detects high-risk agent actions and routes them through human approval before execution
 */

import { Timestamp } from '@google-cloud/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { AgentResult } from '@/server/agents/agent-runner';

let firestore: ReturnType<typeof getAdminFirestore> | null = null;

function getFirestore() {
    if (!firestore) {
        firestore = getAdminFirestore();
    }
    return firestore;
}

// ============================================================================
// Types
// ============================================================================

export interface RiskAssessment {
    isRisky: boolean;
    riskLevel?: 'high' | 'medium';
    riskReason?: string;
    riskType?: string;
}

export interface SlackPendingApproval {
    id?: string;
    agentId: string;
    agentName: string;
    tool: string;
    args: Record<string, any>;
    userRequest: string;
    agentResponse: string;
    riskReason: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    slackChannel: string;
    slackThreadTs: string;
    slackApprovalMessageTs: string;
    requestedBy: string;
    slackUserId?: string;  // Same as requestedBy
    reviewedBy?: string;
    reviewedAt?: Timestamp;
    rejectionReason?: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
}

// ============================================================================
// Risk Detection
// ============================================================================

const RISK_KEYWORDS = {
    sms: ['send sms', 'send text', 'text message', 'bulk sms', 'sms campaign'],
    email: ['send email', 'email campaign', 'blast', 'email newsletter'],
    discount: ['discount', 'promo code', 'apply %', '% off', '% discount'],
    delete: ['delete', 'remove customer', 'purge', 'erase'],
    playbook: ['create playbook', 'automate', 'schedule campaign'],
};

const RISKY_TOOLS = ['sendSms', 'sendEmail', 'createPlaybook', 'deleteCustomer', 'bulkUpdate'];

/**
 * Detect if an agent action is high-risk and requires approval
 */
export function detectRiskyAction(
    content: string,
    toolCalls?: AgentResult['toolCalls']
): RiskAssessment {
    if (!content) {
        return { isRisky: false };
    }

    const lowerContent = content.toLowerCase();

    // Check for risky keywords in agent response
    for (const [riskType, keywords] of Object.entries(RISK_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerContent.includes(keyword)) {
                return {
                    isRisky: true,
                    riskLevel: 'high',
                    riskType,
                    riskReason: `${riskType.charAt(0).toUpperCase() + riskType.slice(1)} action detected in response`,
                };
            }
        }
    }

    // Check for risky tool calls
    if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
            if (RISKY_TOOLS.includes(toolCall.name)) {
                return {
                    isRisky: true,
                    riskLevel: 'high',
                    riskType: 'tool_call',
                    riskReason: `High-risk tool invoked: ${toolCall.name}`,
                };
            }
        }
    }

    return { isRisky: false };
}

// ============================================================================
// Approval Storage
// ============================================================================

export interface CreateApprovalParams {
    agentId: string;
    agentName: string;
    tool: string;
    args: Record<string, any>;
    userRequest: string;
    agentResponse: string;
    riskReason: string;
    slackChannel: string;
    slackThreadTs: string;
    requestedBy: string;
}

/**
 * Store a pending approval request in Firestore
 */
export async function createApprovalRequest(params: CreateApprovalParams): Promise<string> {
    const docRef = getFirestore().collection('slack_pending_approvals').doc();
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 86400, now.nanoseconds); // 24h TTL

    const approval: SlackPendingApproval = {
        id: docRef.id,
        agentId: params.agentId,
        agentName: params.agentName,
        tool: params.tool,
        args: params.args,
        userRequest: params.userRequest,
        agentResponse: params.agentResponse,
        riskReason: params.riskReason,
        status: 'pending',
        slackChannel: params.slackChannel,
        slackThreadTs: params.slackThreadTs,
        slackApprovalMessageTs: '', // Will be set when message is posted
        requestedBy: params.requestedBy,
        createdAt: now,
        expiresAt,
    };

    try {
        await docRef.set(approval);
        logger.info('[SlackApproval] Created approval request', {
            approvalId: docRef.id,
            agentId: params.agentId,
            tool: params.tool,
            riskReason: params.riskReason,
        });
        return docRef.id;
    } catch (error: any) {
        logger.error('[SlackApproval] Failed to create approval request', {
            error: error.message,
        });
        throw error;
    }
}

/**
 * Update the approval message timestamp (called after posting the Slack message)
 */
export async function setApprovalMessageTs(approvalId: string, messageTs: string): Promise<void> {
    try {
        await getFirestore().collection('slack_pending_approvals').doc(approvalId).update({
            slackApprovalMessageTs: messageTs,
        });
    } catch (error: any) {
        logger.error('[SlackApproval] Failed to update message ts', {
            approvalId,
            error: error.message,
        });
    }
}

/**
 * Get an approval request by ID
 */
export async function getApprovalRequest(approvalId: string): Promise<SlackPendingApproval | null> {
    try {
        const doc = await getFirestore().collection('slack_pending_approvals').doc(approvalId).get();
        if (!doc.exists) {
            return null;
        }
        return { id: doc.id, ...doc.data() } as SlackPendingApproval;
    } catch (error: any) {
        logger.error('[SlackApproval] Failed to retrieve approval request', {
            approvalId,
            error: error.message,
        });
        return null;
    }
}

/**
 * Approve an action and mark it as approved in Firestore
 */
export async function approveAction(
    approvalId: string,
    reviewerSlackId: string
): Promise<void> {
    try {
        const now = Timestamp.now();
        await getFirestore().collection('slack_pending_approvals').doc(approvalId).update({
            status: 'approved',
            reviewedBy: reviewerSlackId,
            reviewedAt: now,
        });
        logger.info('[SlackApproval] Action approved', {
            approvalId,
            reviewedBy: reviewerSlackId,
        });
    } catch (error: any) {
        logger.error('[SlackApproval] Failed to approve action', {
            approvalId,
            error: error.message,
        });
        throw error;
    }
}

/**
 * Reject an action and mark it as rejected in Firestore
 */
export async function rejectAction(
    approvalId: string,
    reviewerSlackId: string,
    reason?: string
): Promise<void> {
    try {
        const now = Timestamp.now();
        await getFirestore().collection('slack_pending_approvals').doc(approvalId).update({
            status: 'rejected',
            reviewedBy: reviewerSlackId,
            reviewedAt: now,
            rejectionReason: reason || 'Rejected by user',
        });
        logger.info('[SlackApproval] Action rejected', {
            approvalId,
            reviewedBy: reviewerSlackId,
            reason,
        });
    } catch (error: any) {
        logger.error('[SlackApproval] Failed to reject action', {
            approvalId,
            error: error.message,
        });
        throw error;
    }
}

// ============================================================================
// Block Kit Formatting
// ============================================================================

/**
 * Format an approval request as Slack Block Kit blocks with Approve/Reject buttons
 */
export function formatApprovalBlocks(
    agentName: string,
    userRequest: string,
    agentResponse: string,
    riskReason: string,
    approvalId: string
): any[] {
    return [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: '⚠️ Approval Required',
                emoji: true,
            },
        },
        {
            type: 'divider',
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Agent:*\n${agentName}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Risk Level:*\nHIGH`,
                },
            ],
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*What was requested:*\n\`\`\`${userRequest}\`\`\``,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*What ${agentName} proposes:*\n${agentResponse.slice(0, 500)}${agentResponse.length > 500 ? '...' : ''}`,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Why it needs approval:*\n${riskReason}`,
            },
        },
        {
            type: 'divider',
        },
        {
            type: 'actions',
            block_id: 'approval_actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '✅ Approve',
                        emoji: true,
                    },
                    style: 'primary',
                    action_id: 'approve_action',
                    value: approvalId,
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: '❌ Reject',
                        emoji: true,
                    },
                    style: 'danger',
                    action_id: 'reject_action',
                    value: approvalId,
                },
            ],
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: '⏱️ Expires in 24 hours • Posted by *BakedBot AI*',
                },
            ],
        },
    ];
}

/**
 * Format a confirmation message after approval
 */
export function formatApprovalConfirmationBlocks(
    approved: boolean,
    agentName: string,
    reviewerName: string
): any[] {
    if (approved) {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `✅ *Approved* by <@${reviewerName}>\n${agentName} can now execute this action.`,
                },
            },
        ];
    } else {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `❌ *Rejected* by <@${reviewerName}>\nAction has been cancelled.`,
                },
            },
        ];
    }
}
