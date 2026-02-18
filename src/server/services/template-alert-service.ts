/**
 * Template Alert Service
 *
 * Proactive monitoring: notify ops when templates have issues
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { slackService } from '@/server/services/communications/slack';

export interface TemplateAlert {
  templateId: string;
  templateName: string;
  alertType: 'low_success_rate' | 'no_recent_execution' | 'high_error_rate';
  severity: 'warning' | 'critical';
  message: string;
  affectedOrgs: number;
  timestamp: Date;
}

/**
 * Check all templates for alert conditions
 */
export async function checkTemplatesForAlerts(): Promise<TemplateAlert[]> {
  const alerts: TemplateAlert[] = [];

  try {
    const firestore = getAdminFirestore();

    logger.info('[TemplateAlerts] Starting template health check');

    // Get all templates
    const templatesSnap = await firestore.collection('playbook_templates').get();

    for (const templateDoc of templatesSnap.docs) {
      const template = templateDoc.data();
      const templateId = templateDoc.id;
      const templateName = template.name || templateId;

      try {
        // Check 1: Success rate too low
        const execSnap = await firestore
          .collectionGroup('playbook_executions')
          .where('playbookTemplateId', '==', templateId)
          .where('startedAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          .limit(100)
          .get();

        if (execSnap.size > 0) {
          let successCount = 0;

          for (const doc of execSnap.docs) {
            if (doc.data().status === 'completed' || doc.data().status === 'success') {
              successCount++;
            }
          }

          const successRate = (successCount / execSnap.size) * 100;

          if (successRate < 80 && successRate > 0) {
            const affectedOrgs = new Set(
              execSnap.docs.map((doc) => doc.ref.parent.parent?.id || 'unknown')
            );

            alerts.push({
              templateId,
              templateName,
              alertType: 'low_success_rate',
              severity: successRate < 50 ? 'critical' : 'warning',
              message: `Template has ${successRate.toFixed(1)}% success rate (${successCount}/${execSnap.size} in last 24h)`,
              affectedOrgs: affectedOrgs.size,
              timestamp: new Date(),
            });
          }
        }

        // Check 2: No execution in 24 hours (if should be running)
        const lastExecSnap = await firestore
          .collectionGroup('playbook_executions')
          .where('playbookTemplateId', '==', templateId)
          .orderBy('startedAt', 'desc')
          .limit(1)
          .get();

        if (lastExecSnap.size === 0 && template.schedule) {
          alerts.push({
            templateId,
            templateName,
            alertType: 'no_recent_execution',
            severity: 'warning',
            message: `Template has not executed in last 24 hours (schedule: ${template.schedule})`,
            affectedOrgs: 0,
            timestamp: new Date(),
          });
        } else if (lastExecSnap.size > 0) {
          const lastExec = lastExecSnap.docs[0].data();
          const lastExecTime = new Date(lastExec.startedAt);
          const hoursSinceExec = (Date.now() - lastExecTime.getTime()) / (1000 * 60 * 60);

          // If scheduled daily and no exec in 25 hours
          if (template.schedule === 'daily' && hoursSinceExec > 25) {
            alerts.push({
              templateId,
              templateName,
              alertType: 'no_recent_execution',
              severity: 'warning',
              message: `Daily template last executed ${hoursSinceExec.toFixed(1)} hours ago`,
              affectedOrgs: 0,
              timestamp: new Date(),
            });
          }
        }

        // Check 3: High error rate
        const errorsSnap = await firestore
          .collectionGroup('playbook_execution_retries')
          .where('playbookId', '==', templateId)
          .where('status', '==', 'failed')
          .where('createdAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
          .get();

        if (errorsSnap.size > 10) {
          alerts.push({
            templateId,
            templateName,
            alertType: 'high_error_rate',
            severity: 'critical',
            message: `Template has ${errorsSnap.size} failed retries in last 24 hours`,
            affectedOrgs: 0,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        logger.warn('[TemplateAlerts] Error checking template', {
          templateId,
          error: String(err),
        });
      }
    }

    logger.info('[TemplateAlerts] Health check complete', { alertCount: alerts.length });

    return alerts;
  } catch (err) {
    logger.error('[TemplateAlerts] Error during health check', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Send alerts to ops
 */
export async function sendTemplateAlerts(alerts: TemplateAlert[]): Promise<void> {
  if (alerts.length === 0) {
    return;
  }

  try {
    const firestore = getAdminFirestore();

    // Get ops emails from super_users
    const opsSnap = await firestore
      .collection('users')
      .where('role', '==', 'super_user')
      .select('email')
      .get();

    const opsEmails = opsSnap.docs
      .map((doc) => doc.data().email)
      .filter((email) => email && typeof email === 'string');

    if (opsEmails.length === 0) {
      logger.warn('[TemplateAlerts] No ops emails found');
      return;
    }

    // Group alerts by severity
    const critical = alerts.filter((a) => a.severity === 'critical');
    const warnings = alerts.filter((a) => a.severity === 'warning');

    // Build HTML email
    const alertsHtml = alerts
      .map(
        (alert) =>
          `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; color: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'};">
          ${alert.severity.toUpperCase()}
        </td>
        <td style="padding: 12px; font-weight: 500;">${alert.templateName}</td>
        <td style="padding: 12px;">${alert.message}</td>
        ${alert.affectedOrgs > 0 ? `<td style="padding: 12px;">${alert.affectedOrgs} orgs</td>` : ''}
      </tr>
    `
      )
      .join('');

    const subject =
      critical.length > 0
        ? `🚨 CRITICAL: ${critical.length} template alerts`
        : `⚠️ WARNING: ${warnings.length} template alerts`;

    const htmlBody = `
      <h2 style="color: #111827;">Playbook Template Health Alerts</h2>
      <p>${new Date().toLocaleString()}</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Severity</th>
            <th style="padding: 12px; text-align: left;">Template</th>
            <th style="padding: 12px; text-align: left;">Issue</th>
            <th style="padding: 12px; text-align: left;">Impact</th>
          </tr>
        </thead>
        <tbody>
          ${alertsHtml}
        </tbody>
      </table>

      <p style="margin-top: 20px; color: #6b7280;">
        <a href="https://bakedbot.ai/dashboard/admin/playbook-templates" style="color: #3b82f6;">
          View Dashboard →
        </a>
      </p>
    `;

    // Send emails
    for (const email of opsEmails) {
      try {
        await sendGenericEmail({
          to: email,
          subject,
          html: htmlBody,
          orgId: 'system',
        });
      } catch (emailErr) {
        logger.error('[TemplateAlerts] Failed to send email', { email, error: String(emailErr) });
      }
    }

    // Send Slack alert if channel is configured
    try {
      const summaryText = `
🚨 *Playbook Template Alerts*
Critical: ${critical.length} | Warnings: ${warnings.length}

${critical.map((a) => `• *${a.templateName}*: ${a.message}`).join('\n')}
${warnings.map((a) => `• ${a.templateName}: ${a.message}`).join('\n')}

<https://bakedbot.ai/dashboard/admin/playbook-templates|View Dashboard>
      `;

      await slackService.postMessage({
        channel: '#alerts', // Configure this channel in Slack workspace
        text: summaryText,
      });
    } catch (slackErr) {
      logger.warn('[TemplateAlerts] Failed to send Slack alert', { error: String(slackErr) });
    }

    logger.info('[TemplateAlerts] Alerts sent successfully', {
      emailCount: opsEmails.length,
      alertCount: alerts.length,
    });
  } catch (err) {
    logger.error('[TemplateAlerts] Error sending alerts', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Full health check + alert workflow
 */
export async function runTemplateHealthCheck(): Promise<void> {
  const alerts = await checkTemplatesForAlerts();
  if (alerts.length > 0) {
    await sendTemplateAlerts(alerts);
  }
}
