/**
 * Unit Tests: Smokey Agent (Budtender & Recommendation Engine)
 *
 * Tests for Smokey's UX experiment management and recommendation policy validation
 * Verifies agent lifecycle (initialize, orient, act) and tool integration
 *
 * [BUILDER-MODE @ 2025-12-10]
 * Created as part of feat_iheart_loyalty_production (test_smokey_logic)
 */

import type { SmokeyTools } from '@/server/agents/smokey';
import type { SmokeyMemory, BrandMemory } from '@/server/agents/schemas';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock harness
jest.mock('@/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockImplementation(async () => {
        return {
            finalResult: 'Mocked Smokey Plan',
            steps: []
        };
    })
}));

// Mock grounding dynamic loader to avoid Firebase Admin initialization in unit tests
jest.mock('@/server/grounding/dynamic-loader', () => ({
    loadGroundTruth: jest.fn().mockResolvedValue(null),
    hasGroundTruthDynamic: jest.fn().mockResolvedValue(false),
    hasGroundTruthSync: jest.fn().mockReturnValue(false),
    getGroundTruthSource: jest.fn().mockResolvedValue('none'),
}));

// NOTE: require after mocks so smokey doesn't initialize Firebase via ground truth loading.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { smokeyAgent } = require('@/server/agents/smokey');

