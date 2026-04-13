import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCallGemini = jest.fn();
const mockIsGeminiFlashConfigured = jest.fn();
const mockCallClaude = jest.fn();

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/ai/gemini-flash-tools', () => ({
  callGemini: mockCallGemini,
  isGeminiFlashConfigured: mockIsGeminiFlashConfigured,
}));

jest.mock('@/ai/claude', () => ({
  callClaude: mockCallClaude,
}));

describe('callGroqOrClaude fallback routing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
    };
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers Gemini Flash before Claude when requested', async () => {
    mockIsGeminiFlashConfigured.mockReturnValue(true);
    mockCallGemini.mockResolvedValue('gemini result');

    const { callGroqOrClaude } = await import('../glm');
    const result = await callGroqOrClaude({
      userMessage: 'audit this site',
      caller: 'retention-audit',
      preferGeminiFallback: true,
    });

    expect(result).toBe('gemini result');
    expect(mockCallGemini).toHaveBeenCalledWith(expect.objectContaining({
      userMessage: 'audit this site',
      caller: 'retention-audit',
    }));
    expect(mockCallClaude).not.toHaveBeenCalled();
  });

  it('falls back to Claude if Gemini Flash fallback is unavailable', async () => {
    mockIsGeminiFlashConfigured.mockReturnValue(false);
    mockCallClaude.mockResolvedValue('claude result');

    const { callGroqOrClaude } = await import('../glm');
    const result = await callGroqOrClaude({
      userMessage: 'audit this site',
      caller: 'retention-audit',
      preferGeminiFallback: true,
    });

    expect(result).toBe('claude result');
    expect(mockCallClaude).toHaveBeenCalledWith(expect.objectContaining({
      userMessage: 'audit this site',
      caller: 'retention-audit',
      model: 'claude-haiku-4-5-20251001',
    }));
  });
});
