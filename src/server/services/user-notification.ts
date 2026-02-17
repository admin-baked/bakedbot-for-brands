/**
 * User Notification Service
 *
 * Sends email notifications for user lifecycle events:
 * - User approved (notification to user + org admin)
 * - User rejected (notification to user + org admin)
 * - User promoted to super user (notification to user)
 *
 * Uses Mailjet for email delivery with HTML templates
 */

import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { auditLogStreaming } from './audit-log-streaming';

export interface UserApprovalNotification {
    userId: string;
    userEmail: string;
    userName?: string;
    orgId: string;
    orgName?: string;
    approvedBy: string;
    templateId: 'user_approved' | 'user_rejected' | 'user_promoted';
    variables?: Record<string, string>;
}

class UserNotificationService {
    /**
     * Send user approval notification (user approved by admin)
     */
    async notifyUserApproved(userId: string, approvedBy: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();

            // Get user document
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                logger.error('[User Notification] User not found', { userId });
                return false;
            }

            const userData = userDoc.data();
            const userEmail = userData?.email;
            const userName = userData?.name || userData?.email;
            const orgId = userData?.orgId;

            if (!userEmail || !orgId) {
                logger.error('[User Notification] Missing user email or orgId', { userId });
                return false;
            }

            // Get org details for email context
            const orgDoc = await db.collection('tenants').doc(orgId).get();
            const orgName = orgDoc.exists ? orgDoc.data()?.name : orgId;

            // Get org admin email (for cc)
            const adminEmail = await this.getOrgAdminEmail(orgId);

            // Build approval email
            const emailPayload = {
                FromEmail: 'noreply@bakedbot.ai',
                FromName: 'BakedBot Admin',
                Subject: 'Welcome to BakedBot!',
                'Html-part': this.getApprovalEmailTemplate(userName, orgName),
                Recipients: [
                    { Email: userEmail, Name: userName },
                    ...(adminEmail ? [{ Email: adminEmail, Name: 'Org Admin' }] : []),
                ],
            };

            // Send via Mailjet
            const success = await this.sendEmailViaMailjet(emailPayload);

            if (success) {
                // Log notification to audit trail
                await auditLogStreaming.logAction(
                    'user_approval_notification_sent',
                    approvedBy,
                    userId,
                    'user',
                    'success',
                    { orgId, recipientCount: emailPayload.Recipients.length }
                );

                logger.info('[User Notification] Approval email sent', {
                    userId,
                    userEmail,
                    orgId,
                });
            } else {
                await auditLogStreaming.logAction(
                    'user_approval_notification_failed',
                    approvedBy,
                    userId,
                    'user',
                    'failed',
                    { orgId, reason: 'Email service unavailable' }
                );
            }

