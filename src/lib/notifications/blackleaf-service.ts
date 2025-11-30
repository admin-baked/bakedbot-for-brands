/**
 * SMS Service (BlackLeaf.io)
 * Handles sending SMS notifications for cannabis brands
 */

import { logger } from '@/lib/logger';

const BLACKLEAF_API_KEY = process.env.BLACKLEAF_API_KEY;
const BLACKLEAF_BASE_URL = process.env.BLACKLEAF_BASE_URL || 'https://api.blackleaf.io';

interface SMSOptions {
    to: string;
    body: string;
    imageUrl?: string;
}

export class BlackleafService {
    private async sendMessage({ to, body, imageUrl }: SMSOptions): Promise<boolean> {
        if (!BLACKLEAF_API_KEY) {
            logger.warn('BLACKLEAF_API_KEY is missing. Mocking SMS send:', { to, body });
            return true;
        }

        try {
            // Default image if none provided (required by some MMS endpoints, optional here based on docs)
            // Using a placeholder or the provided image
            const image = imageUrl || 'https://bakedbot.ai/assets/logo-small.png';

            const params = new URLSearchParams({
                to,
                body,
                image,
                apiKey: BLACKLEAF_API_KEY,
            });

            const url = `${BLACKLEAF_BASE_URL}/api/messaging/send/?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.status !== 'success') {
                logger.error('BlackLeaf Error:', { status: response.status, data });
                return false;
            }

            return true;
        } catch (error) {
            logger.error('SMS Send Error:', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    async sendOrderReady(order: any, phoneNumber: string) {
        const body = `Your order #${order.id.slice(0, 8)} is READY for pickup at ${order.dispensaryName || 'the dispensary'}. Please bring ID. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, body });
    }

    async sendOrderUpdate(order: any, status: string, phoneNumber: string) {
        const body = `Update for order #${order.id.slice(0, 8)}: Status is now ${status.toUpperCase()}. Reply STOP to opt out.`;
        return this.sendMessage({ to: phoneNumber, body });
    }
}

export const blackleafService = new BlackleafService();
