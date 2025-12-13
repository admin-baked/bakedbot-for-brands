import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { logger } from '@/lib/logger';
import { UsageService } from '@/server/services/usage';

// NOTE: This file is a compatibility wrapper.
// Usage of Twilio has been migrated to BlackLeaf.io
// This ensures legacy calls to `sendSms` still work but use the new provider.

export interface SmsPayload {
    to: string;
    body: string;
    brandId?: string; // For usage tracking
}

/**
 * Sends an SMS via BlackLeaf (formerly Twilio).
 * Handles usage logging.
 */
export async function sendSms(payload: SmsPayload): Promise<{ success: boolean; messageId?: string }> {
    try {
        logger.info('[SmsCompat] Forwarding SMS to BlackLeaf', { to: payload.to });

        const success = await blackleafService.sendCustomMessage(payload.to, payload.body);

        if (success) {
            // Bill to brand if ID provided
            if (payload.brandId) {
                await UsageService.increment(payload.brandId, 'sms_sent');
            }
            return { success: true, messageId: `bl-${Date.now()}` };
        }

        return { success: false };

    } catch (error: any) {
        logger.error('Failed to send SMS (BlackLeaf Compat)', { error: error.message });
        return { success: false };
    }
}