            return success;

        } catch (error) {
            logger.error('[User Notification] Failed to send approval notification', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Send user rejection notification
     */
    async notifyUserRejected(userId: string, rejectedBy: string, reason?: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();

            // Get user document
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                logger.error('[User Notification] User not found', { userId });
                return false;
            }

            const userData = userDoc.data();
            const userEmail = userData?.email;
            const userName = userData?.name || userData?.email;
            const orgId = userData?.orgId;

            if (!userEmail || !orgId) {
                logger.error('[User Notification] Missing user email or orgId', { userId });
                return false;
            }

            // Get org details
            const orgDoc = await db.collection('tenants').doc(orgId).get();
            const orgName = orgDoc.exists ? orgDoc.data()?.name : orgId;

            // Get org admin email
            const adminEmail = await this.getOrgAdminEmail(orgId);

            // Build rejection email
            const emailPayload = {
                FromEmail: 'noreply@bakedbot.ai',
                FromName: 'BakedBot Admin',
                Subject: 'BakedBot Application Status',
                'Html-part': this.getRejectionEmailTemplate(userName, orgName, reason),
                Recipients: [
                    { Email: userEmail, Name: userName },
                    ...(adminEmail ? [{ Email: adminEmail, Name: 'Org Admin' }] : []),
                ],
            };

            // Send via Mailjet
            const success = await this.sendEmailViaMailjet(emailPayload);

            if (success) {
                await auditLogStreaming.logAction(
                    'user_rejection_notification_sent',
                    rejectedBy,
                    userId,
                    'user',
                    'success',
                    { orgId, reason: reason || 'No reason provided' }
                );

                logger.info('[User Notification] Rejection email sent', {
                    userId,
                    userEmail,
                    orgId,
                });
            } else {
                await auditLogStreaming.logAction(
                    'user_rejection_notification_failed',
                    rejectedBy,
                    userId,
                    'user',
                    'failed',
                    { orgId, reason: 'Email service unavailable' }
                );
            }

            return success;

        } catch (error) {
            logger.error('[User Notification] Failed to send rejection notification', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Send user promotion to super user notification
     */
    async notifyUserPromoted(userId: string, promotedBy: string, newRole: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();

            // Get user document
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                logger.error('[User Notification] User not found', { userId });
                return false;
            }

            const userData = userDoc.data();
            const userEmail = userData?.email;
            const userName = userData?.name || userData?.email;

            if (!userEmail) {
                logger.error('[User Notification] Missing user email', { userId });
                return false;
            }

            // Build promotion email
            const emailPayload = {
                FromEmail: 'noreply@bakedbot.ai',
                FromName: 'BakedBot Admin',
                Subject: 'You\'ve been promoted to Super User!',
                'Html-part': this.getPromotionEmailTemplate(userName, newRole),
                Recipients: [{ Email: userEmail, Name: userName }],
            };

            // Send via Mailjet
            const success = await this.sendEmailViaMailjet(emailPayload);

            if (success) {
                await auditLogStreaming.logAction(
                    'user_promotion_notification_sent',
                    promotedBy,
                    userId,
                    'user',
                    'success',
                    { newRole }
                );

                logger.info('[User Notification] Promotion email sent', {
                    userId,
                    userEmail,
                    newRole,
                });
            } else {
                await auditLogStreaming.logAction(
                    'user_promotion_notification_failed',
                    promotedBy,
                    userId,
                    'user',
                    'failed',
                    { newRole, reason: 'Email service unavailable' }
                );
            }

            return success;

        } catch (error) {
            logger.error('[User Notification] Failed to send promotion notification', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Send email via Mailjet API
     */
    private async sendEmailViaMailjet(payload: any): Promise<boolean> {
        try {
            const apiKey = process.env.MAILJET_API_KEY;
            const apiSecret = process.env.MAILJET_API_SECRET;

            if (!apiKey || !apiSecret) {
                logger.warn('[User Notification] Mailjet credentials not configured');
                return false;
            }

            const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

            const response = await fetch('https://api.mailjet.com/v3.1/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify({ Messages: [payload] }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                logger.error('[User Notification] Mailjet API error', {
                    status: response.status,
                    error: errorData,
                });
                return false;
            }

            return true;

        } catch (error) {
            logger.error('[User Notification] Mailjet send failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Get org admin email (fallback to users collection query)
     */
    private async getOrgAdminEmail(orgId: string): Promise<string | null> {
        try {
            const db = getAdminFirestore();

            // Try to get from tenants collection first
            const tenantDoc = await db.collection('tenants').doc(orgId).get();
            if (tenantDoc.exists && tenantDoc.data()?.adminEmail) {
                return tenantDoc.data()?.adminEmail;
            }

            // Fallback: query users collection for dispensary role
            const usersSnap = await db
                .collection('users')
                .where('orgId', '==', orgId)
                .where('role', '==', 'dispensary')
                .limit(1)
                .get();

            if (!usersSnap.empty) {
                return usersSnap.docs[0].data()?.email || null;
            }

            return null;

        } catch (error) {
            logger.error('[User Notification] Failed to get org admin email', {
                orgId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    /**
     * Email template: User Approved
     */
    private getApprovalEmailTemplate(userName: string, orgName: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to BakedBot! 🎉</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! Your account for <strong>${orgName}</strong> has been approved and is now active.</p>
            <p>You can now access:</p>
            <ul>
                <li>Product catalog and inventory</li>
                <li>Customer loyalty programs</li>
                <li>Marketing automation</li>
                <li>Analytics and reporting</li>
            </ul>
            <a href="https://bakedbot.ai/dashboard" class="button">Go to Dashboard</a>
            <p>If you have any questions, reply to this email or contact our support team.</p>
            <p>Welcome aboard!</p>
            <p>— The BakedBot Team</p>
        </div>
        <div class="footer">
            <p>© 2026 BakedBot. All rights reserved. | <a href="https://bakedbot.ai/privacy">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Email template: User Rejected
     */
    private getRejectionEmailTemplate(
        userName: string,
        orgName: string,
        reason?: string
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Application Update</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>Thank you for your interest in <strong>${orgName}</strong> on BakedBot.</p>
            <p>Unfortunately, your application has not been approved at this time.</p>
            ${reason ? `
            <div class="reason-box">
                <strong>Details:</strong>
                <p>${reason}</p>
            </div>
            ` : ''}
            <p>If you believe this is in error or would like to appeal, please contact the ${orgName} team directly.</p>
            <p>We appreciate your interest in BakedBot!</p>
            <p>— The BakedBot Team</p>
        </div>
        <div class="footer">
            <p>© 2026 BakedBot. All rights reserved. | <a href="https://bakedbot.ai/privacy">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Email template: User Promoted to Super User
     */
    private getPromotionEmailTemplate(userName: string, newRole: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .feature-box { background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .feature-box h3 { margin: 0 0 10px 0; color: #8b5cf6; }
        .feature-box p { margin: 0; font-size: 14px; color: #6b7280; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 You've Been Promoted!</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>Congratulations! You have been promoted to <strong>${newRole}</strong> in BakedBot.</p>
            <p>Your new role grants you access to:</p>
            <div class="feature-box">
                <h3>🔍 Advanced Analytics</h3>
                <p>Platform-wide metrics, revenue dashboards, and competitive intelligence</p>
            </div>
            <div class="feature-box">
                <h3>👥 User Management</h3>
                <p>Approve/reject users, manage roles, and configure org settings</p>
            </div>
            <div class="feature-box">
                <h3>⚙️ System Controls</h3>
                <p>Configure system integrations, manage playbooks, and toggle features</p>
            </div>
            <div class="feature-box">
                <h3>❤️ Heartbeat Monitoring</h3>
                <p>Monitor system health, view detailed diagnostics, and trigger checks</p>
            </div>
            <p>Access these powerful features from the Executive Dashboard.</p>
            <p>If you have any questions about your new role, contact the BakedBot team.</p>
            <p>Welcome to the executive team!</p>
            <p>— The BakedBot Team</p>
        </div>
        <div class="footer">
            <p>© 2026 BakedBot. All rights reserved. | <a href="https://bakedbot.ai/privacy">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

// Singleton instance
const userNotification = new UserNotificationService();

export { UserNotificationService, userNotification };
