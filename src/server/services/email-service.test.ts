/**
 * Unit tests for Email Service
 * Tests email sending with various options and error handling
 */

import { sendEmail, SendEmailOptions } from './email-service';

// Mock the email dispatcher
jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Email Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendEmail', () => {
        it('should send email with HTML body', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            sendGenericEmail.mockResolvedValue(undefined);

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                html: '<p>HTML Content</p>',
                text: 'Text Content',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(sendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'test@example.com',
                    subject: 'Test Subject',
                    htmlBody: '<p>HTML Content</p>',
                    textBody: 'Text Content',
                    fromEmail: 'hello@bakedbot.ai',
                    fromName: 'BakedBot',
                })
            );
        });

        it('should use custom from address if provided', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            sendGenericEmail.mockResolvedValue(undefined);

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Text Content',
                from: 'custom@example.com',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(sendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromEmail: 'custom@example.com',
                })
            );
        });

        it('should convert text to HTML if HTML not provided', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            sendGenericEmail.mockResolvedValue(undefined);

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Line 1\nLine 2\nLine 3',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(sendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    htmlBody: 'Line 1<br>Line 2<br>Line 3',
                })
            );
        });

        it('should return false on send failure', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            sendGenericEmail.mockRejectedValue(new Error('SMTP Connection Failed'));

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Text Content',
            };

            const result = await sendEmail(options);

            expect(result).toBe(false);
        });

        it('should log errors on send failure', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            const { logger } = require('@/lib/logger');
            sendGenericEmail.mockRejectedValue(new Error('API Error'));

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Text Content',
            };

            await sendEmail(options);

            expect(logger.error).toHaveBeenCalledWith(
                '[EmailService] Failed to send email:',
                expect.objectContaining({
                    to: 'test@example.com',
                    error: 'API Error',
                })
            );
        });

        it('should handle missing optional parameters', async () => {
            const { sendGenericEmail } = require('@/lib/email/dispatcher');
            sendGenericEmail.mockResolvedValue(undefined);

            const options: SendEmailOptions = {
                to: 'test@example.com',
                subject: 'Test Subject',
                text: 'Text Content',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(sendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromEmail: 'hello@bakedbot.ai',
                    htmlBody: 'Text Content',
                })
            );
        });
    });
});
