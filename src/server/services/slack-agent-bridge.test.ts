/**
 * Unit tests for Slack Agent Bridge service
 * Tests agent routing, message processing, and welcome messages
 */

import { stripBotMention, detectAgent, processSlackMessage, welcomeNewMember, SlackMessageContext } from './slack-agent-bridge';
import * as agentRunner from '@/server/agents/agent-runner';
import * as slackComms from './communications/slack';

// Mock dependencies
jest.mock('@/server/agents/agent-runner');
jest.mock('./communications/slack');

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('stripBotMention', () => {
    it('should remove bot mention tokens', () => {
        expect(stripBotMention('<@U123ABC> hello')).toBe('hello');
        expect(stripBotMention('hello <@U123ABC>')).toBe('hello');
        expect(stripBotMention('<@U123ABC> hello <@U456DEF>')).toBe('hello');
    });

    it('should handle multiple mention formats', () => {
        expect(stripBotMention('<@U123> <@U456> message')).toBe('message');
    });

    it('should trim whitespace after removal', () => {
        expect(stripBotMention('<@U123>   hello   ')).toBe('hello');
    });

    it('should handle text without mentions', () => {
        expect(stripBotMention('just a message')).toBe('just a message');
    });

    it('should handle empty string', () => {
        expect(stripBotMention('')).toBe('');
    });
});

describe('detectAgent', () => {
    describe('Message keyword detection', () => {
        it('should detect leo (operations) by keyword', () => {
            expect(detectAgent('ask leo about operations', 'general', false)).toBe('leo');
            expect(detectAgent('i need help with ops', 'general', false)).toBe('leo');
        });

        it('should detect linus (cto) by keyword', () => {
            expect(detectAgent('linus can you fix this bug', 'general', false)).toBe('linus');
            expect(detectAgent('deploy the code', 'general', false)).toBe('linus');
        });

        it('should detect jack (sales) by keyword', () => {
            expect(detectAgent('jack what about this deal', 'general', false)).toBe('jack');
            expect(detectAgent('help with sales pipeline', 'general', false)).toBe('jack');
        });

        it('should detect ezal (competitive intel) by keyword', () => {
            expect(detectAgent('ezal check competitors', 'general', false)).toBe('ezal');
            expect(detectAgent('what is our competitive intel', 'general', false)).toBe('ezal');
        });

        it('should detect parker (loyalty) by keyword', () => {
            expect(detectAgent('parker help with email campaign', 'general', false)).toBe('mrs_parker');
            expect(detectAgent('loyalty program questions', 'general', false)).toBe('mrs_parker');
        });
    });

    describe('Channel prefix detection', () => {
        it('should detect agent by channel name prefix', () => {
            expect(detectAgent('hello', 'linus-tech', false)).toBe('linus');
            expect(detectAgent('hello', 'leo-operations', false)).toBe('leo');
            expect(detectAgent('hello', 'ezal-intel', false)).toBe('ezal');
            expect(detectAgent('hello', 'intel-analysis', false)).toBe('ezal');
        });

        it('should handle uppercase channel names', () => {
            expect(detectAgent('hello', 'LINUS-TECH', false)).toBe('linus');
        });
    });

    describe('Fallback detection', () => {
        it('should default to leo for direct messages', () => {
            expect(detectAgent('random message', 'general', true)).toBe('leo');
        });

        it('should default to puff for channel messages without keywords', () => {
            expect(detectAgent('random message', 'general', false)).toBe('puff');
        });
    });

    describe('Priority handling', () => {
        it('should prioritize message keywords over channel name', () => {
            // "linus" in message should take precedence over "leo" channel
            expect(detectAgent('ask linus', 'leo-channel', false)).toBe('linus');
        });

        it('should prioritize explicit keyword over default', () => {
            expect(detectAgent('craig please post this', 'random-channel', false)).toBe('craig');
        });
    });
});

