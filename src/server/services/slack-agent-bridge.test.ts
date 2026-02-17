/**
 * Slack Agent Bridge Unit Tests
 * Tests agent routing, message processing, and welcome messages
 */

import { detectAgent, stripBotMention } from './slack-agent-bridge';

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
        it('should route DM messages to leo by default', () => {
            const result = detectAgent('hello', '', true);
            expect(result).toBe('leo');
        });

        it('should route channel messages to puff by default', () => {
            const result = detectAgent('hello', '', false);
            expect(result).toBe('puff');
        });

        // Keyword routing
        describe('keyword detection', () => {
            it('should detect leo keywords', () => {
                expect(detectAgent('leo please', '', true)).toBe('leo');
                expect(detectAgent('coo update', '', true)).toBe('leo');
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
});
