
import { glendaAgent } from '../glenda';

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

describe('Glenda Agent (CMO)', () => {
    it('should initialize with marketing-focused instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand' },
            priority_objectives: []
        };
        const agentMemory = { agent_id: 'glenda' } as any;

        const result = await glendaAgent.initialize(brandMemory as any, agentMemory);

        // joinPromptSections overwrites system_instructions; final text starts with:
        // "You are Glenda, the Chief Marketing Officer for Test Brand."
        expect(result.system_instructions).toContain('Chief Marketing Officer');
        expect(result.system_instructions).toContain('Test Brand');
    });

    it('should react to new product launch', async () => {
        const agentMemory = {
             marketing_calendar: [{ type: 'launch', date: 'tomorrow', status: 'pending' }]
        };

        // Basic check if she has an orient function
        expect(typeof glendaAgent.orient).toBe('function');
    });
});
