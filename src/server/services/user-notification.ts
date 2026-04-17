/**
 * User Notification Service
 *
 * Sends email notifications for user lifecycle events:
 * - User approved (notification to user + org admin)
 * - User rejected (notification to user + org admin)
 * - User promoted to super user (notification to user)
 *
 * Uses sendGenericEmail dispatcher → AWS SES
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
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

const FROM_EMAIL = 'hello@bakedbot.ai';
const FROM_NAME = 'BakedBot';

class UserNotificationService {
    async notifyUserApproved(userId: string, approvedBy: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();
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

            const orgDoc = await db.collection('tenants').doc(orgId).get();
            const orgName = orgDoc.exists ? orgDoc.data()?.name : orgId;
            const adminEmail = await this.getOrgAdminEmail(orgId);

            const htmlBody = this.getApprovalEmailTemplate(userName, orgName);
            const subject = 'Welcome to BakedBot!';

            const [userResult] = await Promise.allSettled([
                sendGenericEmail({ to: userEmail, name: userName, fromEmail: FROM_EMAIL, fromName: FROM_NAME, subject, htmlBody }),
                adminEmail ? sendGenericEmail({ to: adminEmail, name: 'Org Admin', fromEmail: FROM_EMAIL, fromName: FROM_NAME, subject: `[Admin] ${subject}`, htmlBody }) : Promise.resolve({ success: true }),
            ]);

            const success = userResult.status === 'fulfilled' && userResult.value.success;

            await auditLogStreaming.logAction(
                success ? 'user_approval_notification_sent' : 'user_approval_notification_failed',
                approvedBy, userId, 'user', success ? 'success' : 'failed',
                { orgId, recipientCount: adminEmail ? 2 : 1 }
            );

            if (success) logger.info('[User Notification] Approval email sent', { userId, userEmail, orgId });
            return success;
        } catch (error) {
            logger.error('[User Notification] Failed to send approval notification', {
                userId, error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    async notifyUserRejected(userId: string, rejectedBy: string, reason?: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();
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

            const orgDoc = await db.collection('tenants').doc(orgId).get();
            const orgName = orgDoc.exists ? orgDoc.data()?.name : orgId;
            const adminEmail = await this.getOrgAdminEmail(orgId);

            const htmlBody = this.getRejectionEmailTemplate(userName, orgName, reason);
            const subject = 'BakedBot Application Status';

            const [userResult] = await Promise.allSettled([
                sendGenericEmail({ to: userEmail, name: userName, fromEmail: FROM_EMAIL, fromName: FROM_NAME, subject, htmlBody }),
                adminEmail ? sendGenericEmail({ to: adminEmail, name: 'Org Admin', fromEmail: FROM_EMAIL, fromName: FROM_NAME, subject: `[Admin] ${subject}`, htmlBody }) : Promise.resolve({ success: true }),
            ]);

            const success = userResult.status === 'fulfilled' && userResult.value.success;

            await auditLogStreaming.logAction(
                success ? 'user_rejection_notification_sent' : 'user_rejection_notification_failed',
                rejectedBy, userId, 'user', success ? 'success' : 'failed',
                { orgId, reason: reason || 'No reason provided' }
            );

            if (success) logger.info('[User Notification] Rejection email sent', { userId, userEmail, orgId });
            return success;
        } catch (error) {
            logger.error('[User Notification] Failed to send rejection notification', {
                userId, error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    async notifyUserPromoted(userId: string, promotedBy: string, newRole: string): Promise<boolean> {
        try {
            const db = getAdminFirestore();
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

            const htmlBody = this.getPromotionEmailTemplate(userName, newRole);
            const result = await sendGenericEmail({
                to: userEmail,
                name: userName,
                fromEmail: FROM_EMAIL,
                fromName: FROM_NAME,
                subject: "You've been promoted to Super User!",
                htmlBody,
            });

            await auditLogStreaming.logAction(
                result.success ? 'user_promotion_notification_sent' : 'user_promotion_notification_failed',
                promotedBy, userId, 'user', result.success ? 'success' : 'failed',
                { newRole }
            );

            if (result.success) logger.info('[User Notification] Promotion email sent', { userId, userEmail, newRole });
            return result.success;
        } catch (error) {
            logger.error('[User Notification] Failed to send promotion notification', {
                userId, error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    private async getOrgAdminEmail(orgId: string): Promise<string | null> {
        try {
            const db = getAdminFirestore();
            const tenantDoc = await db.collection('tenants').doc(orgId).get();
            if (tenantDoc.exists && tenantDoc.data()?.adminEmail) {
                return tenantDoc.data()?.adminEmail;
            }
            const usersSnap = await db.collection('users')
                .where('orgId', '==', orgId)
                .where('role', '==', 'dispensary')
                .limit(1)
                .get();
            return usersSnap.empty ? null : (usersSnap.docs[0].data()?.email || null);
        } catch (error) {
            logger.error('[User Notification] Failed to get org admin email', {
                orgId, error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    private getApprovalEmailTemplate(userName: string, orgName: string): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f9f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f0f9f4;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.07);">
        <tr><td style="padding:28px 40px;background:#0D211D;text-align:center;">
          <img src="https://bakedbot.ai/bakedbot-logo-horizontal.png" alt="BakedBot AI" height="32" style="display:block;margin:0 auto;">
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#0d2b13;">Welcome to BakedBot! 🎉</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Hi ${userName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Your account for <strong>${orgName}</strong> has been approved and is now active.</p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#22AD85;border-radius:8px;padding:14px 28px;">
              <a href="https://bakedbot.ai/dashboard" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Go to Dashboard →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#555;">Questions? Reply to this email — we're here to help.</p>
          <p style="margin:16px 0 0;font-size:14px;color:#555;">— The BakedBot Team</p>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f8f8f8;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">© ${new Date().getFullYear()} BakedBot AI · <a href="https://bakedbot.ai/privacy" style="color:#22AD85;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    private getRejectionEmailTemplate(userName: string, orgName: string, reason?: string): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#fafafa;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.07);">
        <tr><td style="padding:28px 40px;background:#0D211D;text-align:center;">
          <img src="https://bakedbot.ai/bakedbot-logo-horizontal.png" alt="BakedBot AI" height="32" style="display:block;margin:0 auto;">
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">Application Update</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Hi ${userName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Thank you for your interest in <strong>${orgName}</strong> on BakedBot. Unfortunately, your application has not been approved at this time.</p>
          ${reason ? `<div style="background:#fff3f3;border-left:4px solid #ef4444;padding:16px 20px;margin:20px 0;border-radius:4px;font-size:14px;color:#555;">${reason}</div>` : ''}
          <p style="margin:0;font-size:14px;color:#555;">If you believe this is in error, contact the ${orgName} team directly.</p>
          <p style="margin:16px 0 0;font-size:14px;color:#555;">— The BakedBot Team</p>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f8f8f8;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">© ${new Date().getFullYear()} BakedBot AI · <a href="https://bakedbot.ai/privacy" style="color:#22AD85;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    private getPromotionEmailTemplate(userName: string, newRole: string): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;background:#f5f0ff;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.07);">
        <tr><td style="padding:28px 40px;background:#0D211D;text-align:center;">
          <img src="https://bakedbot.ai/bakedbot-logo-horizontal.png" alt="BakedBot AI" height="32" style="display:block;margin:0 auto;">
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;">🚀 You've Been Promoted!</h2>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">Hi ${userName},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#333;">You've been promoted to <strong>${newRole}</strong> in BakedBot. You now have access to advanced analytics, user management, and system controls.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#22AD85;border-radius:8px;padding:14px 28px;">
              <a href="https://bakedbot.ai/dashboard" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Open Executive Dashboard →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#555;">— The BakedBot Team</p>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f8f8f8;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">© ${new Date().getFullYear()} BakedBot AI · <a href="https://bakedbot.ai/privacy" style="color:#22AD85;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }
}

const userNotification = new UserNotificationService();
export { UserNotificationService, userNotification };
