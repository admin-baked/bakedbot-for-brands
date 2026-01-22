/**
 * Unit tests for Research-Elaboration Pattern
 * Tests the 2-phase pattern: Research → Elaboration
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the harness
const mockRunMultiStepTask = jest.fn();
jest.mock('@/server/agents/harness', () => ({
  runMultiStepTask: mockRunMultiStepTask,
}));

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
import { z } from 'zod';

describe('Research-Elaboration Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runResearchElaboration', () => {
    it('should run research phase first, then elaboration', async () => {
      // Mock research phase
      mockRunMultiStepTask
        .mockResolvedValueOnce({
          finalResult: 'Research findings: Found 3 competitors',
          steps: [
            { tool: 'searchWeb', args: { query: 'test' }, result: 'results' },
          ],
        })
        // Mock elaboration phase
        .mockResolvedValueOnce({
          finalResult: 'Enhanced report with context and recommendations',
          steps: [],
        });

      const config: ResearchElaborationConfig = {
        researchTools: [
          {
            name: 'searchWeb',
            description: 'Search the web',
            schema: z.object({ query: z.string() }),
          },
        ],
        researchToolsImpl: {
          searchWeb: jest.fn().mockResolvedValue('search results'),
        },
      };

      const result = await runResearchElaboration('test query', config);

      // Verify research was called first
      expect(mockRunMultiStepTask).toHaveBeenCalledTimes(2);

      // Verify result structure
      expect(result.researchOutput.content).toBe('Research findings: Found 3 competitors');
      expect(result.researchOutput.steps).toHaveLength(1);
      expect(result.elaboratedOutput).toBe('Enhanced report with context and recommendations');
      expect(result.metadata).toHaveProperty('researchDurationMs');
      expect(result.metadata).toHaveProperty('elaborationDurationMs');
      expect(result.metadata).toHaveProperty('totalDurationMs');
    });

    it('should pass research output to elaboration phase', async () => {
      const researchResult = 'Found pricing data for 5 competitors';

      mockRunMultiStepTask
        .mockResolvedValueOnce({
          finalResult: researchResult,
          steps: [{ tool: 'scanCompetitors', args: { location: 'Detroit' }, result: {} }],
        })
        .mockResolvedValueOnce({
          finalResult: 'Elaborated analysis',
          steps: [],
        });

      const config: ResearchElaborationConfig = {
        researchTools: [],
        researchToolsImpl: {},
      };

      await runResearchElaboration('test', config);

      // Check that elaboration received research output
      const elaborationCall = mockRunMultiStepTask.mock.calls[1];
      expect(elaborationCall[0].userQuery).toContain(researchResult);
      expect(elaborationCall[0].userQuery).toContain('RESEARCH FINDINGS');
    });

    it('should call onResearchComplete callback when research finishes', async () => {
      const onResearchComplete = jest.fn();

      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: 'research', steps: [] })
        .mockResolvedValueOnce({ finalResult: 'elaboration', steps: [] });

      await runResearchElaboration('test', {
        researchTools: [],
        researchToolsImpl: {},
        onResearchComplete,
      });

      expect(onResearchComplete).toHaveBeenCalledTimes(1);
      expect(onResearchComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'research',
          steps: [],
        })
      );
    });

    it('should respect maxResearchIterations config', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      await runResearchElaboration('test', {
        researchTools: [],
        researchToolsImpl: {},
        maxResearchIterations: 10,
      });

      const researchCall = mockRunMultiStepTask.mock.calls[0];
      expect(researchCall[0].maxIterations).toBe(10);
    });

    it('should use custom elaboration instructions when provided', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      const customInstructions = 'Focus on pricing analysis only';

      await runResearchElaboration('test', {
        researchTools: [],
        researchToolsImpl: {},
        elaboration: {
          instructions: customInstructions,
        },
      });

      const elaborationCall = mockRunMultiStepTask.mock.calls[1];
      expect(elaborationCall[0].systemInstructions).toBe(customInstructions);
    });
  });

  describe('marketResearchWithElaboration', () => {
    it('should create proper tool definitions for market research', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      const mockScanCompetitors = jest.fn().mockResolvedValue({});
      const mockGetCompetitiveIntel = jest.fn().mockResolvedValue({});

      await marketResearchWithElaboration(
        'Detroit cannabis market',
        {
          scanCompetitors: mockScanCompetitors,
          getCompetitiveIntel: mockGetCompetitiveIntel,
        },
        'tenant-123'
      );

      const researchCall = mockRunMultiStepTask.mock.calls[0];
      const toolsDef = researchCall[0].toolsDef;

      expect(toolsDef).toContainEqual(
        expect.objectContaining({ name: 'scanCompetitors' })
      );
      expect(toolsDef).toContainEqual(
        expect.objectContaining({ name: 'getCompetitiveIntel' })
      );
    });

    it('should include market research specific elaboration instructions', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      await marketResearchWithElaboration('test', {}, 'tenant-123');

      const elaborationCall = mockRunMultiStepTask.mock.calls[1];
      expect(elaborationCall[0].systemInstructions).toContain('MARKET RESEARCH FOCUS');
      expect(elaborationCall[0].systemInstructions).toContain('pricing opportunities');
    });
  });

  describe('productResearchWithElaboration', () => {
    it('should create proper tool definitions for product research', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      const mockSearchMenu = jest.fn().mockResolvedValue({});

      await productResearchWithElaboration('indica flower', {
        searchMenu: mockSearchMenu,
      });

      const researchCall = mockRunMultiStepTask.mock.calls[0];
      const toolsDef = researchCall[0].toolsDef;

      expect(toolsDef).toContainEqual(
        expect.objectContaining({ name: 'searchMenu' })
      );
    });

    it('should include budtender style elaboration instructions', async () => {
      mockRunMultiStepTask
        .mockResolvedValueOnce({ finalResult: '', steps: [] })
        .mockResolvedValueOnce({ finalResult: '', steps: [] });

      await productResearchWithElaboration('test', {});

      const elaborationCall = mockRunMultiStepTask.mock.calls[1];
      expect(elaborationCall[0].systemInstructions).toContain('PRODUCT RESEARCH FOCUS');
      expect(elaborationCall[0].systemInstructions).toContain('budtender');
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
