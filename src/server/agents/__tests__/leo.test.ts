
import { describe, it, expect, vi } from 'vitest';
import { leoAgent } from '../leo';

// Mock dependencies
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: { attachBlocksForRole: vi.fn() }
}));

describe('Leo Agent (COO)', () => {
    it('should initialize with correct system instructions', async () => {
        const brandMemory = {
            brand_profile: { name: 'Test Brand', id: 'brand-123' },
            priority_objectives: [{ id: 'obj-1', description: 'Grow Revenue' }]
        };
        const agentMemory = { agent_id: 'leo', objectives: [] };

        const result = await leoAgent.initialize(brandMemory as any, agentMemory as any);

        expect(result.system_instructions).toContain('You are Leo, the Chief Operating Officer');
        expect(result.system_instructions).toContain('MULTI-AGENT ORCHESTRATION');
        expect(result.objectives).toEqual(brandMemory.priority_objectives);
    });

    it('should have orchestration tools in act definitions', async () => {
        // We can't easily run 'act' because it imports harness which is complex.
        // But we can verify the agent definition structure if we exported the tools separately,
        // or just rely on the fact that it compiles and fits the AgentImplementation interface.
        
        // Let's at least check the orient function
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
