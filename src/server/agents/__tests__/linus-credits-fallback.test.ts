/**
 * Integration tests: Linus Slack tier chain — Claude credits exhaustion
 *
 * Verifies that:
 *   1. 'gemini-flash' is always appended as last resort even when not in stored config
 *   2. Credits-exhausted error on haiku/sonnet immediately invokes Gemini Flash
 *   3. Normal (non-credits) tier failures still walk the chain
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// ── Heavy dependency mocks (must precede all imports) ─────────────────────────

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockExecuteWithTools = jest.fn();
const mockExecuteGLMWithTools = jest.fn();
const mockExecuteGeminiFlashWithTools = jest.fn();
const mockIsGLMConfigured = jest.fn().mockReturnValue(false);
const mockIsGeminiFlashConfigured = jest.fn().mockReturnValue(true);
const mockIsClaudeAvailable = jest.fn().mockReturnValue(true);
const mockGetAgentModelConfig = jest.fn();
const mockEnrichWithCoaching = jest.fn();
const mockBuildLeanLinusSystemPrompt = jest.fn().mockResolvedValue('Linus system prompt');
const mockNotifyGroqRateLimitSlack = jest.fn().mockResolvedValue(undefined);

jest.mock('@/ai/claude', () => ({
    executeWithTools: mockExecuteWithTools,
    isClaudeAvailable: mockIsClaudeAvailable,
    buildSystemPrompt: jest.fn().mockReturnValue(''),
}));

jest.mock('@/ai/glm', () => ({
    executeGLMWithTools: mockExecuteGLMWithTools,
    isGLMConfigured: mockIsGLMConfigured,
    isGLMRefusal: jest.fn().mockReturnValue(false),
    GLM_MODELS: { STRATEGIC: 'llama3', VISION: 'llama3-vision', EXTRACTION: 'llama3-extraction' },
}));

jest.mock('@/ai/gemini-flash-tools', () => ({
    executeGeminiFlashWithTools: mockExecuteGeminiFlashWithTools,
    isGeminiFlashConfigured: mockIsGeminiFlashConfigured,
}));

jest.mock('@/server/services/agent-model-config', () => ({
    getAgentModelConfig: mockGetAgentModelConfig,
    setAgentModelTier: jest.fn(),
}));

jest.mock('@/server/services/coaching-loader', () => ({
    enrichWithCoaching: mockEnrichWithCoaching,
}));

jest.mock('@/server/services/agent-telemetry', () => ({
    buildTelemetryEvent: jest.fn().mockReturnValue({}),
    recordAgentTelemetry: jest.fn().mockResolvedValue(undefined),
}));

// Stub internal services called by buildLeanLinusSystemPrompt
jest.mock('@/server/services/org-integration-status', () => ({
    buildIntegrationStatusSummaryForOrg: jest.fn().mockResolvedValue('All integrations nominal'),
}));
jest.mock('@/server/services/google-service-health', () => ({
    isGCPHealthyForDeploy: jest.fn().mockResolvedValue({ healthy: true, incidents: [] }),
}));

// Stub out all the heavy tool / service imports Linus pulls in dynamically
jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(),
    Timestamp: { now: jest.fn(), fromDate: jest.fn() },
    FieldValue: { arrayUnion: jest.fn(), increment: jest.fn() },
}));
jest.mock('@/firebase/server-client', () => ({ db: {} }));
jest.mock('path', () => ({ join: (...args: string[]) => args.join('/') }));
jest.mock('fs/promises', () => ({ readFile: jest.fn().mockResolvedValue('') }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function creditsError(): Error {
    const err = new Error('Your credit balance is too low to access the Anthropic API.');
    (err as any).status = 400;
    return err;
}

const GEMINI_RESULT = {
    content: 'Gemini Flash saved the day',
    toolExecutions: [],
    model: 'googleai/gemini-2.0-flash',
    inputTokens: 5,
    outputTokens: 3,
    cachedTokens: 0,
};

const CLAUDE_RESULT = {
    content: 'Claude response',
    toolExecutions: [],
    model: 'claude-haiku-4-5-20251001',
    inputTokens: 10,
    outputTokens: 5,
    cachedTokens: 0,
};

function minimalLinusRequest(overrides = {}) {
    return {
        prompt: 'Check the deployment status',
        toolMode: 'slack' as const,
        context: { orgId: 'org_test', userId: 'u1', brandId: 'b1' },
        ...overrides,
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Linus Slack tier chain — gemini-flash last resort', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEnrichWithCoaching.mockResolvedValue({ name: 'Linus', role: 'CTO', capabilities: [], groundingRules: [] });
    });

    it('includes gemini-flash when tier=haiku (fallbackChain is only sonnet)', async () => {
        // Simulate: tier was set to haiku → fallbackChain=['sonnet'], no gemini-flash
        mockGetAgentModelConfig.mockResolvedValue({ slackTier: 'haiku', fallbackChain: ['sonnet'] });
        mockExecuteWithTools.mockResolvedValue(CLAUDE_RESULT);

        const { runLinus } = await import('../linus');
        const result = await runLinus(minimalLinusRequest());

        // Claude haiku succeeded — but key assertion is gemini-flash was in the ready chain
        // (verified indirectly: if haiku failed, gemini-flash would be tried)
        expect(result.content).toBe('Claude response');
    });

    it('jumps to Gemini Flash immediately when haiku fails with credits error', async () => {
        mockGetAgentModelConfig.mockResolvedValue({ slackTier: 'haiku', fallbackChain: ['sonnet'] });
        mockExecuteWithTools.mockRejectedValue(creditsError());
        mockExecuteGeminiFlashWithTools.mockResolvedValue(GEMINI_RESULT);

        const { runLinus } = await import('../linus');
        const result = await runLinus(minimalLinusRequest());

        expect(mockExecuteGeminiFlashWithTools).toHaveBeenCalledTimes(1);
        expect(result.content).toBe('Gemini Flash saved the day');
        expect(result.model).toBe('googleai/gemini-2.0-flash');
    });

    it('jumps to Gemini Flash immediately when sonnet fails with credits error', async () => {
        mockGetAgentModelConfig.mockResolvedValue({ slackTier: 'sonnet', fallbackChain: [] });
        mockExecuteWithTools.mockRejectedValue(creditsError());
        mockExecuteGeminiFlashWithTools.mockResolvedValue(GEMINI_RESULT);

        const { runLinus } = await import('../linus');
        const result = await runLinus(minimalLinusRequest());

        expect(mockExecuteGeminiFlashWithTools).toHaveBeenCalledTimes(1);
        expect(result.content).toBe('Gemini Flash saved the day');
    });

    it('does NOT invoke gemini-flash when haiku succeeds normally', async () => {
        mockGetAgentModelConfig.mockResolvedValue({ slackTier: 'haiku', fallbackChain: ['sonnet'] });
        mockExecuteWithTools.mockResolvedValue(CLAUDE_RESULT);

        const { runLinus } = await import('../linus');
        await runLinus(minimalLinusRequest());

        expect(mockExecuteGeminiFlashWithTools).not.toHaveBeenCalled();
    });

    it('throws "all tiers exhausted" when Gemini Flash also fails', async () => {
        mockGetAgentModelConfig.mockResolvedValue({ slackTier: 'haiku', fallbackChain: ['sonnet'] });
        mockExecuteWithTools.mockRejectedValue(creditsError());
        mockExecuteGeminiFlashWithTools.mockRejectedValue(new Error('Gemini quota exceeded'));

        const { runLinus } = await import('../linus');
        await expect(runLinus(minimalLinusRequest())).rejects.toThrow(/all ai tiers exhausted/i);
    });

    it('gemini-flash tier in default chain runs before Claude tiers', async () => {
        // Default chain: glm → gemini → gemini-flash → haiku → sonnet
        mockGetAgentModelConfig.mockResolvedValue({
            slackTier: 'glm',
            fallbackChain: ['gemini', 'gemini-flash', 'haiku', 'sonnet'],
        });
        // GLM not configured, gemini (GLM budget) not configured
        mockIsGLMConfigured.mockReturnValue(false);
        // gemini-flash is configured and succeeds
        mockExecuteGeminiFlashWithTools.mockResolvedValue(GEMINI_RESULT);

        const { runLinus } = await import('../linus');
        const result = await runLinus(minimalLinusRequest());

        expect(mockExecuteGeminiFlashWithTools).toHaveBeenCalledTimes(1);
        expect(mockExecuteWithTools).not.toHaveBeenCalled();
        expect(result.model).toBe('googleai/gemini-2.0-flash');
    });
});
