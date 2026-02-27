import { pinkyToolExecutor } from '../pinky';

jest.mock('@/ai/claude', () => ({
  executeWithTools: jest.fn(),
  isClaudeAvailable: jest.fn(() => true),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('pinky tool executor', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'cron-secret';
    process.env.NEXTAUTH_URL = 'https://example.test';
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns an error when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;

    const result = await pinkyToolExecutor('run_golden_set_eval', {
      agent: 'deebo',
      tier: 'fast',
    });

    expect(result).toEqual({
      success: false,
      error: 'CRON_SECRET not configured - cannot run golden set eval',
    });
  });

  it('returns an error when qa-golden-eval endpoint returns non-200', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Server misconfiguration' }),
    });

    const result = await pinkyToolExecutor('run_golden_set_eval', {
      agent: 'deebo',
      tier: 'fast',
    });

    expect(result).toEqual({
      success: false,
      error: 'qa-golden-eval returned 500: Server misconfiguration',
    });
  });

  it('returns an error when qa-golden-eval payload is malformed', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        complianceFailed: false,
      }),
    });

    const result = await pinkyToolExecutor('run_golden_set_eval', {
      agent: 'deebo',
      tier: 'fast',
    });

    expect(result).toEqual({
      success: false,
      error: 'qa-golden-eval returned malformed payload',
    });
  });

  it('returns verdict and metrics when qa-golden-eval succeeds', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        score: 96,
        passed: 24,
        failed: 1,
        total: 25,
        threshold: 90,
        complianceFailed: false,
        belowThreshold: false,
        stdout: 'Passed: 24/25 Score: 96% Threshold: 90%',
      }),
    });

    const result = await pinkyToolExecutor('run_golden_set_eval', {
      agent: 'deebo',
      tier: 'fast',
    });

    expect(result).toEqual({
      agent: 'deebo',
      tier: 'fast',
      score: 96,
      passed: 24,
      failed: 1,
      total: 25,
      threshold: 90,
      complianceFailed: false,
      belowThreshold: false,
      verdict: 'PASSING: 96% (24/25)',
      stdout: 'Passed: 24/25 Score: 96% Threshold: 90%',
    });
  });
});
