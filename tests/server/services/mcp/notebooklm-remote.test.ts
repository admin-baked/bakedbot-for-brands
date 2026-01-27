import { RemoteMcpClient, getMcpClient } from '@/server/services/mcp/client';
import { sidecar } from '@/server/services/python-sidecar';

// Mock sidecar
jest.mock('@/server/services/python-sidecar', () => ({
    sidecar: {
        execute: jest.fn(),
        callMcp: jest.fn(),
        listMcpTools: jest.fn()
    }
}));

describe('NotebookLLM Remote Client', () => {
    let client: RemoteMcpClient;

    beforeEach(() => {
        jest.clearAllMocks();
        client = getMcpClient('notebooklm') as RemoteMcpClient;
    });

    it('should be correctly registered in the registry', () => {
        expect(client).toBeDefined();
        expect(client).toBeInstanceOf(RemoteMcpClient);
    });

    it('should connect only if sidecar and notebook are healthy', async () => {
        (sidecar.execute as jest.Mock).mockResolvedValueOnce({ status: 'success' });

        await expect(client.connect()).resolves.not.toThrow();
        expect(sidecar.execute).toHaveBeenCalledWith('test');
    });

    it('should throw error if sidecar test fails', async () => {
        (sidecar.execute as jest.Mock).mockResolvedValueOnce({
            status: 'error',
            message: 'Connection timed out'
        });

        await expect(client.connect()).rejects.toThrow('Remote Sidecar Unreachable: Connection timed out');
    });

    it('should list specialized NotebookLLM tools', async () => {
        const mockNotebookTools = [
            { name: 'chat_with_notebook', description: 'desc', inputSchema: {} },
            { name: 'healthcheck', description: 'desc', inputSchema: {} }
        ];
        (sidecar.listMcpTools as jest.Mock).mockResolvedValueOnce(mockNotebookTools);

        const tools = await client.listTools();

        expect(tools).toEqual(mockNotebookTools);
        expect(sidecar.listMcpTools).toHaveBeenCalled();
    });

    it('should use fallback tools if listing from sidecar fails', async () => {
        (sidecar.listMcpTools as jest.Mock).mockRejectedValueOnce(new Error('Sidecar down'));

        const tools = await client.listTools();

        expect(tools.length).toBe(7);
        expect(tools.find(t => t.name === 'chat_with_notebook')).toBeDefined();
        expect(tools.find(t => t.name === 'navigate_to_notebook')).toBeDefined();
    });

    it('should successfully execute NotebookLLM tool calls', async () => {
        const mockResponse = { text: 'Hello from NotebookLLM' };
        (sidecar.callMcp as jest.Mock).mockResolvedValueOnce(mockResponse);

        const result = await client.callTool('chat_with_notebook', { message: 'hi' });

        expect(result).toEqual(mockResponse);
        expect(sidecar.callMcp).toHaveBeenCalledWith('chat_with_notebook', { message: 'hi' });
    });

    it('should propagation errors from tool calls', async () => {
        (sidecar.callMcp as jest.Mock).mockRejectedValueOnce(new Error('Notebook not found'));

        await expect(client.callTool('chat_with_notebook', { message: 'hi' }))
            .rejects.toThrow('Notebook not found');
    });
});
