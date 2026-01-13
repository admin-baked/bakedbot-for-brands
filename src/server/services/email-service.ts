'use server';

/**
 * Email Service - Generic email sending interface
 * 
 * This is a thin wrapper around existing email providers (Mailjet, SendGrid, etc.)
 * to provide a consistent API for services like Mrs. Parker.
 */

import { logger } from '@/lib/logger';

export interface SendEmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
    from?: string;
}

/**
 * Send an email using the configured email provider.
 * Currently wraps Mailjet dispatcher.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
        // Try to use the generic email dispatcher
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');

        await sendGenericEmail({
            to: options.to,
            subject: options.subject,
            htmlBody: options.html || options.text.replace(/\n/g, '<br>'),
            textBody: options.text,
            fromName: 'BakedBot',
        });

        return true;
    } catch (error: any) {
        logger.error('[EmailService] Failed to send email:', { error: error.message, to: options.to });
        return false;
    }
}
