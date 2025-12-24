'use server';

/**
 * Autoresponder Service
 * Triggers welcome emails on signup based on user role
 * Uses Mailjet/SendGrid dispatcher based on admin setting
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getWelcomeEmailTemplate, SignupRole, WelcomeEmailData } from '@/lib/email/autoresponder-templates';
import { logger } from '@/lib/logger';

// Email dispatch function - dynamically imports to avoid server/client issues
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
        // Import the email dispatcher to use the active provider (Mailjet/SendGrid)
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        
        // Use the order confirmation email structure for now
        // This sends via the active provider (Mailjet or SendGrid)
        const result = await sendOrderConfirmationEmail({
            orderId: `WELCOME-${Date.now()}`,
            customerEmail: to,
            customerName: to.split('@')[0],
            total: 0,
            items: [{ name: subject, qty: 1, price: 0 }],
            retailerName: 'BakedBot',
            pickupAddress: htmlContent // Using this field to carry HTML content
        });

        return result;
    } catch (error) {
        logger.error('Failed to send welcome email via dispatcher', { error, to });
        return false;
    }
}

/**
 * Trigger welcome email for a new signup
 */
export async function triggerWelcomeEmail(
    userId: string,
    email: string,
    role: SignupRole,
    name?: string,
    entityName?: string // brandName or dispensaryName
): Promise<{ success: boolean; message: string }> {
    try {
        logger.info('Triggering welcome email', { userId, email, role });

        // Build template data
        const templateData: WelcomeEmailData = {
            recipientEmail: email,
            recipientName: name || email.split('@')[0],
            role,
            brandName: role === 'brand' ? entityName : undefined,
            dispensaryName: role === 'dispensary' ? entityName : undefined,
        };

        // Generate role-specific template
        const template = getWelcomeEmailTemplate(templateData);

        // Send email via dispatcher
        const sent = await sendEmail(email, template.subject, template.htmlContent);

        // Log to Firestore for tracking
        const firestore = getAdminFirestore();
        await firestore.collection('email_logs').add({
            type: 'welcome',
            userId,
            email,
            role,
            subject: template.subject,
            sentAt: new Date(),
            success: sent,
            provider: 'dispatcher' // Will be Mailjet or SendGrid based on setting
        });

        if (sent) {
            logger.info('Welcome email sent successfully', { userId, email, role });
            return { success: true, message: `Welcome email sent to ${email}` };
        } else {
            logger.warn('Welcome email failed to send', { userId, email, role });
            return { success: false, message: 'Email dispatch failed' };
        }

    } catch (error: any) {
        logger.error('Error in triggerWelcomeEmail', { error: error.message, userId, email });
        return { success: false, message: error.message || 'Unknown error' };
    }
}

/**
 * Trigger welcome email for Brand signup
 */
export async function sendBrandWelcomeEmail(
    userId: string,
    email: string,
    name?: string,
    brandName?: string
): Promise<{ success: boolean; message: string }> {
    return triggerWelcomeEmail(userId, email, 'brand', name, brandName);
}

/**
 * Trigger welcome email for Dispensary signup
 */
export async function sendDispensaryWelcomeEmail(
    userId: string,
    email: string,
    name?: string,
    dispensaryName?: string
): Promise<{ success: boolean; message: string }> {
    return triggerWelcomeEmail(userId, email, 'dispensary', name, dispensaryName);
}

/**
 * Trigger welcome email for Customer signup
 */
export async function sendCustomerWelcomeEmail(
    userId: string,
    email: string,
    name?: string
): Promise<{ success: boolean; message: string }> {
    return triggerWelcomeEmail(userId, email, 'customer', name);
}

/**
 * Check if welcome email was already sent to avoid duplicates
 */
export async function wasWelcomeEmailSent(userId: string): Promise<boolean> {
    try {
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('email_logs')
            .where('userId', '==', userId)
            .where('type', '==', 'welcome')
            .where('success', '==', true)
            .limit(1)
            .get();

        return !snapshot.empty;
    } catch (error) {
        logger.error('Error checking welcome email status', { error, userId });
        return false; // Allow sending if check fails
    }
}
