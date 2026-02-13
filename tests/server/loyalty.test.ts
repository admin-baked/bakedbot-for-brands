/**
 * Unit Tests: Mrs. Parker Agent (Retention Manager)
 *
 * This test suite validates the current harness-based planner flow:
 * - `initialize()` sets dynamic system instructions safely
 * - `orient()` routes stimulus to `user_request`
 * - `act()` delegates to `runMultiStepTask()` and formats log entries
 */

import { mrsParkerAgent, type MrsParkerTools } from '@/server/agents/mrsParker';
import { runMultiStepTask } from '@/server/agents/harness';

// Keep Mrs. Parker tests hermetic: don't touch real Firebase/Admin SDK init.
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn().mockResolvedValue({
    firestore: {},
  }),
}));

jest.mock('@/server/agents/deebo', () => ({
  deeboCheckMessage: jest.fn().mockResolvedValue({ ok: true, reason: null }),
  deebo: {},
}));

jest.mock('@/server/services/letta/block-manager', () => ({
  lettaBlockManager: {
    attachBlocksForRole: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/server/agents/harness', () => ({
  runMultiStepTask: jest.fn(),
}));

describe('Mrs. Parker Agent (Harness)', () => {
  const brandMemory = {
    brand_profile: { name: 'Test Brand', id: 'brand_123' },
    priority_objectives: [],
    constraints: { jurisdictions: [] },
    segments: [],
    experiments_index: [],
    playbooks: {},
  } as any;

  const baseMemory = {
    agent_id: 'mrs_parker',
    loyalty_segments: [],
    journeys: [],
  } as any;

  let mockTools: MrsParkerTools;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTools = {
      predictChurnRisk: jest.fn(),
      generateLoyaltyCampaign: jest.fn(),
    };
  });

  it('initialize sets system instructions with brand name (and does not throw)', async () => {
    const result = await mrsParkerAgent.initialize(brandMemory, { ...baseMemory });

    expect(result).toBeDefined();
    expect(result.system_instructions).toContain('Customer Retention Manager for Test Brand');
    expect(result.journeys).toEqual([]);
    expect(result.loyalty_segments).toEqual([]);
  });

  it('orient returns user_request when a stimulus string is provided', async () => {
    const targetId = await mrsParkerAgent.orient(brandMemory, { ...baseMemory }, 'Help me win back churned VIPs');
    expect(targetId).toBe('user_request');
  });

  it('orient returns journey target when a journey is running and no stimulus exists', async () => {
    const targetId = await mrsParkerAgent.orient(
      brandMemory,
      {
        ...baseMemory,
        journeys: [
          {
            id: 'journey_vip',
            status: 'running',
            steps: [],
          },
        ],
      },
      undefined
    );

    expect(targetId).toBe('journey:journey_vip');
  });

  it('act delegates to runMultiStepTask for user_request and returns mrs_parker_task_complete', async () => {
    (runMultiStepTask as jest.Mock).mockResolvedValueOnce({
      finalResult: 'All set.',
      steps: [{ tool: 'predictChurnRisk', args: { segmentId: 'vip' }, result: { riskLevel: 'low', atRiskCount: 3 } }],
    });

    const result = await mrsParkerAgent.act(
      brandMemory,
      { ...baseMemory, system_instructions: 'SYSTEM' },
      'user_request',
      mockTools,
      'Analyze churn risk for VIPs'
    );

    expect(runMultiStepTask).toHaveBeenCalledTimes(1);
    expect(runMultiStepTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userQuery: 'Analyze churn risk for VIPs',
        systemInstructions: 'SYSTEM',
        tools: mockTools,
        model: 'googleai/gemini-3-pro-preview',
        maxIterations: 5,
        toolsDef: expect.arrayContaining([expect.objectContaining({ name: 'predictChurnRisk' })]),
      })
    );

    expect(result.logEntry.action).toBe('mrs_parker_task_complete');
    expect(result.logEntry.result).toBe('All set.');
    expect(result.logEntry.metadata?.steps).toHaveLength(1);
  });

  it('act returns an error logEntry when runMultiStepTask throws', async () => {
    (runMultiStepTask as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    const result = await mrsParkerAgent.act(
      brandMemory,
      { ...baseMemory, system_instructions: 'SYSTEM' },
      'user_request',
      mockTools,
      'Do something'
    );

    expect(result.logEntry.action).toBe('error');
    expect(result.logEntry.result).toContain('Mrs Parker Task failed: boom');
  });

  it('act returns idle for non-user_request targets', async () => {
    const result = await mrsParkerAgent.act(brandMemory, { ...baseMemory }, 'journey:any', mockTools);
    expect(result.logEntry.action).toBe('idle');
  });
});

