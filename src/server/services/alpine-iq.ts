import { logger } from '@/lib/logger';

const ALPINE_API_KEY = process.env.ALPINE_IQ_API_KEY;
const ALPINE_API_URL = 'https://api.alpineiq.com/v2';

export interface LoyaltyProfile {
    id: string;
    points: number;
    tier: string;
    lastVisit: string;
    phone: string;
}

export async function getLoyaltyProfile(phone: string): Promise<LoyaltyProfile | null> {
    if (!ALPINE_API_KEY) {
        logger.warn('[AlpineIQ] No API key, returning mock data');
        return {
            id: 'mock_user_123',
            points: 420,
            tier: 'Platinum',
            lastVisit: new Date().toISOString(),
            phone
        };
    }

    // Real implementation would fetch from API
    try {
        const response = await fetch(`${ALPINE_API_URL}/consumers?phone=${phone}`, {
            headers: { 'x-api-key': ALPINE_API_KEY }
        });
        if (!response.ok) throw new Error(`Alpine API error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        logger.error('[AlpineIQ] Failed to fetch profile', { error });
        return null;
    }
}

export async function sendSms(phone: string, message: string): Promise<boolean> {
    logger.info(`[AlpineIQ] Sending SMS to ${phone}: "${message}"`);
    
    if (!ALPINE_API_KEY) return true; // Mock success

    try {
        const response = await fetch(`${ALPINE_API_URL}/messages/send`, {
            method: 'POST',
            headers: { 
                'x-api-key': ALPINE_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, message })
        });
        return response.ok;
    } catch (error) {
        logger.error('[AlpineIQ] Failed to send SMS', { error });
        return false;
    }
}
