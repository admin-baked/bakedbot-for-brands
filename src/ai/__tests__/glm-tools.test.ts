import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }))
);

jest.mock('@/server/services/glm-usage', () => ({
  incrementGLMUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/server/services/agent-telemetry', () => ({
  buildTelemetryEvent: jest.fn((payload: unknown) => payload),
  recordAgentTelemetry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/ai/claude', () => ({
  buildSystemPrompt: jest.fn(() => 'You are Linus.'),
}));

describe('executeGLMWithTools', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-key';
  });

  it('executes OpenAI-style tool calls and returns the final GLM response', async () => {
    const { executeGLMWithTools } = require('../glm') as typeof import('../glm');

    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'search_codebase',
                    arguments: '{"query":"slack bridge"}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 6,
        },
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'MISSION_READY: root cause found and next action is clear.',
            },
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 5,
        },
      });

    const executor = jest.fn().mockResolvedValue({ matches: 1 });

    const result = await executeGLMWithTools(
      'Search the Slack bridge implementation',
      [
        {
          name: 'search_codebase',
          description: 'Search repository files',
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ],
      executor,
      {
        maxIterations: 4,
        model: 'llama-3.3-70b-versatile',
      }
    );

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(executor).toHaveBeenCalledWith('search_codebase', { query: 'slack bridge' });
    expect(result.content).toBe('MISSION_READY: root cause found and next action is clear.');
    expect(result.model).toBe('llama-3.3-70b-versatile');
    expect(result.toolExecutions).toHaveLength(1);
    expect(result.toolExecutions[0]).toMatchObject({
      name: 'search_codebase',
      input: { query: 'slack bridge' },
      status: 'success',
    });
  });
});

