/**
 * Slack Agent Bridge Unit Tests
 * Tests agent routing, message processing, and welcome messages
 */

jest.mock('@/server/agents/agent-runner', () => ({
    __esModule: true,
    runAgentCore: jest.fn(),
}));

jest.mock('@/lib/request-context', () => ({
    __esModule: true,
    requestContext: {
        run: jest.fn((_ctx, fn) => fn()),
    },
}));

jest.mock('../communications/slack', () => ({
    __esModule: true,
    slackService: {
        postInThread: jest.fn(),
        updateMessage: jest.fn(),
        getUserInfo: jest.fn(),
        postMessage: jest.fn(),
    },
    SlackService: {
        formatAgentResponse: jest.fn(),
    },
}));

jest.mock('../slack-response-archive', () => ({
    __esModule: true,
    archiveSlackResponse: jest.fn(),
}));

jest.mock('../slack-approval', () => ({
    __esModule: true,
    detectRiskyAction: jest.fn(() => ({ isRisky: false })),
    createApprovalRequest: jest.fn(),
    formatApprovalBlocks: jest.fn(),
    setApprovalMessageTs: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    __esModule: true,
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const {
    detectAgent,
    getSlackGLMSynthesisTask,
    stripBotMention,
    isGreeting,
    isMartyShortAcknowledgment,
    shouldIgnoreSlackMessageEvent,
} = require('../slack-agent-routing');

describe('Slack Agent Bridge', () => {
    // =========================================================================
    // stripBotMention Tests
    // =========================================================================
    describe('stripBotMention', () => {
        it('should remove bot mention from start of message', () => {
            const result = stripBotMention('<@U12345> hello linus');
            expect(result).toBe('hello linus');
        });

        it('should handle multiple mentions', () => {
            const result = stripBotMention('<@U12345> <@U67890> test');
            expect(result).toBe('test');
        });

        it('should trim whitespace after removing mentions', () => {
            const result = stripBotMention('<@U12345>   hello');
            expect(result).toBe('hello');
        });

        it('should return empty string for mention-only messages', () => {
            const result = stripBotMention('<@U12345>');
            expect(result).toBe('');
        });

        it('should handle messages without mentions', () => {
            const result = stripBotMention('hello world');
            expect(result).toBe('hello world');
        });
    });

    // =========================================================================
    // detectAgent Tests
    // =========================================================================
    describe('detectAgent', () => {
        // Default routing
        it('should route DM messages to linus by default', () => {
            const result = detectAgent('hello', '', true);
            expect(result).toBe('linus');
        });

        it('should route channel messages to puff by default', () => {
            const result = detectAgent('hello', '', false);
            expect(result).toBe('puff');
        });

        // Keyword routing
        describe('keyword detection', () => {
            it('should detect leo keywords', () => {
                expect(detectAgent('leo please', '', true)).toBe('leo');
                expect(detectAgent('operations status', '', true)).toBe('leo');
                expect(detectAgent('ops summary', '', true)).toBe('leo');
            });

            it('should detect linus keywords', () => {
                expect(detectAgent('linus what happened', '', true)).toBe('linus');
                expect(detectAgent('cto build status', '', true)).toBe('linus');
                expect(detectAgent('tech review', '', true)).toBe('linus');
                expect(detectAgent('build failed', '', true)).toBe('linus');
                expect(detectAgent('code review', '', true)).toBe('linus');
                expect(detectAgent('deploy update', '', true)).toBe('linus');
                expect(detectAgent('bug report', '', true)).toBe('linus');
                expect(detectAgent('error log', '', true)).toBe('linus');
                expect(detectAgent('please fix this timeout', '', true)).toBe('linus');
                expect(detectAgent('the agent is broken and slow', '', true)).toBe('linus');
            });

            it('should detect linus runtime/model questions', () => {
                expect(detectAgent('what model are you using?', '', true)).toBe('linus');
                expect(detectAgent('which model are you on right now?', '', true)).toBe('linus');
            });

            it('should be case-insensitive', () => {
                expect(detectAgent('LINUS BUILD', '', true)).toBe('linus');
                expect(detectAgent('LeO operations', '', true)).toBe('leo');
            });
        });

        // Channel prefix routing
        describe('channel prefix detection', () => {
            it('should detect channel prefix routing', () => {
                expect(detectAgent('hello', 'linus-bot', false)).toBe('linus');
                expect(detectAgent('hello', 'leo-ops', false)).toBe('leo');
                expect(detectAgent('hello', 'jack-sales', false)).toBe('jack');
                expect(detectAgent('hello', 'ezal-intel', false)).toBe('ezal');
                expect(detectAgent('hello', 'intel-pipeline', false)).toBe('ezal');
                expect(detectAgent('hello', 'cto-general', false)).toBe('linus');
                expect(detectAgent('hello', 'coo-updates', false)).toBe('leo');
                expect(detectAgent('hello', 'cro-deals', false)).toBe('jack');
            });

            it('should be case-insensitive for channel prefixes', () => {
                expect(detectAgent('hello', 'Linus-Bot', false)).toBe('linus');
                expect(detectAgent('hello', 'EZAL-INTEL', false)).toBe('ezal');
            });

            it('should match partial prefix at start', () => {
                expect(detectAgent('hello', 'linus-anything-here', false)).toBe('linus');
                expect(detectAgent('hello', 'leo-channel', false)).toBe('leo');
            });
        });

        // Priority tests
        describe('routing priority', () => {
            it('should prioritize keyword over channel prefix', () => {
                expect(detectAgent('hey linus', 'leo-channel', false)).toBe('linus');
            });

            it('should use channel prefix when no keyword match', () => {
                expect(detectAgent('hello there', 'linus-bot', false)).toBe('linus');
            });

            it('should use default when no keyword and no channel prefix', () => {
                expect(detectAgent('just a message', 'random-channel', false)).toBe('puff');
            });
        });
    });

    describe('Marty fast-path classifiers', () => {
        it('treats simple hellos as greetings', () => {
            expect(isGreeting('Hello')).toBe(true);
            expect(isGreeting('good morning')).toBe(true);
        });

        it('does not treat short acknowledgments as greetings', () => {
            expect(isGreeting('Me too')).toBe(false);
            expect(isGreeting('Sounds good')).toBe(false);
        });

        it('detects short Marty acknowledgments', () => {
            expect(isMartyShortAcknowledgment('Me too')).toBe(true);
            expect(isMartyShortAcknowledgment('Sounds good')).toBe(true);
            expect(isMartyShortAcknowledgment("Let's do it")).toBe(true);
        });

        it('ignores normal strategy questions for Marty acknowledgment fast path', () => {
            expect(isMartyShortAcknowledgment("What's the pipeline looking like?")).toBe(false);
            expect(isMartyShortAcknowledgment('Check the inbox and draft follow-ups')).toBe(false);
        });
    });

    describe('shouldIgnoreSlackMessageEvent', () => {
        it('ignores join and leave system chatter', () => {
            expect(shouldIgnoreSlackMessageEvent({ subtype: 'channel_join', text: 'Ade has joined the channel' })).toBe(true);
            expect(shouldIgnoreSlackMessageEvent({ subtype: 'channel_leave', text: 'Ade has left the channel' })).toBe(true);
        });

        it('does not ignore normal user questions', () => {
            expect(shouldIgnoreSlackMessageEvent({ text: "what's our gross sales for February 2026?" })).toBe(false);
        });
    });

    describe('getSlackGLMSynthesisTask', () => {
        it('uses standard GLM for Linus because full Linus Slack runs bypass synthesis', () => {
            expect(getSlackGLMSynthesisTask('linus')).toBe('standard');
        });

        it('uses standard GLM for other Slack personas', () => {
            expect(getSlackGLMSynthesisTask('leo')).toBe('standard');
            expect(getSlackGLMSynthesisTask('craig')).toBe('standard');
        });
    });
});
