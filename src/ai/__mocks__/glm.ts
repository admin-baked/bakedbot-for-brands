/**
 * GLM Mock for Unit Tests
 *
 * Mocks `callGLM()` to provide fast, reliable test responses
 * without external API dependencies or network calls
 *
 * Usage in test files:
 *   jest.mock('@/ai/glm', () => ({
 *     ...jest.requireActual('@/ai/glm'),
 *     callGLM: jest.fn(),
 *     isGLMConfigured: jest.fn(() => true)
 *   }));
 *   const { callGLM } = await import('@/ai/glm');
 *   callGLM.mockResolvedValue('Mock GLM response');
 */

import type { GLMModel } from '@/ai/glm';
import { logger } from '@/lib/logger';

/**
 * Mock response for each model tier
 */
const mockResponses: Record<GLMModel, string> = {
  'glm-5': 'GLM-5 generated strategic insight for this request.',
  'glm-5v-turbo': 'GLM-5v-turbo generated strategic insight for this request.',
  'glm-4.7': 'GLM-4.7 generated strategic insight for this request.',
  'glm-4.5-air': 'GLM-4.5-air generated strategic insight for this request.',
  'glm-4-flash': 'GLM-4-flash generated strategic insight for this request.',
};

/**
 * Mock callGLM implementation for direct use in tests
 * Simulates actual callGLM function with mock responses
 */
export async function mockCallGLM(options: {
  userMessage: string;
  model: GLMModel;
  maxTokens?: number;
}): Promise<string> {
  const mockResponse = mockResponses[options.model] || 'GLM-4.7 generated default response.';

  // Simulate network delay for realism
  await new Promise(resolve => setTimeout(resolve, 50));

  logger.debug('[GLM Mock] callGLM', { model: options.model, userMessage: options.userMessage });
  return mockResponse;
}

export { mockResponses };

