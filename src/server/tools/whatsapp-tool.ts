/**
 * WhatsApp Tool - OpenClaw Integration
 *
 * Production WhatsApp messaging capability for Agent Chat.
 * Uses OpenClaw gateway for WhatsApp Web automation.
 */

import { BaseTool } from './base-tool';
import type { ToolContext, ToolResult, ToolAuthType } from '@/types/tool';
import { logger } from '@/lib/logger';
import { sendMessage, getSessionStatus, isOpenClawAvailable } from '@/server/services/openclaw';

// --- Types ---

export interface WhatsAppSendInput {
    to: string;
    message: string;
    mediaUrl?: string;
}

export interface WhatsAppSendOutput {
    messageId: string;
    sent: boolean;
    recipient: string;
    timestamp: string;
    sessionConnected: boolean;
}

// --- WhatsApp Tool Implementation ---

export class WhatsAppTool extends BaseTool<WhatsAppSendInput, WhatsAppSendOutput> {
    readonly id = 'whatsapp.send';
    readonly name = 'Send WhatsApp Message';
    readonly description = 'Send WhatsApp messages via OpenClaw gateway. Supports text and media messages.';
    readonly category = 'communication' as const;
    readonly version = '1.0.0';

    readonly authType: ToolAuthType = 'api_key';
    readonly requiresAuth = true;
    isDefault = true;

    readonly capabilities = [
        {
            name: 'Send WhatsApp Message',
            description: 'Send a text message to a WhatsApp number',
            examples: [
                'Send order confirmation to customer',
                'Send promotional message to subscriber',
                'Send appointment reminder'
            ]
        },
        {
            name: 'Send Media Message',
            description: 'Send images or documents via WhatsApp',
            examples: [
                'Send product image to customer',
                'Send menu PDF to interested lead'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object' as const,
        properties: {
            to: {
                type: 'string',
                description: 'Recipient phone number with country code (e.g., 13155551234)'
            },
            message: {
                type: 'string',
                description: 'Message content to send'
            },
            mediaUrl: {
                type: 'string',
                description: 'Optional URL to image or document to attach'
            },
        },
        required: ['to', 'message']
    };

    readonly outputSchema = {
        type: 'object' as const,
        properties: {
            messageId: { type: 'string', description: 'WhatsApp message ID' },
            sent: { type: 'boolean', description: 'Whether message was sent' },
            recipient: { type: 'string', description: 'Recipient phone number' },
            timestamp: { type: 'string', description: 'Send timestamp' },
            sessionConnected: { type: 'boolean', description: 'WhatsApp session status' }
        }
    };

    estimatedDuration = 5000; // 5 seconds
    icon = 'message-circle';
    color = '#25D366'; // WhatsApp green

    async execute(input: WhatsAppSendInput, context: ToolContext): Promise<ToolResult<WhatsAppSendOutput>> {
        const startTime = Date.now();

        try {
            // Validate input
            if (!input.to || !input.message) {
                throw this.createError('INVALID_INPUT', 'Missing required fields: to, message', false);
            }

            // Normalize phone number (remove spaces, dashes, leading +)
            const normalizedPhone = input.to.replace(/[\s\-\+\(\)]/g, '');

            // Check if OpenClaw is configured
            if (!isOpenClawAvailable()) {
                throw this.createError(
                    'CONFIG_ERROR',
                    'OpenClaw WhatsApp gateway not configured. Set OPENCLAW_API_URL and OPENCLAW_API_KEY.',
                    false
                );
            }

            // Check session status first
            const sessionResult = await getSessionStatus();
            if (!sessionResult.success || !sessionResult.data?.connected) {
                throw this.createError(
                    'SESSION_ERROR',
                    'WhatsApp session not connected. Please scan QR code in CEO Dashboard → WhatsApp tab.',
                    false
                );
            }

            logger.info('[WhatsApp Tool] Sending message', {
                to: normalizedPhone,
                hasMedia: !!input.mediaUrl,
            });

            // Send the message
            const result = await sendMessage({
                to: normalizedPhone,
                message: input.message,
                mediaUrl: input.mediaUrl,
            });

            if (!result.success) {
                throw this.createError(
                    'API_ERROR',
                    result.error || 'Failed to send WhatsApp message',
                    true
                );
            }

            const messageId = result.data?.messageId || `wa_${Date.now()}`;

            logger.info('[WhatsApp Tool] Message sent successfully', {
                messageId,
                to: normalizedPhone,
            });

            const output: WhatsAppSendOutput = {
                messageId,
                sent: true,
                recipient: normalizedPhone,
                timestamp: new Date().toISOString(),
                sessionConnected: true,
            };

            return this.createResult(
                output,
                {
                    executionTime: Date.now() - startTime,
                    apiCalls: 2, // session check + send
                },
                {
                    type: 'whatsapp',
                    title: `WhatsApp Sent: ${normalizedPhone}`,
                    content: {
                        to: normalizedPhone,
                        message: input.message,
                        hasMedia: !!input.mediaUrl,
                    },
                    preview: `Message sent to ${normalizedPhone}`,
                    icon: 'message-circle'
                },
                1.0 // High confidence for successful send
            );

        } catch (error: unknown) {
            logger.error('[WhatsApp Tool] Send failed:', error);

            if (error && typeof error === 'object' && 'code' in error) {
                return this.createFailedResult(error as any);
            }

            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error instanceof Error ? error.message : 'Failed to send WhatsApp message',
                    true
                )
            );
        }
    }
}

// --- Singleton Export ---

let whatsappTool: WhatsAppTool | null = null;

export function getWhatsAppTool(): WhatsAppTool {
    if (!whatsappTool) {
        whatsappTool = new WhatsAppTool();
    }
    return whatsappTool;
}
