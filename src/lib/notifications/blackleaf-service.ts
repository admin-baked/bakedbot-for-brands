/**
 * SMS Service (BlackLeaf.io)
 * Handles sending SMS notifications for cannabis brands
 * API Documentation: https://api.blackleaf.io/
 */

import { logger } from '@/lib/logger';

const BLACKLEAF_API_KEY = process.env.BLACKLEAF_API_KEY;
const BLACKLEAF_BASE_URL = process.env.BLACKLEAF_BASE_URL || 'https://api.blackleaf.io';

interface SMSOptions {
    to: string;
    body: string;
    imageUrl?: string;
}

interface BlackleafResponse {
    status: 'success' | 'error';
    message?: string;
    messageId?: string;
    error?: string;
}

export class BlackleafService {
    /**
     * Send SMS/MMS via Blackleaf API
     * Uses GET request with query parameters as per Blackleaf API spec
     */
    private async sendMessage({ to, body, imageUrl }: SMSOptions): Promise<boolean> {
        if (!BLACKLEAF_API_KEY) {
            logger.warn('BLACKLEAF_API_KEY is missing. Mocking SMS send:', { to, body });
            // In development, log the message
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[MOCK SMS to ${to}]: ${body}`);
            }
            return true;
        }

        try {
            // Normalize phone number (remove spaces, dashes, etc.)
            const normalizedPhone = to.replace(/\D/g, '');

            // Ensure phone number has country code
            const phoneWithCountryCode = normalizedPhone.startsWith('1')
                ? normalizedPhone
                : `1${normalizedPhone}`;

            // Build query parameters
            const params = new URLSearchParams({
                apiKey: BLACKLEAF_API_KEY,
                to: phoneWithCountryCode,
                body,
            });

            // Add image if provided (MMS)
            if (imageUrl) {
                params.append('image', imageUrl);
            }

            const url = `${BLACKLEAF_BASE_URL}/api/messaging/send/?${params.toString()}`;

            logger.info('Sending SMS via Blackleaf', {
                to: phoneWithCountryCode,
                bodyLength: body.length,
                hasImage: !!imageUrl,
            });

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const data: BlackleafResponse = await response.json().catch(() => ({
                status: 'error',
                error: 'Failed to parse response',
            }));

            if (!response.ok) {
                logger.error('Blackleaf API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    data
                });
                return false;
            }

            if (data.status !== 'success') {
                logger.error('Blackleaf send failed:', {
                    error: data.error || data.message,
                    to: phoneWithCountryCode,
                });
                return false;
            }

            logger.info('SMS sent successfully via Blackleaf', {
                messageId: data.messageId,
                to: phoneWithCountryCode,
            });

            return true;
        } catch (error) {
            logger.error('Blackleaf SMS Send Error:', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    /**
     * Send order ready notification
     */
    async sendOrderReady(order: any, phoneNumber: string): Promise<boolean> {
        const body = `Hi! Your order #${order.id.slice(0, 8)} is READY for pickup at ${order.dispensaryName || 'the dispensary'}. Please bring valid ID. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, body });
    }

    /**
     * Send order status update
     */
    async sendOrderUpdate(order: any, status: string, phoneNumber: string): Promise<boolean> {
        const body = `Update for order #${order.id.slice(0, 8)}: Status is now ${status.toUpperCase()}. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, body });
    }

    /**
     * Send delivery notification
     */
    async sendDeliveryNotification(order: any, estimatedTime: string, phoneNumber: string): Promise<boolean> {
        const body = `Your order #${order.id.slice(0, 8)} is out for delivery! Estimated arrival: ${estimatedTime}. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, body });
    }

    /**
     * Send promotional message (must comply with cannabis marketing regulations)
     */
    async sendPromotion(message: string, phoneNumber: string, imageUrl?: string): Promise<boolean> {
        // Add SMS disclaimer for cannabis marketing compliance
        const compliantMessage = `${message} Reply STOP to opt out. Must be 21+.`;
        return this.sendMessage({
            to: phoneNumber,
            body: compliantMessage,
            imageUrl
        });
    }

    /**
     * Send custom SMS with optional image (MMS)
     */
    async sendCustomMessage(to: string, body: string, imageUrl?: string): Promise<boolean> {
        return this.sendMessage({ to, body, imageUrl });
    }
}

export const blackleafService = new BlackleafService();
