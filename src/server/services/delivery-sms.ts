/**
 * Delivery SMS Service — Blackleaf Integration
 *
 * Sends transactional SMS/MMS to customers at delivery milestones:
 *   - En-route: driver started delivery + QR code link
 *   - Delivered: order completed confirmation
 *
 * All callers use setImmediate() — SMS never blocks status updates.
 * Fails silently when BLACKLEAF_API_KEY is not configured.
 */

import { logger } from '@/lib/logger';

const BLACKLEAF_BASE_URL = process.env.BLACKLEAF_BASE_URL || 'https://api.blackleaf.io';
const BLACKLEAF_API_KEY = process.env.BLACKLEAF_API_KEY;

interface SmsResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Core Blackleaf API call. Supports MMS via mediaUrl.
 */
async function sendBlackleafMessage(
    to: string,
    message: string,
    mediaUrl?: string
): Promise<SmsResult> {
    if (!BLACKLEAF_API_KEY) {
        logger.warn('BLACKLEAF_API_KEY not configured — SMS skipped', { to });
        return { success: false, error: 'SMS not configured' };
    }

    // Normalize phone — digits only
    const normalizedPhone = to.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
        return { success: false, error: 'Invalid phone number' };
    }

    try {
        const body: Record<string, string> = {
            to: normalizedPhone,
            message,
        };

        if (mediaUrl) {
            body.media_url = mediaUrl;
        }

        const response = await fetch(`${BLACKLEAF_BASE_URL}/api/v1/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${BLACKLEAF_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Blackleaf ${response.status}: ${errorText}`);
        }

        const data = await response.json().catch(() => ({}));
        return { success: true, messageId: data.id || data.message_id };
    } catch (error) {
        logger.error('Blackleaf SMS failed', { error, to: normalizedPhone });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'SMS send failed',
        };
    }
}

/**
 * Send "driver is on the way" SMS when delivery starts.
 * Includes QR code page link so customer can show QR to driver at door.
 */
export async function sendEnRouteSms(
    phone: string,
    orgName: string,
    deliveryId: string
): Promise<SmsResult> {
    const qrUrl = `https://bakedbot.ai/order-qr/${deliveryId}`;
    const trackUrl = `https://bakedbot.ai/track/${deliveryId}`;
    const message =
        `Your ${orgName} order is on the way! 🚗\n` +
        `Show this QR when your driver arrives: ${qrUrl}\n` +
        `Track delivery: ${trackUrl}`;
    return sendBlackleafMessage(phone, message);
}

/**
 * Send delivery completed confirmation SMS.
 */
export async function sendDeliveredSms(
    phone: string,
    orgName: string
): Promise<SmsResult> {
    const message =
        `Your ${orgName} order has been delivered. Thank you! 🌿\n` +
        `Questions? Reply to this message or visit bakedbot.ai`;
    return sendBlackleafMessage(phone, message);
}
