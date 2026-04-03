/**
 * Amazon SES email sender
 *
 * Used for transactional email (internal reports, partner alerts, ops notifications).
 * SES has no cannabis industry restrictions — preferred over Mailjet/SendGrid.
 *
 * Required env vars:
 *   AWS_SES_ACCESS_KEY_ID
 *   AWS_SES_SECRET_ACCESS_KEY
 *   AWS_SES_REGION (default: us-east-1)
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

export interface SesEmailOptions {
    to: string | string[];
    from: string;
    fromName?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    replyTo?: string;
}

function getClient(): SESClient {
    return new SESClient({
        region: process.env.AWS_SES_REGION ?? 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
        },
    });
}

export async function sendSesEmail(opts: SesEmailOptions): Promise<void> {
    const client = getClient();
    const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
    const fromAddress = opts.fromName
        ? `${opts.fromName} <${opts.from}>`
        : opts.from;

    const command = new SendEmailCommand({
        Source: fromAddress,
        Destination: { ToAddresses: toAddresses },
        Message: {
            Subject: { Data: opts.subject, Charset: 'UTF-8' },
            Body: {
                Html: { Data: opts.htmlBody, Charset: 'UTF-8' },
                ...(opts.textBody && { Text: { Data: opts.textBody, Charset: 'UTF-8' } }),
            },
        },
        ...(opts.replyTo && { ReplyToAddresses: [opts.replyTo] }),
    });

    try {
        const result = await client.send(command);
        logger.info('[SES] Email sent', { messageId: result.MessageId, to: toAddresses });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[SES] Send failed', { error: msg, to: toAddresses, subject: opts.subject });
        throw error;
    }
}
