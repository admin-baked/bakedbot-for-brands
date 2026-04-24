
import { routeToolCall } from '@/server/agents/tools/router';
import { TOOL_REGISTRY } from '@/server/agents/tools/registry';

// Mock dependencies
jest.mock('@/server/services/letta/client', () => ({
    lettaClient: {
        searchPassages: jest.fn().mockResolvedValue(['Memory 1', 'Memory 2']),
        updateCoreMemory: jest.fn().mockResolvedValue({ success: true }),
        listAgents: jest.fn().mockResolvedValue([{ id: 'mock-agent-id', name: 'BakedBot Research Memory' }]),
        sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
        sendAsyncMessage: jest.fn().mockResolvedValue({ delivered: true })
    }
}));

describe('Letta Tool Integration', () => {

    it('should have Letta tools registered', () => {
        expect(TOOL_REGISTRY['letta.searchMemory']).toBeDefined();
        expect(TOOL_REGISTRY['letta.updateCoreMemory']).toBeDefined();
        expect(TOOL_REGISTRY['letta.saveFact']).toBeDefined();
    });

    it('should route letta.updateCoreMemory correctly', async () => {
        const response = await routeToolCall({
            toolName: 'letta.updateCoreMemory',
            inputs: { section: 'persona', content: 'New persona content' },
            actor: { userId: 'test-user', role: 'super_admin' },
            tenantId: 'test-tenant'
        });

        expect(response.status).toBe('success');
        expect(response.data).toEqual(
            expect.objectContaining({ message: expect.stringContaining('Core Memory (persona) updated') })
        );
    });

});
