import { McpClient, RemoteMcpClient, getMcpClient } from '@/server/services/mcp/client';
import { EventEmitter } from 'events';
import { sidecar } from '@/server/services/python-sidecar';

// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn(() => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdin = { write: jest.fn() };
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = jest.fn();
        return mockProcess;
    })
}));

// Mock sidecar
jest.mock('@/server/services/python-sidecar', () => ({
    sidecar: {
        execute: jest.fn(),
        callMcp: jest.fn(),
        listMcpTools: jest.fn()
    }
}));

describe('Mcp Integration', () => {
    describe('McpClient (Local)', () => {
        it('should connect to a subprocess', async () => {
            const client = new McpClient({ id: 'test', command: 'echo', args: [] });
            await expect(client.connect()).resolves.not.toThrow();
            await client.disconnect();
        });
    });

    describe('RemoteMcpClient', () => {
        it('should list tools using sidecar when available', async () => {
            const client = new RemoteMcpClient({ id: 'remote-test' });
            const mockTools = [
                { name: 'test_tool', description: 'desc', inputSchema: {} }
            ];
            (sidecar.listMcpTools as jest.Mock).mockResolvedValueOnce(mockTools);

            const tools = await client.listTools();
            expect(tools).toEqual(mockTools);
            expect(sidecar.listMcpTools).toHaveBeenCalled();
        });

        it('should return fallback tools when sidecar listing fails', async () => {
            const client = new RemoteMcpClient({ id: 'remote-test' });
            (sidecar.listMcpTools as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

            const tools = await client.listTools();
            expect(tools.length).toBeGreaterThan(0);
            expect(tools[0].name).toBe('healthcheck');
        });

        it('should delegate callTool to sidecar', async () => {
            const client = new RemoteMcpClient({ id: 'remote-test' });
            (sidecar.callMcp as jest.Mock).mockResolvedValueOnce('tool-result');

            const result = await client.callTool('some-tool', { arg1: 1 });

            expect(sidecar.callMcp).toHaveBeenCalledWith('some-tool', { arg1: 1 });
            expect(result).toBe('tool-result');
        });

        it('should verify connection via sidecar health check', async () => {
            const client = new RemoteMcpClient({ id: 'remote-test' });
            (sidecar.execute as jest.Mock).mockResolvedValueOnce({ status: 'success' });

            await expect(client.connect()).resolves.not.toThrow();
            expect(sidecar.execute).toHaveBeenCalledWith('test');
        });
    });

    describe('Registry', () => {
        it('should have notebooklm pre-registered as RemoteMcpClient', () => {
            const client = getMcpClient('notebooklm');
            expect(client).toBeInstanceOf(RemoteMcpClient);
        });
    });
});
