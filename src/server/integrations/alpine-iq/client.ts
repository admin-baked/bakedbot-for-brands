import { logger } from '@/lib/logger';

export interface AlpineLoyaltyProfile {
    id: string;
    points: number;
    tier: string;
    lastVisit: string;
    phone: string;
}

export class AlpineIQClient {
    private apiKey: string;
    private apiUrl = 'https://api.alpineiq.com/v2';
    private mockModeWarningLogged = false;

    constructor() {
        this.apiKey = process.env.ALPINE_IQ_API_KEY || '';
    }

    private warnMockMode(action: string): void {
        if (this.mockModeWarningLogged || this.apiKey) {
            return;
        }

        logger.warn('[AlpineIQ] No API key found in environment, running in Mock Mode', {
            action,
        });
        this.mockModeWarningLogged = true;
    }

    private get headers() {
        return {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async getLoyaltyProfile(phone: string): Promise<AlpineLoyaltyProfile | null> {
        if (!this.apiKey) {
            this.warnMockMode('getLoyaltyProfile');
            return {
                id: 'mock_user_123',
                points: 420,
                tier: 'Platinum',
                lastVisit: new Date().toISOString(),
                phone
            };
        }

        try {
            const response = await fetch(`${this.apiUrl}/consumers?phone=${phone}`, {
                headers: this.headers
            });

            if (!response.ok) {
                // If 404, just return null, otherwise log error
                if (response.status !== 404) {
                    throw new Error(`Alpine API error: ${response.statusText}`);
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            logger.error('[AlpineIQ] Failed to fetch profile', { error });
            return null;
        }
    }

    async sendSms(phone: string, message: string): Promise<boolean> {
        logger.info(`[AlpineIQ] Sending SMS to ${phone}: "${message}"`);

        if (!this.apiKey) {
            this.warnMockMode('sendSms');
            return true; // Mock success
        }

        try {
            const response = await fetch(`${this.apiUrl}/messages/send`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ phone, message })
            });
            return response.ok;
        } catch (error) {
            logger.error('[AlpineIQ] Failed to send SMS', { error });
            return false;
        }
    }
}

// Export singleton for backward compatibility logic if needed, 
// though manual instantiation is preferred in modern services.
export const alpineClient = new AlpineIQClient();
