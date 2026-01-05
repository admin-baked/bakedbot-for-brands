import { LettaClient } from '@/server/services/letta/client';

// Mock fetch globally
global.fetch = jest.fn();

describe('LettaClient', () => {
    let client: LettaClient;
    const mockApiKey = 'sk-test-key';
    const mockBaseUrl = 'https://api.letta.mock';

    beforeEach(() => {
        client = new LettaClient(mockApiKey, mockBaseUrl);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should list agents', async () => {
        const mockAgents = [{ id: 'agent-1', name: 'Test Agent' }];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockAgents,
        });

        const agents = await client.listAgents();
        expect(agents).toEqual(mockAgents);
        expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/agents`, expect.objectContaining({
            headers: expect.objectContaining({
                'Authorization': `Bearer ${mockApiKey}`
            })
        }));
    });

    it('should create an agent', async () => {
        const newAgent = { id: 'agent-2', name: 'New Agent' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => newAgent,
        });

        const agent = await client.createAgent('New Agent', 'System instructions');
        expect(agent).toEqual(newAgent);
        expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/agents`, expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Agent')
        }));
    });

    it('should send a message', async () => {
        const mockResponse = { messages: [{ role: 'assistant', content: 'Hello' }] };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const response = await client.sendMessage('agent-1', 'Hi there');
        expect(response).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/agents/agent-1/messages`, expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Hi there')
        }));
    });

    it('should handle API errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => 'Unauthorized',
        });

        await expect(client.listAgents()).rejects.toThrow('Letta API Error (401): Unauthorized');
    });
});
