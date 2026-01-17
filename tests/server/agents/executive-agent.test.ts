
import { executiveAgent } from '../../../src/server/agents/executive';
import { BrandDomainMemory, ExecutiveMemory } from '../../../src/server/agents/schemas';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('@/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockResolvedValue({
        finalResult: 'Mocked Plan Result',
        steps: [{ tool: 'generateSnapshot', args: {}, result: 'Snapshot' }]
    })
}));

jest.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: {
        attachBlocksForRole: jest.fn().mockResolvedValue(true)
    }
}));


describe('Executive Agent Implementation', () => {
    const mockBrandMemory: Partial<BrandDomainMemory> = {
        brand_profile: {
            name: 'BakedBot AI',
            tone_of_voice: 'Professional'
        },
        priority_objectives: [
            { id: 'mrr_goal', description: 'Reach $100k MRR by 2027', status: 'active' }
        ]
    };

    const mockAgentMemory: ExecutiveMemory = {
        objectives: [],
        snapshot_history: [],
        last_active: new Date().toISOString()
    };

    const mockTools = {
        generateSnapshot: jest.fn(),
        delegateTask: jest.fn(),
        broadcast: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should sync objectives from brand memory if empty', async () => {
            const memory = await executiveAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });
            expect(memory.objectives).toHaveLength(1);
            expect(memory.objectives[0].id).toBe('mrr_goal');
        });

        it('should set system instructions', async () => {
            const memory = await executiveAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });
            expect(memory.system_instructions).toContain('Executive Boardroom Member');
        });
    });

    describe('orient', () => {
        it('should return user_request if stimulus is a string', async () => {
            const targetId = await executiveAgent.orient(mockBrandMemory as any, mockAgentMemory, 'What is our MRR?');
            expect(targetId).toBe('user_request');
        });

        it('should return mrr_check if MRR objective is active and no stimulus', async () => {
            const memory = { ...mockAgentMemory, objectives: [{ id: 'mrr_goal', description: 'Reach $100k MRR', status: 'active' }] };
            const targetId = await executiveAgent.orient(mockBrandMemory as any, memory as any, undefined);
            expect(targetId).toBe('mrr_check');
        });
        
         it('should return null if no active objectives need attention', async () => {
            const memory = { ...mockAgentMemory, objectives: [] };
            const targetId = await executiveAgent.orient(mockBrandMemory as any, memory as any, undefined);
            expect(targetId).toBeNull();
        });
    });

    describe('act', () => {
        it('should handle user_request using runMultiStepTask', async () => {
            const result = await executiveAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'user_request', 
                mockTools, 
                'Analyze Q1 revenue'
            );
            
            expect(result.logEntry.action).toBe('multi_step_execution');
            expect(result.logEntry.result).toBe('Mocked Plan Result');
            expect(result.logEntry.metadata.steps).toBe(1);
        });

        it('should handle mrr_check target', async () => {
            const result = await executiveAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'mrr_check', 
                mockTools
            );
            
            expect(result.logEntry.action).toBe('monitor_growth');
            expect(result.logEntry.metadata.objective).toBe('100k_mrr');
        });

         it('should fall back to idle for unknown target', async () => {
            const result = await executiveAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'unknown_target', 
                mockTools
            );
            
            expect(result.logEntry.action).toBe('idle');
        });
    });
});
