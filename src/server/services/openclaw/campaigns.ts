/**
 * WhatsApp Campaign Manager
 *
 * Bulk messaging with rate limiting to avoid WhatsApp bans.
 */

import { logger } from '@/lib/logger';
import { sendMessage } from './gateway';
import type { CampaignResult } from './types';

export interface CampaignConfig {
    recipients: string[]; // Phone numbers
    message: string;
    mediaUrl?: string;
    rateLimit?: number; // Messages per minute (default: 20)
    batchSize?: number; // Concurrent messages (default: 5)
}

/**
 * Send bulk WhatsApp campaign with rate limiting
 *
 * Best practices:
 * - Max 20-30 messages/minute to avoid bans
 * - Batch size 5 for safety
 * - Delay between batches
 */
export async function sendCampaign(config: CampaignConfig): Promise<CampaignResult> {
    const {
        recipients,
        message,
        mediaUrl,
        rateLimit = 20,
        batchSize = 5,
    } = config;

    const delayMs = (60 / rateLimit) * 1000; // Delay per message
    const results: CampaignResult = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [],
    };

    logger.info('[OpenClaw Campaign] Starting', {
        recipients: recipients.length,
        rateLimit,
        batchSize,
    });

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(
            batch.map(async (recipient) => {
                try {
                    const response = await sendMessage({
                        to: recipient,
                        message,
                        mediaUrl,
                    });

                    if (response.success) {
                        results.sent++;
                    } else {
                        results.failed++;
                        results.errors.push(`${recipient}: ${response.error}`);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push(
                        `${recipient}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            })
        );

        // Delay between batches
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs * batchSize));
        }
    }

    logger.info('[OpenClaw Campaign] Complete', results);
    return results;
}
