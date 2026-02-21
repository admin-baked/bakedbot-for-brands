/**
 * Approval System Slack Notifications
 * Sends notifications to #linus-approvals channel for approval events
 */

import { logger } from '@/lib/logger';
import type { ApprovalRequest, ApprovalOperationType } from './approval-queue';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_LINUS_APPROVALS || process.env.SLACK_WEBHOOK_URL;

// Risk level to emoji mapping
const RISK_EMOJIS: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
};

// Operation type to icon mapping
const OPERATION_ICONS: Record<string, string> = {
    cloud_scheduler_create: '⏱️',
    cloud_scheduler_delete: '⏱️',
    cloud_scheduler_modify: '⏱️',
    secret_rotate: '🔑',
    firestore_delete_collection: '🗑️',
    iam_role_change: '👤',
    payment_config_change: '💳',
    environment_variable_change: '⚙️',
    service_account_key_rotate: '🔐',
    database_migration: '📊',
};

/**
 * Send new approval request notification to Slack
 */
export async function notifyNewApprovalRequest(approval: ApprovalRequest, dashboardUrl: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        logger.warn('[ApprovalNotifications] SLACK_WEBHOOK_LINUS_APPROVALS not configured, skipping notification');
        return;
    }

    try {
        const riskEmoji = RISK_EMOJIS[approval.operationDetails.riskLevel] || '❓';
        const operationIcon = OPERATION_ICONS[approval.operationType] || '⚙️';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${operationIcon} New Approval Request`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Operation Type*\n${approval.operationType.replace(/_/g, ' ')}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Risk Level*\n${riskEmoji} ${approval.operationDetails.riskLevel.toUpperCase()}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Resource*\n${approval.operationDetails.targetResource}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Action*\n${approval.operationDetails.action}`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Reason*\n${approval.operationDetails.reason}`
                }
            },
            ...(approval.operationDetails.estimatedCost ? [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Estimated Monthly Cost*\n$${approval.operationDetails.estimatedCost.estimatedMonthly.toFixed(2)}`
                    }
                }
            ] : []),
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Requested by*\n${approval.requestedBy}\n*Timestamp*\n<!date^${Math.floor(approval.createdAt.toDate().getTime() / 1000)}^{date_num} {time_secs}|${approval.createdAt.toDate().toISOString()}>`
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '📋 Review in Dashboard',
                            emoji: true
                        },
                        url: dashboardUrl,
                        action_id: 'view_approval_details'
                    }
                ]
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Request ID: \`${approval.id}\` • Auto-expires in 7 days`
                    }
                ]
            }
        ];

        await sendSlackNotification(blocks, 'New Approval Request');
    } catch (error) {
        logger.error('[ApprovalNotifications] Failed to send new request notification', {
            error: error instanceof Error ? error.message : String(error),
            requestId: approval.id
        });
    }
}

/**
 * Send approval notification to Slack
 */
export async function notifyApprovalApproved(approval: ApprovalRequest, approverEmail: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        logger.warn('[ApprovalNotifications] SLACK_WEBHOOK_LINUS_APPROVALS not configured, skipping notification');
        return;
    }

    try {
        const operationIcon = OPERATION_ICONS[approval.operationType] || '⚙️';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `✅ ${operationIcon} Approval Granted`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Operation*\n${approval.operationType.replace(/_/g, ' ')}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Resource*\n${approval.operationDetails.targetResource}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Approved By*\n${approverEmail}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Timestamp*\n<!date^${Math.floor((approval.approvalTimestamp?.toDate().getTime() || 0) / 1000)}^{date_num} {time_secs}|${approval.approvalTimestamp?.toDate().toISOString()}>`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `✅ Operation has been approved and will execute shortly.`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Request ID: \`${approval.id}\``
                    }
                ]
            }
        ];

        await sendSlackNotification(blocks, 'Approval Granted');
    } catch (error) {
        logger.error('[ApprovalNotifications] Failed to send approval notification', {
            error: error instanceof Error ? error.message : String(error),
            requestId: approval.id
        });
    }
}

/**
 * Send rejection notification to Slack
 */
export async function notifyApprovalRejected(approval: ApprovalRequest, rejectorEmail: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        logger.warn('[ApprovalNotifications] SLACK_WEBHOOK_LINUS_APPROVALS not configured, skipping notification');
        return;
    }

    try {
        const operationIcon = OPERATION_ICONS[approval.operationType] || '⚙️';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `❌ ${operationIcon} Approval Rejected`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Operation*\n${approval.operationType.replace(/_/g, ' ')}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Resource*\n${approval.operationDetails.targetResource}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Rejected By*\n${rejectorEmail}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Timestamp*\n<!date^${Math.floor((approval.approvalTimestamp?.toDate().getTime() || 0) / 1000)}^{date_num} {time_secs}|${approval.approvalTimestamp?.toDate().toISOString()}>`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Reason*\n${approval.rejectionReason || 'No reason provided'}`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Request ID: \`${approval.id}\` • Operation will not proceed`
                    }
                ]
            }
        ];

        await sendSlackNotification(blocks, 'Approval Rejected');
    } catch (error) {
        logger.error('[ApprovalNotifications] Failed to send rejection notification', {
            error: error instanceof Error ? error.message : String(error),
            requestId: approval.id
        });
    }
}

/**
 * Send execution notification to Slack
 */
export async function notifyApprovalExecuted(approval: ApprovalRequest): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        logger.warn('[ApprovalNotifications] SLACK_WEBHOOK_LINUS_APPROVALS not configured, skipping notification');
        return;
    }

    try {
        const operationIcon = OPERATION_ICONS[approval.operationType] || '⚙️';
        const isSuccess = approval.execution?.result === 'success';
        const emoji = isSuccess ? '⚡' : '💥';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${emoji} ${operationIcon} Execution ${isSuccess ? 'Complete' : 'Failed'}`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Operation*\n${approval.operationType.replace(/_/g, ' ')}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Resource*\n${approval.operationDetails.targetResource}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Executed By*\n${approval.execution?.executedBy || 'linus-agent'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Timestamp*\n<!date^${Math.floor((approval.execution?.executedAt?.toDate().getTime() || 0) / 1000)}^{date_num} {time_secs}|${approval.execution?.executedAt?.toDate().toISOString()}>`
                    }
                ]
            },
            ...(approval.execution?.error ? [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Error*\n\`\`\`${approval.execution.error.slice(0, 300)}${approval.execution.error.length > 300 ? '...' : ''}\`\`\``
                    }
                }
            ] : []),
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Request ID: \`${approval.id}\` • Status: ${approval.status}`
                    }
                ]
            }
        ];

        await sendSlackNotification(blocks, `Execution ${isSuccess ? 'Successful' : 'Failed'}`);
    } catch (error) {
        logger.error('[ApprovalNotifications] Failed to send execution notification', {
            error: error instanceof Error ? error.message : String(error),
            requestId: approval.id
        });
    }
}

/**
 * Generic Slack notification sender
 */
async function sendSlackNotification(blocks: any[], title: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        throw new Error('SLACK_WEBHOOK_LINUS_APPROVALS not configured');
    }

    const payload = {
        text: title,
        blocks
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }

    logger.info('[ApprovalNotifications] Slack notification sent', { title });
}

export { SLACK_WEBHOOK_URL };
