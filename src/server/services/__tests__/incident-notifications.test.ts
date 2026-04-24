import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockFindChannelByName = jest.fn();
const mockJoinChannel = jest.fn();
const mockPostMessage = jest.fn();
const mockPostInThread = jest.fn();

jest.mock('@/server/services/communications/slack', () => ({
    slackService: {
        findChannelByName: mockFindChannelByName,
        joinChannel: mockJoinChannel,
        postMessage: mockPostMessage,
        postInThread: mockPostInThread,
    },
}));

describe('incident-notifications', () => {
    const originalEnv = process.env;
    let postLinusIncidentSlack: typeof import('../incident-notifications').postLinusIncidentSlack;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.SLACK_WEBHOOK_INCIDENTS;
        delete process.env.SLACK_WEBHOOK_URL;
        global.fetch = jest.fn() as unknown as typeof fetch;
        postLinusIncidentSlack = require('../incident-notifications').postLinusIncidentSlack;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('posts to #linus-incidents through the Slack bot when the channel is available', async () => {
        mockPostMessage.mockResolvedValue({ sent: true, channel: 'C123', ts: '123.456' });

        const result = await postLinusIncidentSlack({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'test' } }],
            fallbackText: 'incident',
            source: 'support-ticket',
            incidentId: 'ticket_123',
        });

        expect(mockPostMessage).toHaveBeenCalledWith(
            'linus-incidents',
            'incident',
            [{ type: 'section', text: { type: 'mrkdwn', text: 'test' } }],
        );
        expect(mockFindChannelByName).not.toHaveBeenCalled();
        expect(mockJoinChannel).not.toHaveBeenCalled();
        expect(result).toEqual({
            sent: true,
            channelId: 'C123',
            channelName: 'linus-incidents',
            ts: '123.456',
            delivery: 'channel',
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('posts in a thread when threadTs and channelName are provided', async () => {
        mockPostInThread.mockResolvedValue({ sent: true, channel: 'C999', ts: '999.001' });

        const result = await postLinusIncidentSlack({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'threaded' } }],
            fallbackText: 'threaded incident',
            source: 'auto-escalator',
            incidentId: 'deploy_123',
            channelName: 'linus-cto',
            threadTs: '999.000',
        });

        expect(mockPostInThread).toHaveBeenCalledWith(
            'linus-cto',
            '999.000',
            'threaded incident',
            [{ type: 'section', text: { type: 'mrkdwn', text: 'threaded' } }],
        );
        expect(mockFindChannelByName).not.toHaveBeenCalled();
        expect(result.delivery).toBe('thread');
        expect(result.ts).toBe('999.001');
    });

    it('falls back to the incidents webhook when the Slack channel is unavailable', async () => {
        process.env.SLACK_WEBHOOK_INCIDENTS = 'https://hooks.slack.test/incident';
        mockPostMessage.mockResolvedValue({ sent: false, error: 'channel_not_found' });
        mockFindChannelByName.mockResolvedValue(null);
        (global.fetch as unknown as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

        const result = await postLinusIncidentSlack({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'fallback' } }],
            fallbackText: 'incident fallback',
            source: 'auto-escalator',
            incidentId: 'bug_123',
        });

        expect(mockPostMessage).toHaveBeenCalledWith(
            'linus-incidents',
            'incident fallback',
            [{ type: 'section', text: { type: 'mrkdwn', text: 'fallback' } }],
        );
        expect(mockFindChannelByName).toHaveBeenCalledWith('linus-incidents');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://hooks.slack.test/incident',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        expect(result.delivery).toBe('webhook');
    });
});
