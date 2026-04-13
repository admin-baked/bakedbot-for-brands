/**
 * Unit tests: Claude credits-exhaustion fallback to Gemini Flash
 *
 * Covers executeWithTools and callClaude in src/ai/claude.ts.
 * When Anthropic returns 400 "credit balance is too low", both functions
 * must transparently re-dispatch to Gemini Flash (or re-throw if unconfigured).
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// ── Mocks (declared before any import that triggers module resolution) ────────

const mockMessagesCreate = jest.fn();
const mockExecuteGeminiFlashWithTools = jest.fn();
const mockCallGemini = jest.fn();
const mockIsGeminiFlashConfigured = jest.fn();
const mockRecordAgentTelemetry = jest.fn().mockResolvedValue(undefined);

jest.mock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        messages: { create: mockMessagesCreate },
    })),
}));

jest.mock('@/ai/gemini-flash-tools', () => ({
    executeGeminiFlashWithTools: mockExecuteGeminiFlashWithTools,
    callGemini: mockCallGemini,
    isGeminiFlashConfigured: mockIsGeminiFlashConfigured,
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/server/services/agent-telemetry', () => ({
    buildTelemetryEvent: jest.fn().mockReturnValue({}),
    recordAgentTelemetry: mockRecordAgentTelemetry,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCreditsError(): Error {
    const err = new Error('Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.');
    (err as any).status = 400;
    return err;
}

function makeSuccessResponse(text = 'Claude response') {
    return {
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0 },
    };
}

const GEMINI_RESULT = {
    content: 'Gemini Flash response',
    toolExecutions: [],
    model: 'googleai/gemini-2.0-flash',
    inputTokens: 8,
    outputTokens: 4,
    cachedTokens: 0,
};

// ── executeWithTools ──────────────────────────────────────────────────────────

describe('executeWithTools — credits fallback', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.CLAUDE_API_KEY = 'test-key';
    });

    it('falls back to Gemini Flash on credits-exhausted error', async () => {
        mockMessagesCreate.mockRejectedValueOnce(makeCreditsError());
        mockIsGeminiFlashConfigured.mockReturnValue(true);
        mockExecuteGeminiFlashWithTools.mockResolvedValue(GEMINI_RESULT);

        const { executeWithTools } = await import('../claude');
        const result = await executeWithTools('hello', [], async () => ({}));

        expect(mockExecuteGeminiFlashWithTools).toHaveBeenCalledTimes(1);
        expect(result.model).toBe('googleai/gemini-2.0-flash');
        expect(result.content).toBe('Gemini Flash response');
    });

    it('re-throws if Gemini Flash is not configured', async () => {
        mockMessagesCreate.mockRejectedValueOnce(makeCreditsError());
        mockIsGeminiFlashConfigured.mockReturnValue(false);

        const { executeWithTools } = await import('../claude');
        await expect(executeWithTools('hello', [], async () => ({}))).rejects.toThrow(
            /credit balance is too low/i,
        );
        expect(mockExecuteGeminiFlashWithTools).not.toHaveBeenCalled();
    });

    it('does NOT fall back for non-credits errors (e.g. rate limit)', async () => {
        const rateLimitErr = new Error('429 Too Many Requests');
        mockMessagesCreate.mockRejectedValueOnce(rateLimitErr);

        const { executeWithTools } = await import('../claude');
        await expect(executeWithTools('hello', [], async () => ({}))).rejects.toThrow('429');
        expect(mockExecuteGeminiFlashWithTools).not.toHaveBeenCalled();
    });

    it('succeeds normally when Claude has credits', async () => {
        mockMessagesCreate.mockResolvedValue(makeSuccessResponse());

        const { executeWithTools } = await import('../claude');
        const result = await executeWithTools('hello', [], async () => ({}));

        expect(result.content).toBe('Claude response');
        expect(mockExecuteGeminiFlashWithTools).not.toHaveBeenCalled();
    });
});

// ── callClaude ────────────────────────────────────────────────────────────────

describe('callClaude — credits fallback', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.CLAUDE_API_KEY = 'test-key';
    });

    it('falls back to callGemini on credits-exhausted error', async () => {
        mockMessagesCreate.mockRejectedValueOnce(makeCreditsError());
        mockIsGeminiFlashConfigured.mockReturnValue(true);
        mockCallGemini.mockResolvedValue('gemini text');

        const { callClaude } = await import('../claude');
        const result = await callClaude({ userMessage: 'summarise this' });

        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(result).toBe('gemini text');
    });

    it('re-throws if Gemini Flash is not configured', async () => {
        mockMessagesCreate.mockRejectedValueOnce(makeCreditsError());
        mockIsGeminiFlashConfigured.mockReturnValue(false);

        const { callClaude } = await import('../claude');
        await expect(callClaude({ userMessage: 'test' })).rejects.toThrow(
            /credit balance is too low/i,
        );
        expect(mockCallGemini).not.toHaveBeenCalled();
    });

    it('succeeds normally when Claude has credits', async () => {
        mockMessagesCreate.mockResolvedValue(makeSuccessResponse('hello world'));

        const { callClaude } = await import('../claude');
        const result = await callClaude({ userMessage: 'hi' });

        expect(result).toBe('hello world');
        expect(mockCallGemini).not.toHaveBeenCalled();
    });
});
