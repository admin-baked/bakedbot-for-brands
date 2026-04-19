/**
 * Playbook email delivery — routes through AWS SES via the dispatcher.
 * Previously sent directly via Mailjet; all sends now go through SES.
 *
 * Callers retain the same interface — no changes needed in individual crons.
 */

import { sendGenericEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';

interface PlaybookEmailParams {
    to: string;
    subject: string;
    htmlBody: string;
    playbookId: string;
    playbookName: string;
    toName?: string;
    orgId?: string;
}

export async function sendPlaybookEmail(params: PlaybookEmailParams): Promise<void> {
    const html = wrapInTemplate(params.htmlBody, params.playbookName);

    const result = await sendGenericEmail({
        to: params.to,
        name: params.toName,
        subject: params.subject,
        htmlBody: html,
        communicationType: 'transactional',
        orgId: params.orgId,
    });

    if (!result.success) {
        logger.error('[PlaybookEmail] Send failed', {
            playbookId: params.playbookId,
            to: params.to,
            error: result.error,
        });
        throw new Error(`Playbook email failed: ${result.error}`);
    }

    logger.info('[PlaybookEmail] Sent via SES', { playbookId: params.playbookId, to: params.to });
}

export async function sendTransactionalEmail(params: {
    to: string;
    subject: string;
    htmlBody: string;
    customId?: string;
    orgId?: string;
}): Promise<void> {
    const result = await sendGenericEmail({
        to: params.to,
        subject: params.subject,
        htmlBody: params.htmlBody,
        communicationType: 'transactional',
        orgId: params.orgId,
    });

    if (!result.success) {
        logger.error('[TransactionalEmail] Send failed', { to: params.to, error: result.error });
        throw new Error(`Transactional email failed: ${result.error}`);
    }
}

// HTML wrapper template — kept for legacy callers that pass unwrapped content
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
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);padding:20px 32px;">
              <span style="color:white;font-weight:700;font-size:18px;">BakedBot AI</span>
              <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:8px;">· ${playbookName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
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
