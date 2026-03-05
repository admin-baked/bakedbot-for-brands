/**
 * GLM Test Helper for Industry Pulse
 *
 * Provides mocked GLM responses for unit/integration tests
 *
 * Usage in tests:
 *   jest.mock('@/ai/glm', () => ({
 *     ...jest.requireActual('@/ai/glm'),
 *     callGLM: jest.fn(),
 *     USE_GLM_IN_TESTS: true
 *   }));
 *
 * Production code uses `USE_GLM_IN_TESTS` flag:
 * - When true: GLM calls use mocked implementation (fast, reliable)
 * - When false or undefined: Production uses real GLM with Claude fallback
 */

import type { GLMModel } from '@/ai/glm';
import { mockCallGLM, mockResponses } from '@/ai/__mocks__/glm';

/**
 * Get a mock GLM response for a specific model and prompt
 * Used in tests to simulate GLM API calls
 */
export async function getMockGLMResponse(options: {
  userMessage: string;
  model: GLMModel;
  maxTokens?: number;
}): Promise<string> {
  return mockCallGLM(options);
}

export { mockResponses, mockCallGLM };
