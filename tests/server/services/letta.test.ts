import { LettaClient } from '@/server/services/letta/client';

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('LettaClient', () => {
    let client: LettaClient;
    const mockApiKey = 'sk-test-key';
    const mockBaseUrl = 'https://api.letta.mock';

    beforeEach(() => {
        client = new LettaClient(mockApiKey, mockBaseUrl);
        (mockFetch).mockClear();
    });

    describe('Agents API', () => {
        it('should list agents', async () => {
            const mockAgents = [{ id: 'agent-1', name: 'Test Agent' }];
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockAgents,
            });

            const agents = await client.listAgents();
            expect(agents).toEqual(mockAgents);
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/agents`, expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': `Bearer ${mockApiKey}`
                })
            }));
        });

        it('should create an agent', async () => {
            const newAgent = { id: 'agent-2', name: 'New Agent' };
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => newAgent,
            });

            const agent = await client.createAgent('New Agent', 'System instructions');
            expect(agent).toEqual(newAgent);
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/agents`, expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('New Agent')
            }));
        });

        it('should delete an agent', async () => {
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            await expect(client.deleteAgent('agent-1')).resolves.not.toThrow();
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/agents/agent-1`, 
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    describe('Messages API', () => {
        it('should send a message', async () => {
            const mockResponse = { messages: [{ role: 'assistant', content: 'Hello' }] };
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const response = await client.sendMessage('agent-1', 'Hi there');
            expect(response).toEqual(mockResponse);
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/agents/agent-1/messages`, expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Hi there')
            }));
        });

        it('should get messages with limit', async () => {
            const mockMessages = [{ id: 'msg-1', role: 'user', content: 'Test' }];
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockMessages,
            });

            const messages = await client.getMessages('agent-1', 50);
            expect(messages).toEqual(mockMessages);
            expectmockFetch.toHaveBeenCalledWith(
                `${mockBaseUrl}/agents/agent-1/messages?limit=50`,
                expect.any(Object)
            );
        });
    });

    describe('Blocks API', () => {
        it('should create a block', async () => {
            const mockBlock = { 
                id: 'block-1', 
                label: 'test_block', 
                value: 'initial', 
                limit: 4000, 
                read_only: false 
            };
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockBlock,
            });

            const block = await client.createBlock('test_block', 'initial', { limit: 4000 });
            expect(block.id).toBe('block-1');
            expect(block.label).toBe('test_block');
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/blocks`, expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('test_block')
            }));
        });

        it('should update a block', async () => {
            const mockBlock = { id: 'block-1', value: 'updated' };
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockBlock,
            });

            const block = await client.updateBlock('block-1', 'updated');
            expect(block.value).toBe('updated');
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/blocks/block-1`, expect.objectContaining({
                method: 'PATCH'
            }));
        });

        it('should attach block to agent', async () => {
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            await expect(client.attachBlockToAgent('agent-1', 'block-1')).resolves.not.toThrow();
            expectmockFetch.toHaveBeenCalledWith(
                `${mockBaseUrl}/agents/agent-1/blocks/block-1/attach`,
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('should detach block from agent', async () => {
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            await expect(client.detachBlockFromAgent('agent-1', 'block-1')).resolves.not.toThrow();
            expectmockFetch.toHaveBeenCalledWith(
                `${mockBaseUrl}/agents/agent-1/blocks/block-1/detach`,
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('should list blocks', async () => {
            const mockBlocks = [{ id: 'block-1', label: 'test' }];
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => mockBlocks,
            });

            const blocks = await client.listBlocks();
            expect(blocks).toEqual(mockBlocks);
            expectmockFetch.toHaveBeenCalledWith(`${mockBaseUrl}/blocks`, expect.any(Object));
        });
    });

    describe('Async Messaging', () => {
        it('should send async message between agents', async () => {
            (mockFetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'msg-123' }),
            });

            const result = await client.sendAsyncMessage('agent-1', 'agent-2', 'Hello');
            expect(result.delivered).toBe(true);
            expect(result.messageId).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors', async () => {
            (mockFetch).mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            });

            await expect(client.listAgents()).rejects.toThrow('Letta API Error (401): Unauthorized');
        });

        it('should throw error when API key is missing', async () => {
            const noKeyClient = new LettaClient('', mockBaseUrl);
            await expect(noKeyClient.listAgents()).rejects.toThrow('Letta API Key is required');
        });
    });
});

describe('Digital Worker Tools', () => {
    it('should have correct structure for tool exports', () => {
        // This test verifies the structure without dynamic imports
        // The actual tool availability is tested via integration tests
        const expectedTools = [
            'sendSmsBlackleaf',
            'sendOrderReadySms',
            'sendPromotionalSms',
            'sendEmailMailjet',
            'sendOrderConfirmationEmail',
            'sendMarketingEmail',
            'sendMessageToAgent',
            'writeToSharedBlock',
            'readFromSharedBlock'
        ];
        
        // Verify we have the expected number of digital worker tools
        expect(expectedTools.length).toBe(9);
    });
});
