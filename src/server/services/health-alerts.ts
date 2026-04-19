/**
 * Health Alert Notification Service
 *
 * Sends email notifications when system health thresholds are breached.
 * Routes through AWS SES dispatcher (same as all platform email).
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { SystemHealthAlert, AlertThresholdConfig } from '@/types/system-health';
import { HEALTH_THRESHOLDS } from '@/types/system-health';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

const ALERT_COOLDOWN_MINUTES = 30;

/**
 * Send email notification for critical/warning alerts
 */
export async function sendAlertNotification(
  alert: SystemHealthAlert,
  recipients: string[]
): Promise<boolean> {
  if (recipients.length === 0) {
    return false;
  }

  // Check cooldown - don't spam
  const db = getAdminFirestore();
  const cooldownKey = `${alert.type}-${alert.severity}`;
  const recentAlert = await db
    .collection('health_alert_log')
    .where('cooldownKey', '==', cooldownKey)
    .where('sentAt', '>', Timestamp.fromDate(
      new Date(Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000)
    ))
    .limit(1)
    .get();

  if (!recentAlert.empty) {
    logger.info(`[HealthAlerts] Alert ${cooldownKey} on cooldown, skipping`);
    return false;
  }

  const severityEmoji = alert.severity === 'critical' ? '🔴' : '🟡';
  const severityLabel = alert.severity.toUpperCase();

  const subject = `${severityEmoji} [BakedBot] ${severityLabel}: ${alert.type} Alert`;
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${alert.severity === 'critical' ? '#dc2626' : '#ca8a04'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${severityEmoji} System Health ${severityLabel}</h2>
      </div>
      <div style="background: #1a1a2e; color: #e0e0e0; padding: 24px; border: 1px solid #333; border-top: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #888;">Alert Type:</td>
            <td style="padding: 8px 0; font-weight: bold; text-transform: capitalize;">${alert.type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Severity:</td>
            <td style="padding: 8px 0; font-weight: bold; color: ${alert.severity === 'critical' ? '#ef4444' : '#eab308'};">${severityLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Message:</td>
            <td style="padding: 8px 0;">${alert.message}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Detected:</td>
            <td style="padding: 8px 0;">${new Date(alert.timestamp).toLocaleString()}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #333;">
          <a href="https://bakedbot.ai/dashboard/ceo?tab=health" style="background: #6366f1; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
            View System Health Dashboard
          </a>
        </div>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 12px;">
        This is an automated alert from BakedBot System Health Monitoring.
        To adjust thresholds, visit the System Health dashboard.
      </p>
    </div>
  `;

  try {
    // Send to each recipient via SES dispatcher
    const results = await Promise.all(
      recipients.map(email =>
        sendGenericEmail({ to: email, subject, htmlBody, communicationType: 'transactional' })
      )
    );

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      logger.error('[HealthAlerts] Some recipients failed', { failed: failed.map(r => r.error) });
    }

    const sent = results.filter(r => r.success).length;
    if (sent === 0) return false;

    await db.collection('health_alert_log').add({
      cooldownKey,
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      recipients,
      sentAt: Timestamp.fromDate(new Date()),
    });

    logger.info(`[HealthAlerts] Alert sent to ${sent}/${recipients.length} recipients: ${cooldownKey}`);
    return true;
  } catch (error) {
    logger.error('[HealthAlerts] Failed to send alert', { error: String(error) });
    return false;
  }
}

/**
 * Get custom alert thresholds from Firestore (or defaults)
 */
export async function getAlertThresholds(): Promise<AlertThresholdConfig> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('system_settings').doc('alert_thresholds').get();

    if (doc.exists) {
      const data = doc.data()!;
      return {
        memory: data.memory || HEALTH_THRESHOLDS.memory,
        cpu: data.cpu || HEALTH_THRESHOLDS.cpu,
        latency: data.latency || HEALTH_THRESHOLDS.latency,
        errorRate: data.errorRate || HEALTH_THRESHOLDS.errorRate,
        notifications: data.notifications || {
          email: false,
          emailRecipients: [],
          dashboard: true,
        },
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy || 'system',
      };
    }
  } catch (error) {
    console.error('[HealthAlerts] Failed to load thresholds:', error);
  }

  // Return defaults
  return {
    memory: { ...HEALTH_THRESHOLDS.memory },
    cpu: { ...HEALTH_THRESHOLDS.cpu },
    latency: { ...HEALTH_THRESHOLDS.latency },
    errorRate: { ...HEALTH_THRESHOLDS.errorRate },
    notifications: {
      email: false,
      emailRecipients: [],
      dashboard: true,
    },
    updatedAt: new Date(),
    updatedBy: 'system',
  };
}

/**
 * Save custom alert thresholds to Firestore
 */
export async function saveAlertThresholds(
  config: Omit<AlertThresholdConfig, 'updatedAt' | 'updatedBy'>,
  userId: string
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection('system_settings').doc('alert_thresholds').set({
    ...config,
    updatedAt: Timestamp.fromDate(new Date()),
    updatedBy: userId,
  }, { merge: true });
}

/**
 * Process alerts and send notifications if needed
 */
export async function processAlertNotifications(
  alerts: SystemHealthAlert[]
): Promise<void> {
  const thresholds = await getAlertThresholds();

  if (!thresholds.notifications.email || thresholds.notifications.emailRecipients.length === 0) {
    return; // Email notifications disabled
  }

  // Only send for critical and warning alerts
  const notifiableAlerts = alerts.filter(a =>
    a.severity === 'critical' || a.severity === 'warning'
  );

  for (const alert of notifiableAlerts) {
    await sendAlertNotification(alert, thresholds.notifications.emailRecipients);
  }
}
