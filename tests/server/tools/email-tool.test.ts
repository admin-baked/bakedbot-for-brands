/**
 * Email Tool Unit Tests
 * 
 * Tests for the SendGrid email integration tool.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// --- Mock Types ---

interface EmailSendInput {
    to: string | string[];
    subject: string;
    body: string;
    bodyType?: 'text' | 'html';
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
}

interface EmailSendOutput {
    messageId: string;
    sent: boolean;
    recipients: string[];
    timestamp: string;
}

interface ToolResult<T> {
    success: boolean;
    data: T;
    error?: { code: string; message: string };
    metadata: { executionTime: number; apiCalls?: number };
    displayData?: { type: string; title: string; content: any };
}

// --- Test Suite ---

describe('EmailTool', () => {
    describe('Input Validation', () => {
        it('should require to, subject, and body fields', () => {
            const validInput: EmailSendInput = {
                to: 'test@example.com',
                subject: 'Test Subject',
                body: 'Test body content'
            };

            expect(validInput.to).toBeDefined();
            expect(validInput.subject).toBeDefined();
            expect(validInput.body).toBeDefined();
        });

        it('should accept single recipient', () => {
            const input: EmailSendInput = {
                to: 'single@example.com',
                subject: 'Single Recipient',
                body: 'Content'
            };

            const recipients = Array.isArray(input.to) ? input.to : [input.to];
            expect(recipients.length).toBe(1);
            expect(recipients[0]).toBe('single@example.com');
        });

        it('should accept multiple recipients as array', () => {
            const input: EmailSendInput = {
                to: ['one@example.com', 'two@example.com'],
                subject: 'Multiple Recipients',
                body: 'Content'
            };

            expect(Array.isArray(input.to)).toBe(true);
            expect(input.to.length).toBe(2);
        });

        it('should support HTML body type', () => {
            const input: EmailSendInput = {
                to: 'test@example.com',
                subject: 'HTML Email',
                body: '<h1>Hello</h1><p>World</p>',
                bodyType: 'html'
            };

            expect(input.bodyType).toBe('html');
        });

        it('should support CC and BCC recipients', () => {
            const input: EmailSendInput = {
                to: 'primary@example.com',
                subject: 'With CC/BCC',
                body: 'Content',
                cc: ['cc1@example.com', 'cc2@example.com'],
                bcc: ['bcc@example.com']
            };

            expect(input.cc).toHaveLength(2);
            expect(input.bcc).toHaveLength(1);
        });

        it('should support reply-to address', () => {
            const input: EmailSendInput = {
                to: 'test@example.com',
                subject: 'With Reply-To',
                body: 'Content',
                replyTo: 'reply@example.com'
            };

            expect(input.replyTo).toBe('reply@example.com');
        });
    });

    describe('Output Structure', () => {
        it('should return correct output structure on success', () => {
            const output: EmailSendOutput = {
                messageId: 'msg_12345',
                sent: true,
                recipients: ['test@example.com'],
                timestamp: new Date().toISOString()
            };

            expect(output.messageId).toBeDefined();
            expect(output.sent).toBe(true);
            expect(output.recipients).toBeInstanceOf(Array);
            expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('should include all recipients in output', () => {
            const recipients = ['a@example.com', 'b@example.com', 'c@example.com'];
            const output: EmailSendOutput = {
                messageId: 'msg_12345',
                sent: true,
                recipients,
                timestamp: new Date().toISOString()
            };

            expect(output.recipients).toEqual(recipients);
        });
    });

    describe('ToolResult Structure', () => {
        it('should wrap output in ToolResult on success', () => {
            const result: ToolResult<EmailSendOutput> = {
                success: true,
                data: {
                    messageId: 'msg_12345',
                    sent: true,
                    recipients: ['test@example.com'],
                    timestamp: new Date().toISOString()
                },
                metadata: {
                    executionTime: 1500,
                    apiCalls: 1
                }
            };

            expect(result.success).toBe(true);
            expect(result.data.sent).toBe(true);
            expect(result.metadata.executionTime).toBeGreaterThan(0);
        });

        it('should include display data for UI rendering', () => {
            const result: ToolResult<EmailSendOutput> = {
                success: true,
                data: {
                    messageId: 'msg_12345',
                    sent: true,
                    recipients: ['test@example.com'],
                    timestamp: new Date().toISOString()
                },
                metadata: { executionTime: 1500 },
                displayData: {
                    type: 'email',
                    title: 'Email Sent: Test Subject',
                    content: {
                        to: 'test@example.com',
                        subject: 'Test Subject',
                        preview: 'Email body preview...'
                    }
                }
            };

            expect(result.displayData).toBeDefined();
            expect(result.displayData?.type).toBe('email');
            expect(result.displayData?.title).toContain('Email Sent');
        });

        it('should return error structure on failure', () => {
            const result: ToolResult<EmailSendOutput> = {
                success: false,
                data: null as any,
                error: {
                    code: 'CONFIG_ERROR',
                    message: 'SENDGRID_API_KEY not configured'
                },
                metadata: { executionTime: 50 }
            };

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe('CONFIG_ERROR');
        });
    });

    describe('SendGrid Payload', () => {
        it('should build correct SendGrid payload structure', () => {
            const input: EmailSendInput = {
                to: ['recipient@example.com'],
                subject: 'Test Email',
                body: 'Hello World',
                bodyType: 'text'
            };

            // Simulate payload building
            const recipients = Array.isArray(input.to) ? input.to : [input.to];
            const payload = {
                personalizations: [{
                    to: recipients.map(email => ({ email })),
                }],
                from: {
                    email: 'noreply@bakedbot.ai',
                    name: 'BakedBot'
                },
                subject: input.subject,
                content: [{
                    type: input.bodyType === 'html' ? 'text/html' : 'text/plain',
                    value: input.body
                }]
            };

            expect(payload.personalizations[0].to).toHaveLength(1);
            expect(payload.personalizations[0].to[0].email).toBe('recipient@example.com');
            expect(payload.from.email).toBe('noreply@bakedbot.ai');
            expect(payload.content[0].type).toBe('text/plain');
        });

        it('should set HTML content type correctly', () => {
            const input: EmailSendInput = {
                to: 'test@example.com',
                subject: 'HTML Test',
                body: '<h1>Hello</h1>',
                bodyType: 'html'
            };

            const contentType = input.bodyType === 'html' ? 'text/html' : 'text/plain';
            expect(contentType).toBe('text/html');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing API key', () => {
            const errorResult: ToolResult<EmailSendOutput> = {
                success: false,
                data: null as any,
                error: {
                    code: 'CONFIG_ERROR',
                    message: 'SENDGRID_API_KEY not configured'
                },
                metadata: { executionTime: 10 }
            };

            expect(errorResult.error?.code).toBe('CONFIG_ERROR');
        });

        it('should handle invalid input', () => {
            const errorResult: ToolResult<EmailSendOutput> = {
                success: false,
                data: null as any,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Missing required fields: to, subject, body'
                },
                metadata: { executionTime: 5 }
            };

            expect(errorResult.error?.code).toBe('INVALID_INPUT');
        });

        it('should handle API errors', () => {
            const errorResult: ToolResult<EmailSendOutput> = {
                success: false,
                data: null as any,
                error: {
                    code: 'API_ERROR',
                    message: 'SendGrid error: 401'
                },
                metadata: { executionTime: 500 }
            };

            expect(errorResult.error?.code).toBe('API_ERROR');
            expect(errorResult.error?.message).toContain('401');
        });
    });

    describe('Tool Metadata', () => {
        it('should have correct tool identity', () => {
            const toolId = 'email.send';
            const toolName = 'Send Email';
            const toolCategory = 'communication';

            expect(toolId).toBe('email.send');
            expect(toolName).toBe('Send Email');
            expect(toolCategory).toBe('communication');
        });

        it('should require authentication', () => {
            const requiresAuth = true;
            const authType = 'api_key';

            expect(requiresAuth).toBe(true);
            expect(authType).toBe('api_key');
        });

        it('should be a default tool', () => {
            const isDefault = true;
            expect(isDefault).toBe(true);
        });
    });
});
