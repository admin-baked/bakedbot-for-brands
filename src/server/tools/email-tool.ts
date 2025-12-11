/**
 * Email Tool - SendGrid Integration
 * 
 * Production email sending capability for Agent Chat.
 * Uses SendGrid API for reliable email delivery.
 */

import { BaseTool } from './base-tool';
import type { ToolContext, ToolResult, ToolAuthType } from '@/types/tool';
import { logger } from '@/lib/logger';

// --- Types ---

export interface EmailSendInput {
    to: string | string[];
    subject: string;
    body: string;
    bodyType?: 'text' | 'html';
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: string; // base64
        contentType: string;
    }>;
}

export interface EmailSendOutput {
    messageId: string;
    sent: boolean;
    recipients: string[];
    timestamp: string;
}

// --- Email Tool Implementation ---

export class EmailTool extends BaseTool<EmailSendInput, EmailSendOutput> {
    readonly id = 'email.send';
    readonly name = 'Send Email';
    readonly description = 'Send emails via SendGrid. Supports HTML content, attachments, and multiple recipients.';
    readonly category = 'communication' as const;
    readonly version = '1.0.0';

    readonly authType: ToolAuthType = 'api_key';
    readonly requiresAuth = true;
    isDefault = true;

    readonly capabilities = [
        {
            name: 'Send Email',
            description: 'Send an email to one or more recipients',
            examples: [
                'Send welcome emails to new signups',
                'Send promotional campaign to customer list',
                'Send notification to team members'
            ]
        },
        {
            name: 'HTML Emails',
            description: 'Send rich HTML emails with formatting',
            examples: [
                'Send newsletter with images',
                'Send branded marketing email'
            ]
        },
        {
            name: 'Attachments',
            description: 'Include file attachments in emails',
            examples: [
                'Send report as PDF attachment',
                'Share product catalog'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object' as const,
        properties: {
            to: { type: 'string', description: 'Recipient email address(es)' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'Email body content' },
            bodyType: { type: 'string', description: 'Content type (text or html)', enum: ['text', 'html'] },
            cc: { type: 'array', description: 'CC recipients' },
            bcc: { type: 'array', description: 'BCC recipients' },
            replyTo: { type: 'string', description: 'Reply-to address' },
        },
        required: ['to', 'subject', 'body']
    };

    readonly outputSchema = {
        type: 'object' as const,
        properties: {
            messageId: { type: 'string', description: 'SendGrid message ID' },
            sent: { type: 'boolean', description: 'Whether email was sent' },
            recipients: { type: 'array', description: 'List of recipients' },
            timestamp: { type: 'string', description: 'Send timestamp' }
        }
    };

    estimatedDuration = 3000; // 3 seconds
    icon = 'mail';
    color = '#00D4AA';

    async execute(input: EmailSendInput, context: ToolContext): Promise<ToolResult<EmailSendOutput>> {
        const startTime = Date.now();

        try {
            // Validate input
            if (!input.to || !input.subject || !input.body) {
                throw this.createError('INVALID_INPUT', 'Missing required fields: to, subject, body', false);
            }

            // Get SendGrid API key from environment
            const apiKey = process.env.SENDGRID_API_KEY;
            if (!apiKey) {
                throw this.createError('CONFIG_ERROR', 'SENDGRID_API_KEY not configured', false);
            }

            // Normalize recipients
            const recipients = Array.isArray(input.to) ? input.to : [input.to];

            // Build SendGrid payload
            const payload = {
                personalizations: [{
                    to: recipients.map(email => ({ email })),
                    cc: input.cc?.map(email => ({ email })),
                    bcc: input.bcc?.map(email => ({ email })),
                }],
                from: {
                    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@bakedbot.ai',
                    name: process.env.SENDGRID_FROM_NAME || 'BakedBot'
                },
                reply_to: input.replyTo ? { email: input.replyTo } : undefined,
                subject: input.subject,
                content: [{
                    type: input.bodyType === 'html' ? 'text/html' : 'text/plain',
                    value: input.body
                }],
                attachments: input.attachments?.map(att => ({
                    content: att.content,
                    filename: att.filename,
                    type: att.contentType,
                    disposition: 'attachment'
                }))
            };

            // Send via SendGrid API
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('SendGrid API error:', { status: response.status, error: errorText });
                throw this.createError('API_ERROR', `SendGrid error: ${response.status}`, true);
            }

            // Get message ID from header
            const messageId = response.headers.get('x-message-id') || `msg_${Date.now()}`;

            logger.info('Email sent successfully', {
                messageId,
                recipients: recipients.length,
                subject: input.subject
            });

            const output: EmailSendOutput = {
                messageId,
                sent: true,
                recipients,
                timestamp: new Date().toISOString()
            };

            return this.createResult(
                output,
                {
                    executionTime: Date.now() - startTime,
                    apiCalls: 1
                },
                {
                    type: 'email',
                    title: `Email Sent: ${input.subject}`,
                    content: {
                        to: recipients.join(', '),
                        subject: input.subject,
                        preview: input.body.substring(0, 200) + (input.body.length > 200 ? '...' : '')
                    },
                    preview: `Sent to ${recipients.length} recipient(s)`,
                    icon: 'mail'
                },
                1.0 // High confidence for successful send
            );

        } catch (error: any) {
            logger.error('Email send failed:', error);

            if (error.code) {
                return this.createFailedResult(error);
            }

            return this.createFailedResult(
                this.createError('EXECUTION_ERROR', error.message || 'Failed to send email', true)
            );
        }
    }
}

// --- Singleton Export ---

let emailTool: EmailTool | null = null;

export function getEmailTool(): EmailTool {
    if (!emailTool) {
        emailTool = new EmailTool();
    }
    return emailTool;
}
