'use server';

/**
 * Heartbeat Notifier
 *
 * Dispatches heartbeat alerts to various channels (dashboard, email, SMS, WhatsApp).
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    HeartbeatChannel,
    HeartbeatCheckResult,
    HeartbeatNotification,
} from '@/types/heartbeat';

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

function formatResultsForText(results: HeartbeatCheckResult[]): string {
    return results
        .map(r => {
            const icon = r.status === 'alert' ? '🚨' : r.status === 'warning' ? '⚠️' : '📊';
            return `${icon} ${r.title}\n   ${r.message}`;
        })
        .join('\n\n');
}

function formatResultsForHTML(results: HeartbeatCheckResult[]): string {
    return results
        .map(r => {
            const color = r.status === 'alert' ? '#dc2626' : r.status === 'warning' ? '#f59e0b' : '#10b981';
            return `
                <div style="border-left: 4px solid ${color}; padding: 12px; margin-bottom: 12px; background: #f9fafb;">
                    <h3 style="margin: 0 0 4px 0; color: ${color};">${r.title}</h3>
                    <p style="margin: 0; color: #374151;">${r.message}</p>
                    ${r.actionUrl ? `<a href="${r.actionUrl}" style="color: #2563eb; text-decoration: none;">${r.actionLabel || 'View Details'} →</a>` : ''}
                </div>
            `;
        })
        .join('');
}

// =============================================================================
// CHANNEL DISPATCHERS
// =============================================================================

async function sendDashboardNotification(
    tenantId: string,
    userId: string,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    const db = getAdminFirestore();

    try {
        // Create a notification in the user's inbox
        await db
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .add({
                type: 'heartbeat',
                title: `${results.length} Item${results.length > 1 ? 's' : ''} Need Attention`,
                message: results.map(r => r.title).join(', '),
                results,
                read: false,
                createdAt: new Date(),
            });

        return true;
    } catch (error) {
        logger.error('[Heartbeat] Dashboard notification failed', { error, tenantId, userId });
        return false;
    }
}

async function sendEmailNotification(
    tenantId: string,
    userId: string,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    try {
        const db = getAdminFirestore();

        // Get user email
        const userSnap = await db.collection('users').doc(userId).get();
        const userEmail = userSnap.data()?.email;

        if (!userEmail) {
            logger.warn('[Heartbeat] No email for user', { userId });
            return false;
        }

        // Import email dispatcher
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');

        const urgentCount = results.filter(r => r.priority === 'urgent' || r.priority === 'high').length;
        const subject = urgentCount > 0
            ? `🚨 ${urgentCount} Urgent Alert${urgentCount > 1 ? 's' : ''} from BakedBot`
            : `📊 BakedBot Status Update: ${results.length} Item${results.length > 1 ? 's' : ''}`;

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>BakedBot Heartbeat</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #111827; font-size: 24px;">BakedBot Status Update</h1>
                <p style="color: #6b7280; margin-bottom: 24px;">Your agents found ${results.length} item${results.length > 1 ? 's' : ''} that need${results.length === 1 ? 's' : ''} your attention.</p>

                ${formatResultsForHTML(results)}

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #9ca3af; font-size: 12px;">
                    You're receiving this because heartbeat notifications are enabled.
                    <a href="https://bakedbot.ai/dashboard/settings?tab=notifications" style="color: #6b7280;">Manage preferences</a>
                </p>
            </body>
            </html>
        `;

        const result = await sendGenericEmail({
            to: userEmail,
            subject,
            htmlBody,
            textBody: formatResultsForText(results),
            fromName: 'BakedBot AI',
        });

        return result.success;
    } catch (error) {
        logger.error('[Heartbeat] Email notification failed', { error, tenantId, userId });
        return false;
    }
}

async function sendSMSNotification(
    tenantId: string,
    userId: string,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    try {
        const db = getAdminFirestore();

        // Get user phone
        const userSnap = await db.collection('users').doc(userId).get();
        const userPhone = userSnap.data()?.phone;

        if (!userPhone) {
            logger.warn('[Heartbeat] No phone for user', { userId });
            return false;
        }

        // Only send SMS for urgent/high priority
        const urgent = results.filter(r => r.priority === 'urgent' || r.priority === 'high');
        if (urgent.length === 0) {
            return true; // Skip non-urgent for SMS
        }

        const { blackleafService } = await import('@/lib/notifications/blackleaf-service');

        const message = `🚨 BakedBot Alert: ${urgent.length} urgent item${urgent.length > 1 ? 's' : ''} need attention.\n\n${urgent.map(r => `• ${r.title}`).join('\n')}\n\nView: bakedbot.ai/dashboard`;

        const success = await blackleafService.sendCustomMessage(userPhone, message);
        return success;
    } catch (error) {
        logger.error('[Heartbeat] SMS notification failed', { error, tenantId, userId });
        return false;
    }
}

async function sendWhatsAppNotification(
    tenantId: string,
    userId: string,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    try {
        const { sendMessage, isOpenClawAvailable, getSessionStatus } = await import('@/server/services/openclaw');

        if (!isOpenClawAvailable()) {
            logger.debug('[Heartbeat] WhatsApp not available');
            return false;
        }

        const status = await getSessionStatus();
        if (!status.success || !status.data?.connected) {
            logger.debug('[Heartbeat] WhatsApp not connected');
            return false;
        }

        const db = getAdminFirestore();
        const userSnap = await db.collection('users').doc(userId).get();
        const userPhone = userSnap.data()?.phone;

        if (!userPhone) {
            return false;
        }

        // Only send WhatsApp for urgent
        const urgent = results.filter(r => r.priority === 'urgent');
        if (urgent.length === 0) {
            return true;
        }

        const message = `🚨 *BakedBot Urgent Alert*\n\n${urgent.map(r => `• *${r.title}*\n  ${r.message}`).join('\n\n')}\n\n👉 Check your dashboard: bakedbot.ai/dashboard`;

        const result = await sendMessage({
            to: userPhone,
            message,
        });

        return result.success;
    } catch (error) {
        logger.error('[Heartbeat] WhatsApp notification failed', { error, tenantId, userId });
        return false;
    }
}

// =============================================================================
// MAIN DISPATCHER
// =============================================================================

export async function dispatchNotifications(
    tenantId: string,
    userId: string,
    executionId: string,
    results: HeartbeatCheckResult[],
    channels: HeartbeatChannel[]
): Promise<HeartbeatNotification[]> {
    const notifications: HeartbeatNotification[] = [];
    const db = getAdminFirestore();

    for (const channel of channels) {
        let success = false;
        let error: string | undefined;

        try {
            switch (channel) {
                case 'dashboard':
                    success = await sendDashboardNotification(tenantId, userId, results);
                    break;
                case 'email':
                    success = await sendEmailNotification(tenantId, userId, results);
                    break;
                case 'sms':
                    success = await sendSMSNotification(tenantId, userId, results);
                    break;
                case 'whatsapp':
                    success = await sendWhatsAppNotification(tenantId, userId, results);
                    break;
                case 'push':
                    // TODO: Implement push notifications
                    success = false;
                    error = 'Push notifications not yet implemented';
                    break;
            }
        } catch (err) {
            success = false;
            error = err instanceof Error ? err.message : 'Unknown error';
        }

        const notification: HeartbeatNotification = {
            id: '', // Will be set by Firestore
            tenantId,
            userId,
            executionId,
            channel,
            results,
            sentAt: new Date(),
            status: success ? 'sent' : 'failed',
            error,
        };

        // Save notification record
        try {
            const docRef = await db.collection('heartbeat_notifications').add({
                ...notification,
                sentAt: new Date(),
            });
            notification.id = docRef.id;
        } catch (err) {
            logger.error('[Heartbeat] Failed to save notification record', { err });
        }

        notifications.push(notification);
    }

    return notifications;
}
