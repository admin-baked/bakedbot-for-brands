/**
 * WhatsApp Gateway Operations
 *
 * High-level operations for WhatsApp messaging via OpenClaw.
 */

import { logger } from '@/lib/logger';
import { getOpenClawClient, type OpenClawResponse } from './client';
import type {
    SessionStatus,
    SendMessageRequest,
    SendMessageResult,
    MessageHistoryRequest,
    MessageHistoryResult,
} from './types';

/**
 * Get current WhatsApp session status
 */
export async function getSessionStatus(): Promise<OpenClawResponse<SessionStatus>> {
    const client = getOpenClawClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'OpenClaw service not configured',
        };
    }

    return client.request<SessionStatus>('/whatsapp/session/status', 'GET');
}

/**
 * Generate QR code for WhatsApp authentication
 */
export async function generateQRCode(): Promise<OpenClawResponse<{ qrCode: string }>> {
    const client = getOpenClawClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'OpenClaw service not configured',
        };
    }

    logger.info('[OpenClaw] Generating QR code for authentication');

    return client.request<{ qrCode: string }>('/whatsapp/session/qr', 'POST');
}

/**
 * Disconnect WhatsApp session
 */
export async function disconnectSession(): Promise<OpenClawResponse<{ message: string }>> {
    const client = getOpenClawClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'OpenClaw service not configured',
        };
    }

    logger.info('[OpenClaw] Disconnecting WhatsApp session');

    return client.request<{ message: string }>('/whatsapp/session/disconnect', 'POST');
}

/**
 * Send individual WhatsApp message
 */
export async function sendMessage(request: SendMessageRequest): Promise<OpenClawResponse<SendMessageResult>> {
    const client = getOpenClawClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'OpenClaw service not configured',
        };
    }

    logger.info('[OpenClaw] Sending message', {
        to: request.to,
        hasMedia: !!request.mediaUrl,
    });

    return client.request<SendMessageResult>('/whatsapp/message/send', 'POST', {
        to: request.to,
        message: request.message,
        mediaUrl: request.mediaUrl,
    });
}

/**
 * Get message history
 */
export async function getMessageHistory(
    request: MessageHistoryRequest
): Promise<OpenClawResponse<MessageHistoryResult>> {
    const client = getOpenClawClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'OpenClaw service not configured',
        };
    }

    return client.request<MessageHistoryResult>('/whatsapp/message/history', 'POST', {
        phoneNumber: request.phoneNumber,
        limit: request.limit || 50,
        offset: request.offset || 0,
    });
}
