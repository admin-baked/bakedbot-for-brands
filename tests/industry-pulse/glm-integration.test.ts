/**
 * GLM Integration Test for Industry Pulse
 *
 * Tests that the GLM wrapper works correctly:
 * - Mock returns predictable responses
 * - Model selection is correct
 * - Helper functions work as expected
 */

import { describe, beforeEach, it, expect } from '@jest/globals';
import { getMockGLMResponse, mockResponses } from '@/server/services/industry-pulse/glm-helper';
import { mockCallGLM } from '@/ai/__mocks__/glm';

// Mock logger to avoid console output in tests
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GLM Integration', () => {
  describe('mock helper functions', () => {
    it('should return mocked response for glm-4.7', async () => {
      const response = await getMockGLMResponse({
        userMessage: 'Test prompt',
        model: 'glm-4.7',
        maxTokens: 500,
      });
      expect(response).toBe('GLM-4.7 generated strategic insight for this request.');
    });

    it('should return mocked response for glm-4-flash', async () => {
      const response = await getMockGLMResponse({
        userMessage: 'Test prompt',
        model: 'glm-4-flash',
        maxTokens: 500,
      });
      expect(response).toBe('GLM-4-flash generated strategic insight for this request.');
    });

    it('should return mocked response for glm-5', async () => {
      const response = await mockCallGLM({
        userMessage: 'Strategic analysis request',
        model: 'glm-5',
        maxTokens: 2048,
      });
      expect(response).toBe('GLM-5 generated strategic insight for this request.');
    });

    it('should use default response for unknown model', async () => {
      const response = await mockCallGLM({
        userMessage: 'Test',
        model: 'glm-unknown' as any,
        maxTokens: 500,
      });
      expect(response).toBe('GLM-4.7 generated default response.');
    });

    it('should provide mock responses for all model tiers', () => {
      expect(mockResponses['glm-5']).toContain('GLM-5');
      expect(mockResponses['glm-4.7']).toContain('GLM-4.7');
      expect(mockResponses['glm-4.5-air']).toContain('GLM-4.5-air');
      expect(mockResponses['glm-4-flash']).toContain('GLM-4-flash');
    });

    it('should include strategic insight in all mock responses', () => {
      Object.values(mockResponses).forEach(response => {
        expect(response).toMatch(/strategic insight/i);
      });
    });
  });
});
