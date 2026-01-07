import { logger } from '@/lib/logger';

export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
    logger.info(`[EmailService] STUB: Sending email to ${options.to}`, { subject: options.subject });
    // TODO: Implement actual email sending logic (e.g. Mailjet, SendGrid, Resend)
    return Promise.resolve();
}
