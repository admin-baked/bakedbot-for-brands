/**
 * Leafbuyer SMS Service
 * Handles sending SMS notifications via Leafbuyer Texting API
 * https://www.leafbuyer.com/texting
 */

import { logger } from '@/lib/logger';
import { UsageService } from '@/server/services/usage';

const LEAFBUYER_API_KEY = process.env.LEAFBUYER_API_KEY;
const LEAFBUYER_API_SECRET = process.env.LEAFBUYER_API_SECRET;
const LEAFBUYER_API_URL = process.env.LEAFBUYER_API_URL || 'https://api.leafbuyer.com/v1';

interface SMSOptions {
    to: string;
    message: string;
    from?: string; // Optional sender ID
    orgId?: string; // For usage tracking
}

interface LeafbuyerResponse {
    success: boolean;
    message_id?: string;
    error?: string;
}

export class LeafbuyerService {
    /**
     * Send SMS via Leafbuyer API (public method for direct use)
     */
    async sendMessage({ to, message, from, orgId }: SMSOptions): Promise<boolean> {
        if (!LEAFBUYER_API_KEY || !LEAFBUYER_API_SECRET) {
            logger.warn('[SMS_LEAFBUYER] Credentials missing - mock mode', { to });
            // In development, log the message via structured logger
            if (process.env.NODE_ENV !== 'production') {
                logger.debug('[SMS_LEAFBUYER] Mock message', { to, message });
            }
            return true;
        }

        try {
            const response = await fetch(`${LEAFBUYER_API_URL}/sms/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': LEAFBUYER_API_KEY,
                    'X-API-Secret': LEAFBUYER_API_SECRET,
                },
                body: JSON.stringify({
                    to,
                    message,
                    from: from || 'BakedBot',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                logger.error('Leafbuyer API Error:', {
                    status: response.status,
                    error: errorData
                });
                return false;
            }

            const data: LeafbuyerResponse = await response.json();

            if (!data.success) {
                logger.error('Leafbuyer send failed:', { error: data.error });
                return false;
            }

            logger.info('SMS sent successfully via Leafbuyer', {
                messageId: data.message_id,
                to
            });

            if (orgId) {
                UsageService.increment(orgId, 'messages_sent');
            }

            return true;

        } catch (error) {
            logger.error('SMS Send Error:', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    /**
     * Send order ready notification
     */
    async sendOrderReady(order: any, phoneNumber: string): Promise<boolean> {
        const message = `Hi! Your order #${order.id.slice(0, 8)} is READY for pickup at ${order.dispensaryName || 'the dispensary'}. Please bring valid ID. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, message });
    }

    /**
     * Send order status update
     */
    async sendOrderUpdate(order: any, status: string, phoneNumber: string): Promise<boolean> {
        const message = `Update for order #${order.id.slice(0, 8)}: Status is now ${status.toUpperCase()}. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, message });
    }

    /**
     * Send delivery notification
     */
    async sendDeliveryNotification(order: any, estimatedTime: string, phoneNumber: string): Promise<boolean> {
        const message = `Your order #${order.id.slice(0, 8)} is out for delivery! Estimated arrival: ${estimatedTime}. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, message });
    }

    /**
     * Send promotional message (must comply with cannabis marketing regulations)
     */
    async sendPromotion(message: string, phoneNumber: string): Promise<boolean> {
        // Add SMS disclaimer for cannabis marketing
        const compliantMessage = `${message} Reply STOP to opt out. Must be 21+.`;
        return this.sendMessage({ to: phoneNumber, message: compliantMessage });
    }
}

export const leafbuyerService = new LeafbuyerService();
