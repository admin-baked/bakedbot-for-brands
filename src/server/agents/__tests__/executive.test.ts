
import { executiveAgent } from '../executive';
import { BrandDomainMemory, ExecutiveMemory } from '../schemas';

// Mock the dependencies
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
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

    describe('initialize', () => {
        it('should sync objectives from brand memory if empty', async () => {
            const memory = await executiveAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });
            expect(memory.objectives).toHaveLength(1);
            expect(memory.objectives[0].id).toBe('mrr_goal');
        });
    });

    describe('orient', () => {
        it('should return chat_response if stimulus is a string', async () => {
            const targetId = await executiveAgent.orient(mockBrandMemory as any, mockAgentMemory, 'What is our MRR?');
            expect(targetId).toBe('chat_response');
        });

        it('should return mrr_check if MRR objective is active and no stimulus', async () => {
            const memory = { ...mockAgentMemory, objectives: [{ id: 'mrr_goal', description: 'Reach $100k MRR', status: 'active' }] };
            const targetId = await executiveAgent.orient(mockBrandMemory as any, memory as any, undefined);
            expect(targetId).toBe('mrr_check');
        });
    });

    describe('act', () => {
        const mockTools = {
            generateSnapshot: jest.fn(),
            delegateTask: jest.fn(),
            broadcast: jest.fn()
        };

        it('should return an orchestration response for chat_response', async () => {
            const result = await executiveAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'chat_response', 
                mockTools, 
                'Analyze Q1 revenue'
            );
            
            expect(result.logEntry.action).toBe('chat_response');
            expect(result.logEntry.next_step).toBe('execute_orchestration');
        });

        it('should return a monitoring response for mrr_check', async () => {
            const result = await executiveAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'mrr_check', 
                mockTools
            );
            
            expect(result.logEntry.action).toBe('monitor_growth');
            expect(result.logEntry.metadata.objective).toBe('100k_mrr');
        });
    });
});
