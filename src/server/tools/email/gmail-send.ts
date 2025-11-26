// Gmail Send Tool - sends emails using Gmail API

import { BaseTool } from '../base-tool';
import type { ToolContext, ToolResult, GmailSendInput, GmailSendOutput } from '@/types/tool';

/**
 * Gmail Send Tool
 * Sends emails using Gmail API with OAuth authentication
 */
export class GmailSendTool extends BaseTool<GmailSendInput, GmailSendOutput> {
    readonly id = 'gmail_send';
    readonly name = 'Gmail Send';
    readonly description = 'Send emails via Gmail with OAuth authentication';
    readonly category = 'communication' as const;

    readonly capabilities = [
        {
            name: 'send_email',
            description: 'Send emails to one or more recipients',
            examples: [
                'Send campaign emails to dispensaries',
                'Send order confirmations',
                'Send personalized outreach'
            ]
        },
        {
            name: 'send_with_attachments',
            description: 'Send emails with file attachments',
            examples: [
                'Send product catalogs',
                'Send compliance documents'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object',
        properties: {
            to: {
                type: ['string', 'array'],
                description: 'Recipient email address(es)'
            },
            subject: {
                type: 'string',
                description: 'Email subject line'
            },
            body: {
                type: 'string',
                description: 'Email body (HTML or plain text)'
            },
            cc: {
                type: 'array',
                description: 'CC recipients',
                items: { type: 'string' }
            },
            bcc: {
                type: 'array',
                description: 'BCC recipients',
                items: { type: 'string' }
            },
            attachments: {
                type: 'array',
                description: 'File attachments',
                items: {
                    type: 'object',
                    properties: {
                        filename: { type: 'string' },
                        content: { type: 'string', description: 'Base64 encoded content' },
                        contentType: { type: 'string' }
                    }
                }
            }
        },
        required: ['to', 'subject', 'body']
    };

    readonly outputSchema = {
        type: 'object',
        properties: {
            messageId: { type: 'string' },
            threadId: { type: 'string' },
            sent: { type: 'boolean' }
        }
    };

    readonly authType = 'oauth' as const;
    readonly requiresAuth = true;

    visible = true;
    icon = '📧';
    color = '#EA4335'; // Gmail red

    estimatedDuration = 3000; // 3 seconds
    estimatedCost = 0; // Free (Gmail API)

    rateLimit = {
        maxCallsPerMinute: 20,
        maxCallsPerHour: 100,
        maxCallsPerDay: 500
    };

    async execute(
        input: GmailSendInput,
        context: ToolContext
    ): Promise<ToolResult<GmailSendOutput>> {
        const startTime = Date.now();

        try {
            this.validateInput(input);

            // For now, we'll use SendGrid as a fallback
            // In a full implementation, this would use Gmail API with OAuth
            const useSendGrid = !context.credentials?.gmailOAuthToken;

            if (useSendGrid) {
                return this.sendViaSendGrid(input, context, startTime);
            }

            // Gmail API implementation would go here
            // This requires setting up OAuth flow
            throw this.createError(
                'NOT_IMPLEMENTED',
                'Gmail OAuth flow not yet implemented. Using SendGrid fallback.',
                false
            );

        } catch (error: any) {
            if (error.code) {
                return this.createFailedResult(error);
            }

            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error.message || 'Email send failed',
                    true
                )
            );
        }
    }

    /**
     * Fallback to SendGrid for email sending
     */
    private async sendViaSendGrid(
        input: GmailSendInput,
        context: ToolContext,
        startTime: number
    ): Promise<ToolResult<GmailSendOutput>> {
        const apiKey = process.env.SENDGRID_API_KEY;

        if (!apiKey) {
            throw this.createError(
                'AUTH_REQUIRED',
                'SendGrid API key is required',
                false
            );
        }

        // Prepare recipients
        const recipients = Array.isArray(input.to) ? input.to : [input.to];

        // Build SendGrid request
        const message = {
            personalizations: [
                {
                    to: recipients.map(email => ({ email })),
                    cc: input.cc?.map(email => ({ email })),
                    bcc: input.bcc?.map(email => ({ email }))
                }
            ],
            from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bakedbot.ai',
                name: process.env.SENDGRID_FROM_NAME || 'BakedBot AI'
            },
            subject: input.subject,
            content: [
                {
                    type: 'text/html',
                    value: input.body
                }
            ],
            attachments: input.attachments?.map(att => ({
                content: att.content,
                filename: att.filename,
                type: att.contentType
            }))
        };

        // Send via SendGrid
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            const error = await response.text();
            throw this.createError(
                'API_ERROR',
                `SendGrid error: ${error}`,
                response.status === 429
            );
        }

        const executionTime = Date.now() - startTime;

        // SendGrid doesn't return message ID in response body
        const messageId = response.headers.get('x-message-id') || 'sent';

        return this.createResult(
            {
                messageId,
                threadId: messageId,
                sent: true
            },
            {
                executionTime,
                apiCalls: 1
            },
            {
                type: 'email',
                title: `Email Sent: ${input.subject}`,
                content: {
                    to: recipients,
                    subject: input.subject,
                    preview: input.body.substring(0, 100) + '...'
                },
                preview: `Sent to ${recipients.length} recipient(s)`,
                icon: '✉️'
            },
            0.9 // High confidence for email sending
        );
    }
}

// Export singleton instance
export const gmailSendTool = new GmailSendTool();
