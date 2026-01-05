
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// 1. Mock the specific service files ENTIRELY to avoid their imports executing
jest.mock('@/server/services/letta/client', () => ({
    lettaClient: {
        listBlocks: jest.fn().mockResolvedValue([]),
        createBlock: jest.fn().mockResolvedValue({ id: 'block_123', label: 'test' }),
        updateBlock: jest.fn().mockResolvedValue({ id: 'block_123' }),
        attachBlockToAgent: jest.fn().mockResolvedValue({}),
        detachBlockFromAgent: jest.fn().mockResolvedValue({}),
        listAgents: jest.fn().mockResolvedValue([]),
        createAgent: jest.fn().mockResolvedValue({ id: 'agent_123', name: 'mrs_parker_cust_1' }),
        sendMessage: jest.fn().mockResolvedValue({
            messages: [{ role: 'assistant', content: '{"subject": "Hi", "body": "Welcome", "tone_notes": "Warm"}' }]
        })
    }
}));

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {
        search: jest.fn().mockResolvedValue([{ content: 'context', score: 0.9 }]),
        indexDocument: jest.fn()
    }
}));

jest.mock('@/server/services/letta/dynamic-memory', () => {
    // We want to test DynamicMemoryService logic IF possible, but if it's simpler, 
    // we can test that it calls lettaClient correctly.
    // Let's import the real class but rely on mocked lettaClient.
    const actual = jest.requireActual('@/server/services/letta/dynamic-memory') as any;
    return actual;
});

jest.mock('@/firebase/server-client', () => ({
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ 
                        firstName: 'Test', 
                        email: 'test@example.com', 
                        tenantId: 't1' 
                    })
                })
            }))
        }))
    }
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: {
        checkContent: jest.fn().mockResolvedValue({ status: 'pass' })
    }
}));

jest.mock('@/lib/email/mailjet', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({})
}));

// Now import the classes to test
import { DynamicMemoryService } from '@/server/services/letta/dynamic-memory';
import { CustomerAgentManager } from '@/server/services/letta/customer-agent-manager';
import { lettaClient } from '@/server/services/letta/client';

describe('Mrs Parker Upgrade Verification', () => {

    describe('DynamicMemoryService', () => {
        it('should attach blocks via lettaClient', async () => {
            const service = new DynamicMemoryService();
            await service.attachBlock('agent_1', 'project', { id: 'p1', label: 'test', content: 'data' });
            
            expect(lettaClient.createBlock).toHaveBeenCalled();
            expect(lettaClient.attachBlockToAgent).toHaveBeenCalledWith('agent_1', 'block_123');
        });
    });

    describe('CustomerAgentManager', () => {
        it('should create customer agent and send email', async () => {
            const manager = new CustomerAgentManager();
            const result = await manager.sendPersonalizedEmail('cust_1', 'welcome', {});
            
            expect(lettaClient.createAgent).toHaveBeenCalledWith(
                'mrs_parker_cust_1',
                expect.stringContaining('Mrs. Parker'),
                expect.any(Array)
            );
            expect(lettaClient.sendMessage).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });

});
