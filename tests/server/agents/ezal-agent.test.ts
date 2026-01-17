
import { ezalAgent } from '../../../src/server/agents/ezal';
import { BrandDomainMemory, EzalMemory } from '../../../src/server/agents/schemas';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('@/server/agents/harness', () => ({
    runMultiStepTask: jest.fn().mockImplementation(async () => {
        return {
            finalResult: 'Mocked Ezal Plan',
            steps: []
        };
    })
}));

describe('Ezal Agent Implementation', () => {
    const mockBrandMemory: Partial<BrandDomainMemory> = {
        brand_profile: {
            name: 'BakedBot AI',
            tone_of_voice: 'Professional'
        },
        priority_objectives: []
    };

    const mockAgentMemory: EzalMemory = {
        competitor_watchlist: [],
        last_scan: new Date().toISOString()
    };

    const mockTools = {
        discoverMenu: jest.fn(),
        comparePricing: jest.fn(),
        scanCompetitors: jest.fn(),
        alertCraig: jest.fn(),
        getCompetitiveIntel: jest.fn(),
        searchWeb: jest.fn(),
        lettaMessageAgent: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should set system instructions', async () => {
            const memory = await ezalAgent.initialize(mockBrandMemory as any, { ...mockAgentMemory });
            expect(memory.system_instructions).toContain('Market Scout');
        });
    });

    describe('orient', () => {
        it('should return respond_to_user if stimulus is present', async () => {
            const targetId = await ezalAgent.orient(mockBrandMemory as any, mockAgentMemory, 'Scan the market');
            expect(targetId).toBe('respond_to_user');
        });

        it('should match stale competitors for discovery', async () => {
            const staleDate = new Date();
            staleDate.setDate(staleDate.getDate() - 10); // 10 days ago (limit is 7)
            
            const memory = {
                ...mockAgentMemory,
                competitor_watchlist: [
                    { id: 'comp_1', name: 'Stale Shop', last_discovery: staleDate.toISOString() }
                ]
            };
            
            const targetId = await ezalAgent.orient(mockBrandMemory as any, memory as any, undefined);
            expect(targetId).toBe('discovery:comp_1');
        });
        
         it('should return null if no stale competitors', async () => {
            const freshDate = new Date();
             
             const memory = {
                ...mockAgentMemory,
                competitor_watchlist: [
                    { id: 'comp_1', name: 'Fresh Shop', last_discovery: freshDate.toISOString() }
                ]
            };
            
            const targetId = await ezalAgent.orient(mockBrandMemory as any, memory as any, undefined);
            expect(targetId).toBeNull();
        });
    });

    describe('act', () => {
        it('should handle respond_to_user using runMultiStepTask', async () => {
            const result = await ezalAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'respond_to_user', 
                mockTools, 
                'Find competitive threats'
            );
            
            expect(result.logEntry.action).toBe('multi_step_execution');
            expect(result.logEntry.result).toBe('Mocked Ezal Plan');
        });

        it('should handle discovery target (autonomous)', async () => {
            const result = await ezalAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'discovery:comp_123', 
                mockTools
            );
            
            expect(result.logEntry.action).toBe('background_discovery');
            expect(result.logEntry.metadata.competitor_id).toBe('comp_123');
        });

         it('should throw error for unknown target', async () => {
             await expect(ezalAgent.act(
                mockBrandMemory as any, 
                mockAgentMemory, 
                'unknown_target', 
                mockTools
            )).rejects.toThrow('Unknown target action');
        });
    });
});
