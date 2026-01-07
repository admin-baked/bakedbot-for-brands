
import { roachAgent } from '@/server/agents/roach';
import { AgentMemory } from '@/server/agents/schemas';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: {
        attachBlocksForRole: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock('@/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockResolvedValue({
        finalResult: 'Research Complete',
        steps: ['Searched archival', 'Found tag']
    })
}));

describe('Roach Agent', () => {
    const mockBrandMemory = { brandId: 'test-brand' };
    const mockAgentMemory: AgentMemory = {
        agent_id: 'roach',
        role: 'researcher',
        system_instructions: '',
        short_term_memory: [],
        archived_memories: []
    };

    it('should initialize and set system instructions', async () => {
        const initializedMemory = await roachAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });
        expect(initializedMemory.system_instructions).toContain('You are ROACH');
        expect(initializedMemory.system_instructions).toContain('Compliance Knowledge Base');
    });

    it('should orient to a user request', async () => {
        const stimulus = 'Research Prop 64';
        const result = await roachAgent.orient(mockBrandMemory as any, mockAgentMemory, stimulus);
        expect(result).toBe('user_request');
    });

    it('should act on user request', async () => {
        const tools = {}; // Mock tools object
        const result = await roachAgent.act(mockBrandMemory as any, { ...mockAgentMemory, system_instructions: 'Instructions' }, 'user_request', tools as any, 'Research Query');
        
        expect(result.logEntry.action).toBe('research_complete');
        expect(result.logEntry.result).toBe('Research Complete');
    });
});
