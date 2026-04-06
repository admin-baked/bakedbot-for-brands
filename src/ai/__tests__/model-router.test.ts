import {
  callRoutedTextModel,
  resolveTextModelRoute,
} from '../model-router';

jest.mock('@/server/services/glm-usage', () => ({
  getGLMUsageStatus: jest.fn(),
}));

jest.mock('@/ai/glm', () => ({
  GLM_MODELS: {
    EXTRACTION: 'glm-4.5-air',
    FAST_SYNTHESIS: 'glm-4-flash',
    STANDARD: 'glm-4.7',
    STRATEGIC: 'glm-5',
  },
  isGLMConfigured: jest.fn(),
  callGLM: jest.fn(),
}));

jest.mock('@/ai/claude', () => ({
  CLAUDE_TOOL_MODEL: 'claude-sonnet-4-5-20250929',
  CLAUDE_REASONING_MODEL: 'claude-opus-4-5-20251101',
  callClaude: jest.fn(),
}));

const { getGLMUsageStatus } = jest.requireMock('@/server/services/glm-usage') as {
  getGLMUsageStatus: jest.Mock;
};
const { isGLMConfigured, callGLM } = jest.requireMock('@/ai/glm') as {
  isGLMConfigured: jest.Mock;
  callGLM: jest.Mock;
};
const { callClaude } = jest.requireMock('@/ai/claude') as {
  callClaude: jest.Mock;
};

describe('model-router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGLMUsageStatus.mockResolvedValue({ provider: 'glm' });
    isGLMConfigured.mockReturnValue(true);
    callGLM.mockResolvedValue('glm result');
    callClaude.mockResolvedValue('claude result');
  });

  it('routes sensitive work to Anthropic even when GLM is preferred', async () => {
    const route = await resolveTextModelRoute({
      sensitivity: 'sensitive',
      task: 'standard',
      preferredProvider: 'glm',
    });

    expect(route.provider).toBe('anthropic');
    expect(route.model).toBe('claude-sonnet-4-5-20250929');
    expect(route.reason).toContain('Sensitive workloads');
  });

  it('routes public synthesis work to GLM when available', async () => {
    const route = await resolveTextModelRoute({
      sensitivity: 'public',
      task: 'fast_synthesis',
      preferredProvider: 'glm',
    });

    expect(route.provider).toBe('glm');
    expect(route.model).toBe('glm-4-flash');
  });

  it('routes strategic GLM work to glm-5 when available', async () => {
    const route = await resolveTextModelRoute({
      sensitivity: 'internal_non_pii',
      task: 'strategic',
      preferredProvider: 'glm',
    });

    expect(route.provider).toBe('glm');
    expect(route.model).toBe('glm-5');
  });

  it('falls back to Anthropic when GLM is unavailable', async () => {
    isGLMConfigured.mockReturnValue(false);

    const route = await resolveTextModelRoute({
      sensitivity: 'internal_non_pii',
      task: 'standard',
      preferredProvider: 'glm',
    });

    expect(route.provider).toBe('anthropic');
    expect(route.reason).toContain('GLM unavailable');
  });

  it('uses Anthropic for tool workflows regardless of sensitivity', async () => {
    const route = await resolveTextModelRoute({
      sensitivity: 'public',
      task: 'strategic',
      requiresTools: true,
    });

    expect(route.provider).toBe('anthropic');
    expect(route.model).toBe('claude-opus-4-5-20251101');
  });

  it('falls back to Anthropic when a GLM call fails', async () => {
    callGLM.mockRejectedValueOnce(new Error('glm outage'));

    const result = await callRoutedTextModel({
      sensitivity: 'public',
      task: 'standard',
      userMessage: 'Summarize the latest public cannabis news',
    });

    expect(callGLM).toHaveBeenCalled();
    expect(callClaude).toHaveBeenCalled();
    expect(result.content).toBe('claude result');
    expect(result.route.provider).toBe('anthropic');
    expect(result.route.reason).toContain('GLM failed');
  });
});

