
import { describe, it, expect, vi } from 'vitest';
import { jackAgent } from '../jack';

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: { attachBlocksForRole: vi.fn() }
}));

describe('Jack Agent (CRO)', () => {
    it('should initialize with revenue-focused instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand' },
            priority_objectives: []
        };
        const agentMemory = { agent_id: 'jack' };

        const result = await jackAgent.initialize(brandMemory as any, agentMemory as any);

        expect(result.system_instructions).toContain('Chief Revenue Officer (CRO)');
        expect(result.system_instructions).toContain('REVENUE GROWTH');
    });

    it('should identify stalled deals stimulus', async () => {
        const agentMemory = { 
            deals: [{ stage: 'negotiation', daysSinceUpdate: 10 }] 
        };
        
        const stimulus = await jackAgent.orient({} as any, agentMemory as any, undefined);
        expect(stimulus).toBe('follow_up_deal');
    });
});