describe('Smokey Agent', () => {
  let brandMemory: BrandMemory;
  let smokeyMemory: SmokeyMemory;
  let mockTools: SmokeyTools;

  beforeEach(() => {
    // Initialize brand memory
    brandMemory = {
      brand_id: 'brand_123',
      brand_name: 'Test Dispensary',
      state: 'IL',
      kpis: {
        gmv_target_monthly: 100000,
        gmv_current_monthly: 75000,
        conversion_rate_target: 0.05,
        conversion_rate_current: 0.03,
        cart_abandonment_target: 0.20,
        cart_abandonment_current: 0.35,
      },
      constraints: {
        max_discount_percent: 30,
        min_margin_percent: 20,
        blocked_brands: [],
      },
      updated_at: new Date().toISOString(),
    };

    // Initialize Smokey memory
    smokeyMemory = {
      agent_id: 'smokey',
      ux_experiments: [],
      rec_policies: [],
    };

    // Mock tools
    mockTools = {
      analyzeExperimentResults: jest.fn(),
      rankProductsForSegment: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize without running experiments', async () => {
      const result = await smokeyAgent.initialize(brandMemory, smokeyMemory);

      expect(result).toBeDefined();
      expect(result.ux_experiments).toEqual([]);
      expect(result.rec_policies).toEqual([]);
    });

    it('should pause multiple running experiments, keeping only the first', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_1',
          name: 'Checkout Flow A/B',
          status: 'running',
          variants: [
            { id: 'control', sessions: 50, conversions: 2 },
            { id: 'variant_a', sessions: 50, conversions: 3 },
          ],
          winner: null,
        },
        {
          id: 'exp_2',
          name: 'Product Card Design',
          status: 'running',
          variants: [
            { id: 'control', sessions: 30, conversions: 1 },
            { id: 'variant_b', sessions: 30, conversions: 2 },
          ],
          winner: null,
        },
      ];

      const result = await smokeyAgent.initialize(brandMemory, smokeyMemory);

      // First experiment should stay running
      expect(result.ux_experiments[0].status).toBe('running');
      // Second experiment should be queued
      expect(result.ux_experiments[1].status).toBe('queued');
    });
  });

  describe('orient', () => {
    it('should prioritize running experiment with enough sessions', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_ready',
          name: 'Experiment Ready for Decision',
          status: 'running',
          variants: [
            { id: 'control', sessions: 60, conversions: 3 },
            { id: 'variant_a', sessions: 60, conversions: 6 },
          ],
          winner: null,
        },
      ];

      const targetId = await smokeyAgent.orient(brandMemory, smokeyMemory);

      expect(targetId).toBe('exp_ready');
    });

    it('should return null if running experiment has insufficient sessions', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_not_ready',
          name: 'Experiment Not Ready',
          status: 'running',
          variants: [
            { id: 'control', sessions: 10, conversions: 0 },
            { id: 'variant_a', sessions: 10, conversions: 1 },
          ],
          winner: null,
        },
      ];

      const targetId = await smokeyAgent.orient(brandMemory, smokeyMemory);

      expect(targetId).toBeNull();
    });

    it('should prioritize experimental rec policy if no experiment ready', async () => {
      smokeyMemory.rec_policies = [
        {
          id: 'policy_exp',
          name: 'Experimental Policy',
          status: 'experimental',
          logic: 'semantic_similarity',
          config: {},
        },
      ];

      const targetId = await smokeyAgent.orient(brandMemory, smokeyMemory);

      expect(targetId).toBe('policy_exp');
    });

    it('should launch queued experiment if no running experiment exists', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_queued',
          name: 'Queued Experiment',
          status: 'queued',
          variants: [
            { id: 'control', sessions: 0, conversions: 0 },
            { id: 'variant_a', sessions: 0, conversions: 0 },
          ],
          winner: null,
        },
      ];

      const targetId = await smokeyAgent.orient(brandMemory, smokeyMemory);

      expect(targetId).toBe('exp_queued');
    });
  });

  describe('act - UX Experiments', () => {
    it('should launch a queued experiment', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_launch',
          name: 'Launch Me',
          status: 'queued',
          variants: [
            { id: 'control', sessions: 0, conversions: 0 },
            { id: 'variant_a', sessions: 0, conversions: 0 },
          ],
          winner: null,
        },
      ];

      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'exp_launch', mockTools);

      expect(result.updatedMemory.ux_experiments[0].status).toBe('running');
      expect(result.logEntry.action).toBe('monitor_experiment');
      expect(result.logEntry.result).toContain('Launched UX Experiment');
    });

    it('should conclude experiment with high confidence winner', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_conclude',
          name: 'Ready to Conclude',
          status: 'running',
          variants: [
            { id: 'control', sessions: 100, conversions: 5 },
            { id: 'variant_a', sessions: 100, conversions: 12 },
          ],
          winner: null,
        },
      ];

      (mockTools.analyzeExperimentResults as jest.Mock).mockResolvedValueOnce({
        winner: 'variant_a',
        confidence: 0.98,
      });

      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'exp_conclude', mockTools);

      expect(result.updatedMemory.ux_experiments[0].status).toBe('completed');
      expect(result.updatedMemory.ux_experiments[0].winner).toBe('variant_a');
      expect(result.logEntry.action).toBe('conclude_experiment');
      expect(result.logEntry.result).toContain('Concluded Experiment');
      expect(result.logEntry.result).toContain('98.0%');
    });

    it('should continue monitoring experiment with low confidence', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_monitor',
          name: 'Still Monitoring',
          status: 'running',
          variants: [
            { id: 'control', sessions: 50, conversions: 2 },
            { id: 'variant_a', sessions: 50, conversions: 3 },
          ],
          winner: null,
        },
      ];

      (mockTools.analyzeExperimentResults as jest.Mock).mockResolvedValueOnce({
        winner: 'variant_a',
        confidence: 0.75,
      });

      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'exp_monitor', mockTools);

      expect(result.updatedMemory.ux_experiments[0].status).toBe('running');
      expect(result.updatedMemory.ux_experiments[0].winner).toBeNull();
      expect(result.logEntry.action).toBe('monitor_experiment');
      expect(result.logEntry.result).toContain('Monitoring Experiment');
      expect(result.logEntry.result).toContain('75.0%');
    });
  });

  describe('act - Recommendation Policies', () => {
    it('should validate experimental policy using Genkit ranking', async () => {
      smokeyMemory.rec_policies = [
        {
          id: 'policy_validate',
          name: 'Validation Test Policy',
          status: 'experimental',
          logic: 'semantic_similarity',
          config: {},
        },
      ];

      (mockTools.rankProductsForSegment as jest.Mock).mockResolvedValueOnce([
        'prod_1',
        'prod_2',
        'prod_3',
      ]);

      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'policy_validate', mockTools);

      expect(result.updatedMemory.rec_policies[0].status).toBe('passing');
      expect(result.logEntry.action).toBe('validate_policy');
      expect(result.logEntry.result).toContain('Validated experimental policy');
      expect(result.logEntry.metadata.ranked_count).toBe(3);
    });

    it('should handle policy with no valid rankings', async () => {
      smokeyMemory.rec_policies = [
        {
          id: 'policy_fail',
          name: 'Failing Policy',
          status: 'experimental',
          logic: 'semantic_similarity',
          config: {},
        },
      ];

      (mockTools.rankProductsForSegment as jest.Mock).mockResolvedValueOnce([]);

      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'policy_fail', mockTools);

      expect(result.updatedMemory.rec_policies[0].status).toBe('experimental');
      expect(result.logEntry.result).toContain('Policy produced no valid rankings');
    });
  });

  describe('error handling', () => {
    it('should return no_action for non-existent target', async () => {
      const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'nonexistent_target', mockTools);
      
      expect(result.logEntry.action).toBe('no_action');
      expect(result.logEntry.result).toContain('No matching work target found');
    });
  });

  describe('act - User Request (Planner)', () => {
    it('should delegate to runMultiStepTask for user requests', async () => {
        const result = await smokeyAgent.act(brandMemory, smokeyMemory, 'user_request', mockTools, 'Find me some weed');
        
        expect(result.logEntry.action).toBe('task_completed');
        expect(result.logEntry.result).toBe('Mocked Smokey Plan');
    });
  });

  describe('tool integration', () => {
    it('should call analyzeExperimentResults with correct parameters', async () => {
      smokeyMemory.ux_experiments = [
        {
          id: 'exp_tool_test',
          name: 'Tool Test',
          status: 'running',
          variants: [
            { id: 'control', sessions: 100, conversions: 5 },
            { id: 'variant_a', sessions: 100, conversions: 8 },
          ],
          winner: null,
        },
      ];

      (mockTools.analyzeExperimentResults as jest.Mock).mockResolvedValueOnce({
        winner: 'variant_a',
        confidence: 0.88,
      });

      await smokeyAgent.act(brandMemory, smokeyMemory, 'exp_tool_test', mockTools);

      expect(mockTools.analyzeExperimentResults).toHaveBeenCalledWith(
        'exp_tool_test',
        expect.arrayContaining([
          expect.objectContaining({ id: 'control' }),
          expect.objectContaining({ id: 'variant_a' }),
        ])
      );
    });

    it('should call rankProductsForSegment with correct parameters', async () => {
      smokeyMemory.rec_policies = [
        {
          id: 'policy_tool_test',
          name: 'Tool Test Policy',
          status: 'experimental',
          logic: 'semantic_similarity',
          config: {},
        },
      ];

      (mockTools.rankProductsForSegment as jest.Mock).mockResolvedValueOnce(['prod_1']);

      await smokeyAgent.act(brandMemory, smokeyMemory, 'policy_tool_test', mockTools);

      expect(mockTools.rankProductsForSegment).toHaveBeenCalledWith(
        'test_segment',
        ['prod_1', 'prod_2', 'prod_3']
      );
    });
  });
});
