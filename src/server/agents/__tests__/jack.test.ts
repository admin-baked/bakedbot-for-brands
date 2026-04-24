
import { jackAgent } from '../jack';

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

describe('Jack Agent (CRO)', () => {
    it('should initialize with revenue-focused instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand' },
            priority_objectives: []
        };
        const agentMemory = { agent_id: 'jack' } as any;

        const result = await jackAgent.initialize(brandMemory as any, agentMemory);

        // joinPromptSections overwrites system_instructions; final text starts with:
        // "You are Jack, the CRO for Test Brand."
        expect(result.system_instructions).toContain('CRO');
        expect(result.system_instructions).toContain('Test Brand');
    });

    it('should identify stalled deals stimulus', async () => {
        const agentMemory = {
            deals: [{ stage: 'negotiation', daysSinceUpdate: 10 }]
        };

        const stimulus = await jackAgent.orient({} as any, agentMemory as any, undefined);
        expect(stimulus).toBe('follow_up_deal');
    });
});
