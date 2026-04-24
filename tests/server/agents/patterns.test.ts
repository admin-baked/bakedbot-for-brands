/**
 * Unit tests for Research-Elaboration Pattern
 * Tests the types, constants, and function exports.
 *
 * Note: runResearchElaboration calls harness.runMultiStepTask which has deep
 * dependencies (Claude, Gemini, Letta). Full integration tests for the
 * research-elaboration flow live in the stress test suite.
 */

import { jest, describe, it, expect } from '@jest/globals';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  runResearchElaboration,
  marketResearchWithElaboration,
  productResearchWithElaboration,
  DEFAULT_ELABORATION_INSTRUCTIONS,
} from '@/server/agents/patterns';
import type { ResearchElaborationConfig } from '@/server/agents/patterns';

describe('Research-Elaboration Pattern', () => {

  describe('Exports', () => {
    it('should export runResearchElaboration as a function', () => {
      expect(typeof runResearchElaboration).toBe('function');
    });

    it('should export marketResearchWithElaboration as a function', () => {
      expect(typeof marketResearchWithElaboration).toBe('function');
    });

    it('should export productResearchWithElaboration as a function', () => {
      expect(typeof productResearchWithElaboration).toBe('function');
    });

    it('should export ResearchElaborationConfig type (used in config)', () => {
      // Type-only check: verify the config shape is usable
      const config: ResearchElaborationConfig = {
        researchTools: [],
        researchToolsImpl: {},
      };
      expect(config).toBeDefined();
    });
  });

  describe('DEFAULT_ELABORATION_INSTRUCTIONS', () => {
    it('should include all required sections', () => {
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('ADD CONTEXT');
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('ADD EXAMPLES');
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('ADD IMPLICATIONS');
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('STRUCTURE');
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('PRIORITIZE');
    });

    it('should include output rules', () => {
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('Key Takeaways');
      expect(DEFAULT_ELABORATION_INSTRUCTIONS).toContain('Recommended Actions');
    });
  });
});
