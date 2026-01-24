
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

const mockGetPendingMessages = jest.fn();
jest.mock('@/server/intuition/agent-bus', () => ({
    getPendingMessages: mockGetPendingMessages
}));

const mockLogAgentEvent = jest.fn();
jest.mock('@/server/intuition/agent-events', () => ({
    logAgentEvent: mockLogAgentEvent
}));

// We rely on the Jest config mapper for @/ai/genkit

import { runAgent } from '@/server/agents/harness';

describe('Agent Harness - AgentBus Integration', () => {
    const brandId = 'test-brand';
    const agentName = 'test_agent';

    const mockBrandMemory = {
        brand_profile: { name: 'Test Brand' },
        priority_objectives: []
    };

    const mockAgentMemory = {
        agent_id: agentName,
        objectives: []
    };

    const mockAdapter = {
        loadBrandMemory: jest.fn().mockResolvedValue(mockBrandMemory),
        loadAgentMemory: jest.fn().mockResolvedValue(mockAgentMemory),
        saveAgentMemory: jest.fn().mockResolvedValue(undefined),
        appendLog: jest.fn().mockResolvedValue(undefined)
    };

    const mockImplementation = {
        agentName,
        initialize: jest.fn().mockImplementation(async (bm: any, am: any) => am),
        orient: jest.fn().mockResolvedValue('test_target'),
        act: jest.fn().mockResolvedValue({
            updatedMemory: { ...mockAgentMemory, acted: true },
            logEntry: { action: 'test_action', result: 'test_result' }
        })
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should inject pending messages into agentMemory', async () => {
        const mockMessages = [
            { id: '1', topic: 'test_topic', payload: { data: 'hello' }, reactions: {} }
        ];
        mockGetPendingMessages.mockResolvedValue(mockMessages);

        await runAgent(brandId, mockAdapter as any, mockImplementation as any, {});

        // Verify messages were fetched
        expect(mockGetPendingMessages).toHaveBeenCalledWith(brandId, agentName);

        // Verify messages were injected before act
        const actCall = (mockImplementation.act as jest.Mock).mock.calls[0];
        const injectedMemory = actCall[1] as any;
        expect(injectedMemory.pending_messages).toEqual(mockMessages);
    });

    it('should handle AgentBus errors gracefully', async () => {
        mockGetPendingMessages.mockRejectedValue(new Error('Bus failure'));

        const result = await runAgent(brandId, mockAdapter as any, mockImplementation as any, {});

        // Should still complete the cycle
        expect(result).toBeDefined();
        expect(mockImplementation.act).toHaveBeenCalled();
    });
});
