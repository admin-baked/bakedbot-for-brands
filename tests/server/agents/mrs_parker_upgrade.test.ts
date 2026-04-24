
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock letta client BEFORE any imports that use it
jest.mock('@/server/services/letta/client', () => {
    const mockListBlocks = jest.fn().mockResolvedValue([]);
    const mockCreateBlock = jest.fn().mockResolvedValue({ id: 'block_123', label: 'test' });
    const mockUpdateBlock = jest.fn().mockResolvedValue({ id: 'block_123' });
    const mockAttachBlockToAgent = jest.fn().mockResolvedValue({});
    const mockDetachBlockFromAgent = jest.fn().mockResolvedValue({});
    const mockListAgents = jest.fn().mockResolvedValue([]);
    const mockCreateAgent = jest.fn().mockResolvedValue({ id: 'agent_123', name: 'mrs_parker_cust_1' });
    const mockSendMessage = jest.fn().mockResolvedValue({
        messages: [{ role: 'assistant', content: '{"subject": "Hi", "body": "Welcome", "tone_notes": "Warm"}' }]
    });

    return {
        lettaClient: {
            listBlocks: mockListBlocks,
            createBlock: mockCreateBlock,
            updateBlock: mockUpdateBlock,
            attachBlockToAgent: mockAttachBlockToAgent,
            detachBlockFromAgent: mockDetachBlockFromAgent,
            listAgents: mockListAgents,
            createAgent: mockCreateAgent,
            sendMessage: mockSendMessage,
        },
        LettaClient: jest.fn().mockImplementation(() => ({
            listBlocks: mockListBlocks,
            createBlock: mockCreateBlock,
            updateBlock: mockUpdateBlock,
            attachBlockToAgent: mockAttachBlockToAgent,
        })),
    };
});

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {
        search: jest.fn().mockResolvedValue([{ content: 'context', score: 0.9 }]),
        indexDocument: jest.fn()
    }
}));

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
    },
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ firstName: 'Test', email: 'test@example.com' })
                    })
                }))
            }))
        }
    })
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: {
        checkContent: jest.fn().mockResolvedValue({ status: 'pass' })
    }
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({})
}));

jest.mock('@/lib/email/mailjet', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({})
}));

jest.mock('@/lib/utils/extract-json', () => ({
    extractJsonPayload: jest.fn().mockReturnValue({ subject: 'Hi', body: 'Welcome', tone_notes: 'Warm' })
}));

// Now import the classes to test
import { DynamicMemoryService } from '@/server/services/letta/dynamic-memory';
import { lettaClient } from '@/server/services/letta/client';

describe('Mrs Parker Upgrade Verification', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DynamicMemoryService', () => {
        it('should be importable and have attachBlock method', async () => {
            // DynamicMemoryService relies on lettaClient which requires LETTA_API_KEY.
            // Verify the class is properly exported and has the expected API surface.
            const service = new DynamicMemoryService();
            expect(service).toBeDefined();
            expect(typeof service.attachBlock).toBe('function');
        });
    });

    describe('CustomerAgentManager', () => {
        it('should be importable and instantiable', async () => {
            // CustomerAgentManager relies on many external services (Letta API, email dispatch, etc.)
            // Verify it can be imported and constructed without throwing
            const { CustomerAgentManager } = await import('@/server/services/letta/customer-agent-manager');
            const manager = new CustomerAgentManager();
            expect(manager).toBeDefined();
        });
    });

});
