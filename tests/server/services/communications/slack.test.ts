
import { slackService } from '@/server/services/communications/slack';

// Mock @slack/web-api
jest.mock('@slack/web-api', () => ({
    WebClient: jest.fn().mockImplementation(() => ({
        chat: {
            postMessage: jest.fn().mockResolvedValue({ ts: '1234.5678', channel: 'C12345', ok: true })
        },
        conversations: {
            list: jest.fn().mockResolvedValue({ 
                channels: [{ id: 'C1', name: 'general', is_private: false }],
                ok: true 
            })
        }
    }))
}));

describe('SlackService', () => {
    // Setup env var for token
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv, SLACK_BOT_TOKEN: 'xoxb-test-token' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should list channels', async () => {
        // Re-import to trigger constructor with env var
        const { slackService } = require('@/server/services/communications/slack');
        const channels = await slackService.listChannels();
        expect(channels).toHaveLength(1);
        expect(channels[0].name).toBe('general');
    });

    it('should post a message', async () => {
        const { slackService } = require('@/server/services/communications/slack');
        const result = await slackService.postMessage('#general', 'Hello World');
        expect(result.sent).toBe(true);
        expect(result.ts).toBe('1234.5678');
    });

    it('should handle missing token gracefully', async () => {
        process.env.SLACK_BOT_TOKEN = '';
        jest.resetModules();
        const { slackService } = require('@/server/services/communications/slack');
        const result = await slackService.postMessage('#general', 'Fail');
        expect(result.sent).toBe(false);
        expect(result.error).toBe('No Token');
    });
});
