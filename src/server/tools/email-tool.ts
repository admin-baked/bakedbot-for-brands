/**
 * Email Tool - Mailjet Integration
 *
 * Production email sending capability for Agent Chat.
 * Uses Mailjet API for reliable email delivery.
 */

import { BaseTool } from './base-tool';
import type { ToolContext, ToolResult, ToolAuthType } from '@/types/tool';
import { logger } from '@/lib/logger';
import { sendGenericEmail } from '@/lib/email/mailjet';

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
    readonly description = 'Send emails via Mailjet. Supports HTML content and multiple recipients.';
    readonly category = 'communication' as const;
    readonly version = '1.1.0';

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
            messageId: { type: 'string', description: 'Mailjet message ID' },
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

            // Check Mailjet API keys from environment
            const apiKey = process.env.MAILJET_API_KEY;
            const secretKey = process.env.MAILJET_SECRET_KEY;
            if (!apiKey || !secretKey) {
                throw this.createError('CONFIG_ERROR', 'MAILJET_API_KEY or MAILJET_SECRET_KEY not configured', false);
            }

            // Normalize recipients - Mailjet sendGenericEmail handles single recipient
            const recipients = Array.isArray(input.to) ? input.to : [input.to];

            // Send to each recipient via Mailjet
            const results = await Promise.all(
                recipients.map(async (email) => {
                    const result = await sendGenericEmail({
                        to: email,
                        subject: input.subject,
                        htmlBody: input.bodyType === 'html' ? input.body : `<pre>${input.body}</pre>`,
                        textBody: input.bodyType === 'text' ? input.body : undefined
                    });
                    return { email, success: result.success, error: result.error };
                })
            );

            const successCount = results.filter(r => r.success).length;
            const failedRecipients = results.filter(r => !r.success);

            if (successCount === 0) {
                logger.error('All emails failed to send', { results });
                throw this.createError('API_ERROR', `Mailjet error: ${failedRecipients[0]?.error}`, true);
            }

            const messageId = `mj_${Date.now()}`;

            logger.info('Email sent successfully via Mailjet', {
                messageId,
                recipients: successCount,
                subject: input.subject
            });

            const output: EmailSendOutput = {
                messageId,
                sent: true,
                recipients: results.filter(r => r.success).map(r => r.email),
                timestamp: new Date().toISOString()
            };

            return this.createResult(
                output,
                {
                    executionTime: Date.now() - startTime,
                    apiCalls: recipients.length
                },
                {
                    type: 'email',
                    title: `Email Sent: ${input.subject}`,
                    content: {
                        to: recipients.join(', '),
                        subject: input.subject,
                        preview: input.body.substring(0, 200) + (input.body.length > 200 ? '...' : '')
                    },
                    preview: `Sent to ${successCount} recipient(s)`,
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
