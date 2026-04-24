
import { leoAgent } from '../leo';

// Mock dependencies
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: { attachBlocksForRole: jest.fn() },
    BLOCK_LABELS: { AGENT_LINUS: 'agent_linus', AGENT_LEO: 'agent_leo', AGENT_CRAIG: 'agent_craig', AGENT_MARTY: 'agent_marty', AGENT_PUFF: 'agent_puff' }
}));
jest.mock('@/server/agents/agent-definitions', () => ({
    getDelegatableAgentIds: jest.fn(() => ['craig', 'leo', 'linus']),
    canRoleAccessAgent: jest.fn().mockReturnValue(true),
    buildSquadRoster: jest.fn().mockReturnValue(''),
    buildIntegrationStatusSummary: jest.fn().mockReturnValue(''),
    AGENT_LINUS: 'linus',
    AGENT_LEO: 'leo',
    AGENT_CRAIG: 'craig',
    AGENT_CAPABILITIES: [],
}));
jest.mock('@/server/services/org-integration-status', () => ({
    buildIntegrationStatusSummaryForOrg: jest.fn().mockResolvedValue('All integrations active'),
}));
jest.mock('@/server/services/agent-learning-loop', () => ({
    makeLearningLoopToolsImpl: jest.fn().mockReturnValue({}),
}));
jest.mock('../ny10-context', () => ({
    buildNY10PilotContext: jest.fn().mockResolvedValue(''),
}));

describe('Leo Agent (COO)', () => {
    it('should initialize with correct system instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand', id: 'brand-123' },
            priority_objectives: [{ id: 'obj-1', description: 'Grow Revenue' }]
        };
        const agentMemory = { agent_id: 'leo', objectives: [] } as any;

        const result = await leoAgent.initialize(brandMemory as any, agentMemory);

        // joinPromptSections overwrites system_instructions; final text starts with:
        // "You are Leo, the COO for Test Brand."
        expect(result.system_instructions).toContain('COO');
        expect(result.system_instructions).toContain('Test Brand');
        expect(result.objectives).toEqual(brandMemory.priority_objectives);
    });

    it('should have orchestration tools in act definitions', async () => {
        const brandMemory = {};
        const agentMemory = {
            workflows: [{ status: 'in_progress', lastUpdate: Date.now() - 3600000 }] // Stalled > 30m
        };

        const stimulus = await leoAgent.orient(brandMemory as any, agentMemory as any, undefined);
        expect(stimulus).toBe('workflow_stalled');
    });

    it('should process user request stimulus', async () => {
        const stimulus = await leoAgent.orient({} as any, {} as any, "Do something");
        expect(stimulus).toBe('user_request');
    });
});
