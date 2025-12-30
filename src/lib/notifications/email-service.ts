/**
 * Email Service (SendGrid)
 * Handles sending transactional emails for order updates
 */

import { logger } from '@/lib/logger';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'orders@bakedbot.ai';
const SENDGRID_BASE_URL = 'https://api.sendgrid.com/v3/mail/send';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export class EmailService {
    private async sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
        if (!SENDGRID_API_KEY) {
            logger.warn('SENDGRID_API_KEY is missing. Mocking email send:', { to, subject });
            return true;
        }

        try {
            const response = await fetch(SENDGRID_BASE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: FROM_EMAIL, name: 'BakedBot Orders' },
                    subject,
                    content: [{ type: 'text/html', value: html }],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                logger.error('SendGrid Error:', error);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Email Send Error:', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    async sendOrderConfirmation(order: any, customerEmail: string) {
        const subject = `Order Confirmation #${order.id.slice(0, 8)}`;
        const html = `
      <h1>Order Confirmed!</h1>
      <p>Thanks for your order at ${order.dispensaryName || 'our dispensary'}.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      <p>We'll notify you when it's ready for pickup.</p>
    `;
        return this.sendEmail({ to: customerEmail, subject, html });
    }

    async sendOrderReady(order: any, customerEmail: string) {
        const subject = `Your Order is Ready! #${order.id.slice(0, 8)}`;
        const html = `
      <h1>Ready for Pickup!</h1>
      <p>Your order #${order.id} is ready for pickup at ${order.dispensaryName || 'the dispensary'}.</p>
      <p>Please bring your ID and payment (if not paid online).</p>
    `;
        return this.sendEmail({ to: customerEmail, subject, html });
    }

    async sendOrderCompleted(order: any, customerEmail: string) {
        const subject = `Order Completed #${order.id.slice(0, 8)}`;
        const html = `
      <h1>Order Completed</h1>
      <p>Thanks for shopping with us! Your order #${order.id} has been completed.</p>
      <p>We hope to see you again soon.</p>
    `;
        return this.sendEmail({ to: customerEmail, subject, html });
    }

    /**
     * Send a custom email (public method for other services)
     */
    async sendCustomEmail(options: EmailOptions): Promise<boolean> {
        return this.sendEmail(options);
    }
    /**
     * Send an invitation email to a new user
     */
    /**
     * Send an invitation email to a new user
     */
    async sendInvitationEmail(to: string, link: string, role: string, businessName?: string) {
        // Use Mailjet for Invites
        try {
            // Dynamically import to separate server vs client concerns if needed, though this file logic seems shared
            const mailjet = await import('@/lib/email/mailjet') as any;
            return await mailjet.sendInvitationEmail({ to, link, role, businessName });
        } catch (error) {
            logger.error('Failed to route invitation via Mailjet, falling back to legacy/log', { error });
             // Fallback logic or just return false
             return false;
        }
    }
}

export const emailService = new EmailService();
