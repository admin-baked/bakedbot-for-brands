/**
 * Unit tests for structured extraction helpers
 * Tests Gmail and Calendar parameter extraction without LLM
 */

import { extractGmailParams, extractCalendarParams } from '../extraction-helpers';

describe('extractGmailParams', () => {
    describe('Send email action', () => {
        it('should extract complete send email parameters', () => {
            const message = 'Send an email to john@example.com subject Testing BakedBot body Hello from BakedBot!';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.to).toBe('john@example.com');
            expect(result.subject).toBe('Testing BakedBot');
            expect(result.body).toBe('Hello from BakedBot!');
        });

        it('should handle email with quoted subject', () => {
            const message = 'Send email to admin@company.com subject: "Important Update" body: Check this out';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.to).toBe('admin@company.com');
            expect(result.subject).toBe('Important Update');
            expect(result.body).toContain('Check this out');
        });

        it('should handle compose action', () => {
            const message = 'Compose an email to support@bakedbot.ai saying Thanks for your help';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.to).toBe('support@bakedbot.ai');
            expect(result.body).toContain('Thanks for your help');
        });

        it('should use default subject when not provided', () => {
            const message = 'Email to test@example.com saying Quick question';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.subject).toBe('Message from BakedBot');
        });

        it('should handle missing recipient', () => {
            const message = 'Send an email with subject Test';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.to).toBe('');
            expect(result.subject).toBe('Test');
        });

        it('should extract email from complex sentence', () => {
            const message = 'Please send an email to customer@dispensary.com about their order';
            const result = extractGmailParams(message);

            expect(result.action).toBe('send');
            expect(result.to).toBe('customer@dispensary.com');
        });
    });

    describe('Read email action', () => {
        it('should detect read email action', () => {
            const message = 'Read email with id abc123';
            const result = extractGmailParams(message);

            expect(result.action).toBe('read');
            expect(result.messageId).toBe('abc123');
        });

        it('should handle open email command', () => {
            const message = 'Open email message: def456';
            const result = extractGmailParams(message);

            expect(result.action).toBe('read');
            expect(result.messageId).toBe('def456');
        });

        it('should handle show email command', () => {
            const message = 'Show email id xyz789';
            const result = extractGmailParams(message);

            expect(result.action).toBe('read');
            expect(result.messageId).toBe('xyz789');
        });

        it('should handle missing message ID', () => {
            const message = 'Read email without ID';
            const result = extractGmailParams(message);

            expect(result.action).toBe('read');
            expect(result.messageId).toBe('');
        });
    });

    describe('List email action', () => {
        it('should list unread emails by default', () => {
            const message = 'Check unread inbox messages';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('is:unread');
        });

        it('should list sent emails', () => {
            const message = 'List my sent emails';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('in:sent');
        });

        it('should list starred emails', () => {
            const message = 'Show starred messages';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('is:starred');
        });

        it('should list important emails', () => {
            const message = 'What are my important emails?';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('is:starred');
        });

        it('should list today\'s emails', () => {
            const message = 'List messages from today';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('newer_than:1d');
        });

        it('should default to unread when ambiguous', () => {
            const message = 'List emails';
            const result = extractGmailParams(message);

            expect(result.action).toBe('list');
            expect(result.query).toBe('is:unread');
        });
    });
});

describe('extractCalendarParams', () => {
    describe('Create event action', () => {
        beforeEach(() => {
            // Mock Date to ensure consistent test results
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-02-10T14:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should extract event with summary and time', () => {
            const message = 'Schedule a meeting titled Team Standup at 3:00 PM';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('create');
            expect(result.summary).toBe('Team Standup');
            expect(result.startTime).toBeDefined();
            expect(result.endTime).toBeDefined();
        });

        it('should handle AM/PM times', () => {
            const message = 'Create an event for Product Demo at 10:30 AM';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('create');
            expect(result.summary).toBe('Product Demo');

            const startTime = new Date(result.startTime!);
            expect(startTime.getHours()).toBe(10);
            expect(startTime.getMinutes()).toBe(30);
        });

        it('should handle 24-hour format', () => {
            const message = 'Book a meeting called Budget Review at 15:00';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('create');
            expect(result.summary).toBe('Budget Review');

            const startTime = new Date(result.startTime!);
            expect(startTime.getHours()).toBe(15);
        });

        it('should use default summary when not provided', () => {
            const message = 'Schedule an appointment at 2:00 PM';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('create');
            expect(result.summary).toBe('New Event');
        });

        it('should set default duration of 1 hour', () => {
            const message = 'Add event for Client Call at 11:00 AM';
            const result = extractCalendarParams(message);

            const startTime = new Date(result.startTime!);
            const endTime = new Date(result.endTime!);
            const duration = endTime.getTime() - startTime.getTime();

            expect(duration).toBe(3600000); // 1 hour in milliseconds
        });

        it('should handle set up action', () => {
            const message = 'Set up a meeting named All Hands at 9:00 AM';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('create');
            expect(result.summary).toBe('All Hands');
        });
    });

    describe('List events action', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-02-10T14:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should list today\'s events', () => {
            const message = 'Show my calendar for today';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('list');
            expect(result.timeMin).toBeDefined();
            expect(result.timeMax).toBeDefined();
            expect(result.maxResults).toBe(10);

            const timeMax = new Date(result.timeMax!);
            expect(timeMax.getHours()).toBe(23);
            expect(timeMax.getMinutes()).toBe(59);
        });

        it('should list this week\'s events', () => {
            const message = 'What are my events this week?';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('list');
            expect(result.timeMin).toBeDefined();
            expect(result.timeMax).toBeDefined();
            expect(result.maxResults).toBe(10);

            const timeMin = new Date(result.timeMin!);
            const timeMax = new Date(result.timeMax!);
            const daysDiff = (timeMax.getTime() - timeMin.getTime()) / (1000 * 60 * 60 * 24);
            expect(daysDiff).toBeGreaterThanOrEqual(0);
            expect(daysDiff).toBeLessThanOrEqual(7);
        });

        it('should default to next 7 days', () => {
            const message = 'List my upcoming events';
            const result = extractCalendarParams(message);

            expect(result.action).toBe('list');
            expect(result.timeMin).toBeDefined();
            expect(result.maxResults).toBe(10);

            const timeMin = new Date(result.timeMin!);
            const now = new Date();
            expect(timeMin.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000); // Within 1 second
        });

        it('should include maxResults parameter', () => {
            const message = 'Show calendar';
            const result = extractCalendarParams(message);

            expect(result.maxResults).toBe(10);
        });
    });
});
