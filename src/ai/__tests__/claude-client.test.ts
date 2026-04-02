const mockAnthropic = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: mockAnthropic,
}));

describe('getClaudeClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('initializes Anthropic with the canonical Claude env vars', async () => {
    process.env.CLAUDE_API_KEY = 'claude-test-key';
    process.env.ANTHROPIC_BASE_URL = 'https://proxy.example.com';

    const { getClaudeClient } = await import('@/ai/claude');
    getClaudeClient();

    expect(mockAnthropic).toHaveBeenCalledWith({
      apiKey: 'claude-test-key',
      baseURL: 'https://proxy.example.com',
    });
  });

  it('throws when the canonical Claude API key is missing', async () => {
    delete process.env.CLAUDE_API_KEY;

    const { getClaudeClient } = await import('@/ai/claude');

    expect(() => getClaudeClient()).toThrow(
      'CLAUDE_API_KEY environment variable is required for Claude tool calling',
    );
  });
});
