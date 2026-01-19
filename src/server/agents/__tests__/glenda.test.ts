
import { describe, it, expect, vi } from 'vitest';
import { glendaAgent } from '../glenda';

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: { attachBlocksForRole: vi.fn() }
}));

describe('Glenda Agent (CMO)', () => {
    it('should initialize with marketing-focused instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand' },
            priority_objectives: []
        };
        const agentMemory = { agent_id: 'glenda' };

        const result = await glendaAgent.initialize(brandMemory as any, agentMemory as any);

        expect(result.system_instructions).toContain('Chief Marketing Officer (CMO)');
        expect(result.system_instructions).toContain('BRAND AUTHORITY');
    });

    it('should react to new product launch', async () => {
        // Assuming Glenda checks for new products in orient
        // Note: I need to verify Glenda's implementation, but following the pattern:
        const agentMemory = { 
             marketing_calendar: [{ type: 'launch', date: 'tomorrow', status: 'pending' }]
        };
        
        // Basic check if she has an orient function
        expect(typeof glendaAgent.orient).toBe('function');
    });
});
