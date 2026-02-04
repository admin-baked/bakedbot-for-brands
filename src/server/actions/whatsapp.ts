'use server';

/**
 * WhatsApp Messaging Server Actions
 * Super Users Only - Customer support & marketing campaigns
 */

import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    getSessionStatus,
    generateQRCode,
    disconnectSession,
    sendMessage,
    sendCampaign,
    getMessageHistory,
    type SendMessageRequest,
    type CampaignConfig,
    type MessageHistoryRequest,
} from '@/server/services/openclaw';

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Get WhatsApp session status
 */
export async function getWhatsAppSessionAction(): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Get session status', { userId: user.uid });

        const response = await getSessionStatus();
        return {
            success: response.success,
            data: response.data,
            error: response.error,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] getSession failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate QR code for WhatsApp authentication
 */
export async function generateWhatsAppQRAction(): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Generate QR code', { userId: user.uid });

        const response = await generateQRCode();
        return {
            success: response.success,
            data: response.data,
            error: response.error,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] generateQR failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Disconnect WhatsApp session
 */
export async function disconnectWhatsAppAction(): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Disconnect session', { userId: user.uid });

        const response = await disconnectSession();
        return {
            success: response.success,
            data: response.data,
            error: response.error,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] disconnect failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send individual WhatsApp message
 */
export async function sendWhatsAppMessageAction(
    request: SendMessageRequest
): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Send message', {
            userId: user.uid,
            to: request.to,
        });

        const response = await sendMessage(request);
        return {
            success: response.success,
            data: response.data,
            error: response.error,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] sendMessage failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send WhatsApp campaign (bulk messages)
 */
export async function sendWhatsAppCampaignAction(
    config: CampaignConfig
): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Send campaign', {
            userId: user.uid,
            recipientCount: config.recipients.length,
        });

        const result = await sendCampaign(config);
        return {
            success: true,
            data: result,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] sendCampaign failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get message history
 */
export async function getWhatsAppHistoryAction(
    request: MessageHistoryRequest
): Promise<ActionResult> {
    try {
        const user = await requireSuperUser();
        logger.info('[WhatsApp Action] Get history', {
            userId: user.uid,
            filter: request.phoneNumber || 'all',
        });

        const response = await getMessageHistory(request);
        return {
            success: response.success,
            data: response.data,
            error: response.error,
        };
    } catch (error) {
        logger.error('[WhatsApp Action] getHistory failed', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
