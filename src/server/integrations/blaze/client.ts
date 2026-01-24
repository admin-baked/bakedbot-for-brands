import { logger } from '@/lib/logger';
import { BlazeInventory, BlazeTransaction, BlazeMember } from './types';

const BLAZE_API_URL = 'https://api.blaze.me/v1';

export class BlazeClient {
    private partnerKey: string;
    private dispensaryKey: string;

    constructor(dispatcherKey: string) {
        this.partnerKey = process.env.BLAZE_PARTNER_KEY || '';
        this.dispensaryKey = dispatcherKey;

        if (!this.partnerKey) {
            logger.warn('[BlazeClient] Missing BLAZE_PARTNER_KEY');
        }
    }

    private get headers() {
        return {
            'Authorization': this.partnerKey,
            'Partner-Key': this.partnerKey,
            'Authorization-Token': this.dispensaryKey,
            'Content-Type': 'application/json'
        };
    }

    async getInventory(limit = 50): Promise<BlazeInventory[]> {
        if (!this.partnerKey || !this.dispensaryKey) {
            logger.warn('[BlazeClient] Missing keys, returning empty inventory');
            return [];
        }

        try {
            const response = await fetch(`${BLAZE_API_URL}/inventory?limit=${limit}`, {
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Blaze API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.values || [];
        } catch (error) {
            logger.error('[BlazeClient] Failed to fetch inventory', { error });
            return [];
        }
    }

    async getMember(memberId: string): Promise<BlazeMember | null> {
        if (!this.partnerKey || !this.dispensaryKey) return null;

        try {
            const response = await fetch(`${BLAZE_API_URL}/partner/members/${memberId}`, {
                headers: this.headers
            });

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            logger.error('[BlazeClient] Failed to fetch member', { error });
            return null;
        }
    }
}
