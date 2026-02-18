/**
 * Mailjet integration for playbook email delivery.
 *
 * Used by the playbook execution service to send transactional
 * emails via Mailjet's API.
 *
 * Environment variables required:
 *   MAILJET_API_KEY       — Public API key
 *   MAILJET_SECRET_KEY    — Secret key
 *   MAILJET_FROM_EMAIL    — Sender address (e.g. playbooks@bakedbot.ai)
 *   MAILJET_FROM_NAME     — Sender name (e.g. BakedBot AI)
 */

import { logger } from '@/lib/logger';

interface PlaybookEmailParams {
    to: string;
    subject: string;
    htmlBody: string;
    playbookId: string;
    playbookName: string;
    toName?: string;
}

interface MailjetMessage {
    From: { Email: string; Name: string };
    To: { Email: string; Name: string }[];
    Subject: string;
    HTMLPart: string;
    CustomID: string;
}

function getMailjetConfig() {
    return {
        apiKey: process.env.MAILJET_API_KEY ?? '',
        secretKey: process.env.MAILJET_SECRET_KEY ?? '',
        fromEmail: process.env.MAILJET_FROM_EMAIL ?? 'playbooks@bakedbot.ai',
        fromName: process.env.MAILJET_FROM_NAME ?? 'BakedBot AI',
    };
}

/**
 * Send a playbook email via Mailjet.
 */
export async function sendPlaybookEmail(params: PlaybookEmailParams): Promise<void> {
    const config = getMailjetConfig();

    if (!config.apiKey || !config.secretKey) {
        logger.warn('[Mailjet] API credentials not configured — skipping email delivery', {
            playbookId: params.playbookId,
        });
        return;
    }

    const message: MailjetMessage = {
        From: { Email: config.fromEmail, Name: config.fromName },
        To: [{ Email: params.to, Name: params.toName ?? params.to }],
        Subject: params.subject,
        HTMLPart: wrapInTemplate(params.htmlBody, params.playbookName),
        CustomID: `playbook-${params.playbookId}-${Date.now()}`,
    };

    const credentials = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64');

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Messages: [message] }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Mailjet] Send failed', {
            status: response.status,
            error: errorText,
            playbookId: params.playbookId,
        });
        throw new Error(`Mailjet API error: ${response.status} ${errorText}`);
    }

    logger.info('[Mailjet] Playbook email sent', {
        playbookId: params.playbookId,
        to: params.to,
    });
}

/**
 * Send a transactional email (non-playbook, e.g. usage alert, overage notice).
 */
export async function sendTransactionalEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    customId?: string;
}): Promise<void> {
    const config = getMailjetConfig();

    if (!config.apiKey || !config.secretKey) {
        logger.warn('[Mailjet] API credentials not configured — skipping');
        return;
    }

    const credentials = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64');

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            Messages: [{
                From: { Email: config.fromEmail, Name: config.fromName },
                To: [{ Email: params.to }],
                Subject: params.subject,
                HTMLPart: params.htmlBody,
                CustomID: params.customId ?? `transactional-${Date.now()}`,
            }],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailjet API error: ${response.status} ${errorText}`);
    }
}

// ---------------------------------------------------------------------------
// HTML wrapper template
// ---------------------------------------------------------------------------

function wrapInTemplate(content: string, playbookName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${playbookName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);padding:20px 32px;">
              <span style="color:white;font-weight:700;font-size:18px;">BakedBot AI</span>
              <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:8px;">· ${playbookName}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You're receiving this because you have an active BakedBot subscription.
                <a href="https://bakedbot.ai/dashboard/settings/notifications" style="color:#059669;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
