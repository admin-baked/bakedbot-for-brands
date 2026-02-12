/**
 * Agent Notification Service
 *
 * Multi-channel dispatcher for agent-originated notifications.
 * Pattern modeled on heartbeat notifier, shared priority/channel types.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import type { InboxAgentPersona } from '@/types/inbox';
import type {
    AgentNotification,
    AgentNotificationType,
    AgentNotificationPriority,
    AgentNotificationChannel,
    DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/types/agent-notification';

// Agent display info (lightweight, no heavy imports)
const AGENT_EMOJI: Record<string, string> = {
    smokey: '🌿', craig: '📣', ezal: '👁️', deebo: '🛡️',
    money_mike: '💰', mrs_parker: '💜', pops: '📊', day_day: '🔍',
    leo: '⚙️', linus: '🔧', jack: '🤝', glenda: '✨',
    openclaw: '🦀', felisha: '👋', big_worm: '🐛', roach: '🪳',
    puff: '💨', general: '🤖', mike_exec: '💼',
};

// =============================================================================
// MAIN SEND FUNCTION
// =============================================================================

export async function sendAgentNotification(params: {
    orgId: string;
    userId: string;
    agent: InboxAgentPersona;
    type: AgentNotificationType;
    priority: AgentNotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    threadId?: string;
    campaignId?: string;
    heartbeatCheckId?: string;
    heartbeatExecutionId?: string;
    channels?: AgentNotificationChannel[];
    data?: Record<string, unknown>;
}): Promise<string | null> {
    const db = getAdminFirestore();

    try {
        // Determine channels: use provided or defaults based on priority
        const channels = params.channels || getDefaultChannels(params.priority);

        // Create notification document in subcollection
        const notifRef = db
            .collection('users')
            .doc(params.userId)
            .collection('agent_notifications')
            .doc();

        const notification: Omit<AgentNotification, 'id'> = {
            orgId: params.orgId,
            userId: params.userId,
            agent: params.agent,
            type: params.type,
            priority: params.priority,
            title: params.title,
            message: params.message,
            actionUrl: params.actionUrl,
            actionLabel: params.actionLabel,
            threadId: params.threadId,
            campaignId: params.campaignId,
            heartbeatCheckId: params.heartbeatCheckId as AgentNotification['heartbeatCheckId'],
            heartbeatExecutionId: params.heartbeatExecutionId,
            status: 'unread',
            channels,
            data: params.data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await notifRef.set(notification);

        logger.info('[AGENT_NOTIFIER] Notification created', {
            id: notifRef.id,
            agent: params.agent,
            type: params.type,
            priority: params.priority,
            channels,
        });

        // Dispatch to additional channels (fire-and-forget)
        if (channels.includes('email')) {
            dispatchEmail(params).catch(err =>
                logger.error('[AGENT_NOTIFIER] Email dispatch failed', { error: (err as Error).message })
            );
        }

        if (channels.includes('push')) {
            dispatchPush(params).catch(err =>
                logger.error('[AGENT_NOTIFIER] Push dispatch failed', { error: (err as Error).message })
            );
        }

        return notifRef.id;
    } catch (error) {
        logger.error('[AGENT_NOTIFIER] Failed to create notification', {
            error: (error as Error).message,
            agent: params.agent,
            type: params.type,
        });
        return null;
    }
}

// =============================================================================
// CHANNEL DISPATCHERS
// =============================================================================

function getDefaultChannels(priority: AgentNotificationPriority): AgentNotificationChannel[] {
    switch (priority) {
        case 'urgent': return ['dashboard', 'email', 'push'];
        case 'high': return ['dashboard', 'email'];
        case 'medium': return ['dashboard'];
        case 'low': return ['dashboard'];
    }
}

async function dispatchEmail(params: {
    userId: string;
    agent: InboxAgentPersona;
    type: AgentNotificationType;
    priority: AgentNotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    orgId: string;
}): Promise<void> {
    const db = getAdminFirestore();

    // Look up user email
    const userDoc = await db.collection('users').doc(params.userId).get();
    const email = userDoc.data()?.email;
    if (!email) return;

    const emoji = AGENT_EMOJI[params.agent] || '🤖';
    const agentName = params.agent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const htmlBody = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="padding: 20px; background: #f8fafc; border-radius: 8px;">
        <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">
            ${emoji} ${agentName} &middot; BakedBot AI
        </div>
        <h2 style="margin: 0 0 12px 0; color: #0f172a;">${params.title}</h2>
        <p style="margin: 0 0 16px 0; color: #475569;">${params.message}</p>
        ${params.actionUrl ? `
        <a href="${params.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            ${params.actionLabel || 'View Details'}
        </a>
        ` : ''}
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
        This is an automated notification from BakedBot AI. Manage your notification preferences in Settings.
    </p>
</div>`;

    await sendGenericEmail({
        to: email,
        subject: `${emoji} ${params.title}`,
        htmlBody,
        textBody: `${agentName}: ${params.title}\n\n${params.message}${params.actionUrl ? `\n\n${params.actionLabel || 'View'}: ${params.actionUrl}` : ''}`,
        orgId: params.orgId,
        communicationType: 'transactional',
        agentName: params.agent,
    });
}

async function dispatchPush(params: {
    userId: string;
    agent: InboxAgentPersona;
    title: string;
    message: string;
}): Promise<void> {
    try {
        const { sendPushNotification } = await import('@/lib/notifications/push-service');
        await sendPushNotification(params.userId, {
            title: params.title,
            body: params.message,
        });
    } catch {
        // Push service may not be configured — silently fail
    }
}
