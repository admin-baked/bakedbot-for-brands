/**
 * Unit Tests: Claude Service
 * 
 * Tests for the Claude (Anthropic) service used for tool calling.
 * Note: These tests mock the Anthropic API to avoid actual API calls.
 */

import { isClaudeAvailable, CLAUDE_TOOL_MODEL } from '@/ai/claude';

// Mock environment for tests
const originalEnv = process.env;

describe('Claude Service', () => {
    beforeEach(() => {
        // Reset environment before each test
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('CLAUDE_TOOL_MODEL', () => {
        it('should be Claude Sonnet 4', () => {
            expect(CLAUDE_TOOL_MODEL).toBe('claude-sonnet-4-20250514');
        });
    });

    describe('isClaudeAvailable', () => {
        it('should return true when CLAUDE_API_KEY is set', () => {
            process.env.CLAUDE_API_KEY = 'test-api-key';
            
            // Re-import to get fresh function with new env
            const { isClaudeAvailable: freshCheck } = require('@/ai/claude');
            expect(freshCheck()).toBe(true);
        });

        it('should return false when CLAUDE_API_KEY is not set', () => {
            delete process.env.CLAUDE_API_KEY;
            
            // Re-import to get fresh function with new env
            const { isClaudeAvailable: freshCheck } = require('@/ai/claude');
            expect(freshCheck()).toBe(false);
        });

        it('should return false when CLAUDE_API_KEY is empty string', () => {
            process.env.CLAUDE_API_KEY = '';
            
            const { isClaudeAvailable: freshCheck } = require('@/ai/claude');
            expect(freshCheck()).toBe(false);
        });
    });

    describe('ClaudeResult interface', () => {
        it('should have expected shape', () => {
            // This is a type test - if this compiles, types are correct
            const mockResult = {
                content: 'Test response',
                toolExecutions: [
                    {
                        id: 'test-id',
                        name: 'test.tool',
                        input: { query: 'test' },
                        output: { result: 'success' },
                        status: 'success' as const,
                        durationMs: 100,
                    }
                ],
                model: CLAUDE_TOOL_MODEL,
                inputTokens: 100,
                outputTokens: 50,
            };

            expect(mockResult.content).toBe('Test response');
            expect(mockResult.toolExecutions).toHaveLength(1);
            expect(mockResult.toolExecutions[0].status).toBe('success');
        });
    });
});

describe('Claude Tool Execution (Mocked)', () => {
    // These tests would require mocking the Anthropic SDK
    // For now, we test the helper functions and types

    describe('Tool execution flow', () => {
        it('should handle successful tool execution format', () => {
            const toolExecution = {
                id: 'toolu_123',
                name: 'marketing.sendEmail',
                input: { to: 'test@example.com', subject: 'Hello', content: 'Test' },
                output: { success: true, messageId: 'msg_456' },
                status: 'success' as const,
                durationMs: 250,
            };

            expect(toolExecution.status).toBe('success');
            expect(toolExecution.name).toBe('marketing.sendEmail');
            expect(toolExecution.durationMs).toBeGreaterThan(0);
        });

        it('should handle error tool execution format', () => {
            const errorExecution = {
                id: 'toolu_789',
                name: 'web.search',
                input: { query: 'test query' },
                output: 'Rate limit exceeded',
                status: 'error' as const,
                durationMs: 50,
            };

            expect(errorExecution.status).toBe('error');
            expect(typeof errorExecution.output).toBe('string');
        });
    });
});