describe('processSlackMessage', () => {
    const mockAgentResult = {
        content: 'This is agent response',
        reasoning: 'Test reasoning',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (agentRunner.runAgentCore as jest.Mock).mockResolvedValue(mockAgentResult);
        (slackComms.slackService.postInThread as jest.Mock).mockResolvedValue(undefined);
    });

    it('should strip bot mention and process message', async () => {
        const ctx: SlackMessageContext = {
            text: '<@BOT> hello leo',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: false,
        };

        await processSlackMessage(ctx);

        expect(agentRunner.runAgentCore).toHaveBeenCalledWith(
            'hello leo',
            'leo',
            {},
            null
        );
    });

    it('should skip empty messages after mention removal', async () => {
        const ctx: SlackMessageContext = {
            text: '<@BOT>',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: false,
        };

        await processSlackMessage(ctx);

        expect(agentRunner.runAgentCore).not.toHaveBeenCalled();
    });

    it('should post thinking indicator before agent response', async () => {
        const ctx: SlackMessageContext = {
            text: 'leo help',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: true,
        };

        await processSlackMessage(ctx);

        expect(slackComms.slackService.postInThread).toHaveBeenCalledWith(
            'C456',
            '123.456',
            expect.stringContaining('thinking'),
        );
    });

    it('should format and post agent response', async () => {
        const ctx: SlackMessageContext = {
            text: 'leo help',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: true,
        };

        await processSlackMessage(ctx);

        expect(slackComms.slackService.postInThread).toHaveBeenCalledWith(
            'C456',
            '123.456',
            expect.stringContaining('Leo:'),
            expect.any(Array)
        );
    });

    it('should skip channel messages without agent keyword', async () => {
        const ctx: SlackMessageContext = {
            text: 'just a random message',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isChannelMsg: true,
            isDm: false,
        };

        await processSlackMessage(ctx);

        expect(agentRunner.runAgentCore).not.toHaveBeenCalled();
    });

    it('should handle empty agent response', async () => {
        (agentRunner.runAgentCore as jest.Mock).mockResolvedValue({
            content: '',
        });

        const ctx: SlackMessageContext = {
            text: 'leo help',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: true,
        };

        await processSlackMessage(ctx);

        expect(slackComms.slackService.postInThread).toHaveBeenCalledWith(
            'C456',
            '123.456',
            expect.stringContaining('trouble generating a response'),
        );
    });

    it('should handle agent execution errors', async () => {
        (agentRunner.runAgentCore as jest.Mock).mockRejectedValue(new Error('Agent failed'));

        const ctx: SlackMessageContext = {
            text: 'leo help',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: true,
        };

        await expect(processSlackMessage(ctx)).resolves.not.toThrow();

        expect(slackComms.slackService.postInThread).toHaveBeenCalledWith(
            'C456',
            '123.456',
            expect.stringContaining('issue')
        );
    });

    it('should handle slack post failures gracefully', async () => {
        (slackComms.slackService.postInThread as jest.Mock).mockRejectedValue(
            new Error('Slack API error')
        );

        const ctx: SlackMessageContext = {
            text: 'leo help',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            isDm: true,
        };

        await expect(processSlackMessage(ctx)).resolves.not.toThrow();
    });

    it('should respect custom channel name for agent detection', async () => {
        const ctx: SlackMessageContext = {
            text: 'random question',
            slackUserId: 'U123',
            channel: 'C456',
            threadTs: '123.456',
            channelName: 'linus-tech',
            isDm: false,
            isChannelMsg: false,
        };

        await processSlackMessage(ctx);

        expect(agentRunner.runAgentCore).toHaveBeenCalledWith(
            'random question',
            'linus',
            {},
            null
        );
    });
});

describe('welcomeNewMember', () => {
    const mockAgentResult = {
        content: 'Welcome to the team!',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (agentRunner.runAgentCore as jest.Mock).mockResolvedValue(mockAgentResult);
        (slackComms.slackService.postMessage as jest.Mock).mockResolvedValue(undefined);
    });

    it('should generate welcome message for new member', async () => {
        await welcomeNewMember('U123', 'C456');

        expect(agentRunner.runAgentCore).toHaveBeenCalledWith(
            expect.stringContaining('new team member'),
            'mrs_parker',
            {},
            null
        );
    });

    it('should format and post welcome message', async () => {
        await welcomeNewMember('U123', 'C456');

        expect(slackComms.slackService.postMessage).toHaveBeenCalledWith(
            'C456',
            expect.stringContaining("Mrs. Parker:"),
            expect.any(Array)
        );
    });

    it('should handle empty agent response', async () => {
        (agentRunner.runAgentCore as jest.Mock).mockResolvedValue({
            content: '',
        });

        await welcomeNewMember('U123', 'C456');

        expect(slackComms.slackService.postMessage).not.toHaveBeenCalled();
    });

    it('should handle agent execution errors gracefully', async () => {
        (agentRunner.runAgentCore as jest.Mock).mockRejectedValue(
            new Error('Agent failed')
        );

        await expect(welcomeNewMember('U123', 'C456')).resolves.not.toThrow();
    });
});
