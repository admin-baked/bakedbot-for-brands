'use server';

import { sendGenericEmail } from '@/lib/email/dispatcher';
import { createServerClient } from '@/firebase/server-client';
import { auditLogStreaming } from './audit-log-streaming';
import { logger } from '@/lib/logger';
import { TIERS, type TierId } from '@/config/tiers';

/**
 * Gets org admin email for billing notifications.
 * Tries tenants/{orgId}.adminEmail first, then falls back to users query.
 */
async function getOrgAdminEmail(orgId: string): Promise<string | null> {
  try {
    const { firestore } = await createServerClient();

    // Try tenants/{orgId} first
    const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
    if (tenantDoc.exists && tenantDoc.data()?.adminEmail) {
      return tenantDoc.data()!.adminEmail;
    }

    // Fallback: query users with orgId + role = 'dispensary'
    const usersSnapshot = await firestore
      .collection('users')
      .where('organizationIds', 'array-contains', orgId)
      .where('role', '==', 'dispensary')
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return usersSnapshot.docs[0].data().email || null;
    }

    return null;
  } catch (error: any) {
    logger.warn('[billing-notifications] getOrgAdminEmail failed', {
      orgId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Sends subscription created confirmation email.
 */
export async function notifySubscriptionCreated(
  orgId: string,
  tierId: TierId,
  amount: number,
  promoApplied?: { code: string; discount: string }
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const tierConfig = TIERS[tierId];
    const promoText = promoApplied ? `\n\n**Promo Applied:** ${promoApplied.code} — ${promoApplied.discount}` : '';

    const result = await sendGenericEmail({
      to: adminEmail,
      subject: 'Your BakedBot subscription is active',
      htmlBody: `
        <h2>Welcome to BakedBot ${tierConfig.name}!</h2>
        <p>Your subscription has been activated successfully.</p>
        <table style="margin: 20px 0; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 10px; font-weight: bold;">Plan:</td>
            <td style="padding: 10px;">${tierConfig.name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 10px; font-weight: bold;">Monthly Cost:</td>
            <td style="padding: 10px;">$${amount}/month</td>
          </tr>
          ${
            promoApplied
              ? `<tr style="border-bottom: 1px solid #ccc; color: #22c55e;"><td style="padding: 10px; font-weight: bold;">Promo:</td><td style="padding: 10px;">${promoApplied.code} — ${promoApplied.discount}</td></tr>`
              : ''
          }
        </table>
        <p><strong>Included Features:</strong></p>
        <ul>
          <li>${tierConfig.allocations.emails.toLocaleString()} emails/month</li>
          <li>${tierConfig.allocations.smsCustomer} customer SMS/month</li>
          <li>${tierConfig.allocations.competitors} competitors tracked</li>
          <li>${tierConfig.allocations.playbooks} automation playbooks</li>
        </ul>
        <p>
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #22c55e; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            View Your Subscription
          </a>
        </p>
        <p>Questions? Contact support at <strong>support@bakedbot.ai</strong></p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'subscription_created_email_sent',
        'system',
        orgId,
        'subscription',
        'success',
        { tierId, amount, promoApplied }
      );
    } else {
      await auditLogStreaming.logAction(
        'subscription_created_email_failed',
        'system',
        orgId,
        'subscription',
        'failed'
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifySubscriptionCreated error', {
      orgId,
      tierId,
      error: error.message,
    });
    await auditLogStreaming.logAction(
      'subscription_created_email_failed',
      'system',
      orgId,
      'subscription',
      'failed',
      { error: error.message }
    );
    return false;
  }
}

/**
 * Sends subscription canceled confirmation email.
 */
export async function notifySubscriptionCanceled(
  orgId: string,
  tierId: TierId
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const tierConfig = TIERS[tierId];
    const result = await sendGenericEmail({
      to: adminEmail,
      subject: 'Your BakedBot subscription has been canceled',
      htmlBody: `
        <h2>Subscription Canceled</h2>
        <p>Your ${tierConfig.name} subscription has been successfully canceled.</p>
        <p>You will retain access until the end of your current billing period.</p>
        <p style="margin-top: 20px;">
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Resubscribe Anytime
          </a>
        </p>
        <p>We'd love to have you back. If you have feedback, reply to this email.</p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'subscription_canceled_email_sent',
        'system',
        orgId,
        'subscription',
        'success'
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifySubscriptionCanceled error', {
      orgId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Sends payment failed notification.
 */
export async function notifySubscriptionPaymentFailed(
  orgId: string,
  tierId: TierId
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const tierConfig = TIERS[tierId];
    const result = await sendGenericEmail({
      to: adminEmail,
      subject: '⚠️ Action required: BakedBot payment failed',
      htmlBody: `
        <h2>Payment Failed</h2>
        <p>We were unable to charge your payment method for your ${tierConfig.name} subscription.</p>
        <p style="color: #ef4444; font-weight: bold;">Please update your billing information to avoid service interruption.</p>
        <p style="margin-top: 20px;">
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #ef4444; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Update Billing Method
          </a>
        </p>
        <p>If you need help, contact <strong>support@bakedbot.ai</strong></p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'payment_failed_email_sent',
        'system',
        orgId,
        'subscription',
        'success'
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifySubscriptionPaymentFailed error', {
      orgId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Sends usage alert at 80% of allocation.
 */
export interface UsageAlertMetric {
  name: string;
  used: number;
  limit: number;
  percent: number;
}

export async function notifyUsage80Percent(
  orgId: string,
  metrics: UsageAlertMetric[]
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const metricsRows = metrics
      .map(
        (m) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;">${m.name}</td>
          <td style="padding: 10px; text-align: right;">${m.used} / ${m.limit}</td>
          <td style="padding: 10px; text-align: right; color: #f59e0b; font-weight: bold;">${m.percent}%</td>
        </tr>
      `
      )
      .join('');

    const result = await sendGenericEmail({
      to: adminEmail,
      subject: '⚠️ You\'re approaching usage limits',
      htmlBody: `
        <h2>Usage Alert: 80% Threshold Reached</h2>
        <p>You've reached 80% of your monthly allocation for one or more features.</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse; border: 1px solid #ddd;">
          <thead style="background: #f3f4f6;">
            <tr>
              <th style="padding: 10px; text-align: left; font-weight: bold;">Feature</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">Usage</th>
              <th style="padding: 10px; text-align: right; font-weight: bold;">% Used</th>
            </tr>
          </thead>
          <tbody>
            ${metricsRows}
          </tbody>
        </table>
        <p>When you exceed your allocation, overage charges will apply.</p>
        <p style="margin-top: 20px;">
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            View Usage Details
          </a>
          &nbsp;&nbsp;
          <a href="https://bakedbot.ai/dashboard/settings/billing?upgrade=true" style="background: #22c55e; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Upgrade Plan
          </a>
        </p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'usage_alert_80_percent_sent',
        'system',
        orgId,
        'usage',
        'success',
        { metrics }
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifyUsage80Percent error', {
      orgId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Sends promo expiring notification (1 month remaining).
 */
export async function notifyPromoExpiring(
  orgId: string,
  tierId: TierId,
  monthsRemaining: number
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const tierConfig = TIERS[tierId];
    const result = await sendGenericEmail({
      to: adminEmail,
      subject: `⏰ Your free months are ending soon (${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'} left)`,
      htmlBody: `
        <h2>Promo Expiring Soon</h2>
        <p>Your EARLYBIRD50 promotional offer is expiring in <strong>${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'}</strong>.</p>
        <p>After your free months end, your ${tierConfig.name} subscription will continue at the regular rate of <strong>$${tierConfig.price}/month</strong>.</p>
        <p style="margin-top: 20px;">
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            View Subscription Details
          </a>
        </p>
        <p>No action needed — your subscription will continue automatically.</p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'promo_expiring_email_sent',
        'system',
        orgId,
        'subscription',
        'success',
        { monthsRemaining }
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifyPromoExpiring error', {
      orgId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Sends promo expired notification (free months ended).
 */
export async function notifyPromoExpired(
  orgId: string,
  tierId: TierId,
  amount: number
): Promise<boolean> {
  try {
    const adminEmail = await getOrgAdminEmail(orgId);
    if (!adminEmail) {
      logger.warn('[billing-notifications] No admin email for org', { orgId });
      return false;
    }

    const tierConfig = TIERS[tierId];
    const result = await sendGenericEmail({
      to: adminEmail,
      subject: 'Your free trial has ended — subscription continues',
      htmlBody: `
        <h2>Free Months Ended</h2>
        <p>Your EARLYBIRD50 promotional free months have ended.</p>
        <p style="font-size: 16px; margin-top: 20px;">
          Your ${tierConfig.name} subscription will now be charged at the regular rate:<br/>
          <strong style="font-size: 20px; color: #3b82f6;">$${amount}/month</strong>
        </p>
        <p style="margin-top: 20px;">
          Your next billing date is in the invoice attached or visible in your account.
        </p>
        <p>
          <a href="https://bakedbot.ai/dashboard/settings/billing" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Manage Subscription
          </a>
        </p>
      `,
      communicationType: 'transactional',
      orgId,
    });

    if (result.success) {
      await auditLogStreaming.logAction(
        'promo_expired_email_sent',
        'system',
        orgId,
        'subscription',
        'success',
        { amount }
      );
    }

    return result.success;
  } catch (error: any) {
    logger.error('[billing-notifications] notifyPromoExpired error', {
      orgId,
      error: error.message,
    });
    return false;
  }
}
