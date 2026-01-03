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
        try {
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');
            const result = await sendGenericEmail({
                to,
                subject,
                htmlBody: html,
                textBody: html.replace(/<[^>]*>/g, ''), // Basic strip tags
            });

            if (!result.success) {
                logger.error('Dispatcher failed to send email', { error: result.error });
                return false;
            }
            return true; 
        } catch (error) {
            logger.error('Email Dispatch Error:', error instanceof Error ? error : new Error(String(error)));
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
        // Construct standard invite HTML
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2e7d32;">You've been invited!</h1>
        <p>You have been invited to join <strong>${businessName || 'BakedBot'}</strong> as a <strong>${role}</strong>.</p>
        
        <p style="margin: 20px 0;">
          <a href="${link}" style="background-color: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        </p>

        <p>Or copy this link:</p>
        <p style="background-color: #f5f5f5; padding: 10px; font-family: monospace;">${link}</p>
        
        <p style="font-size: 12px; color: #666; margin-top: 30px;">
          This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `;

        try {
            // Use central dispatcher to route via active provider (Mailjet/SendGrid)
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');
            const result = await sendGenericEmail({
                to,
                subject: `Invitation to join ${businessName || 'BakedBot'}`,
                htmlBody: html,
                textBody: `You've been invited to join ${businessName || 'BakedBot'}. Click here to accept: ${link}`,
                fromEmail: 'hello@bakedbot.ai', // Use hello@ for invites as requested
                fromName: 'BakedBot Team'
            });

            if (!result.success) {
                logger.error('Failed to send invitation email via dispatcher', { error: result.error });
                return false;
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to route invitation email', { error });
            return false;
        }
    }
}

export const emailService = new EmailService();
