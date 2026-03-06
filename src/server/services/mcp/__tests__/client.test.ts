import { EventEmitter } from 'events';
import { McpClient, RemoteMcpClient, registerMcpServer, getMcpClient } from '../client';
import { spawn } from 'child_process';
import { sidecar } from '@/server/services/python-sidecar';

// Mock dependencies
jest.mock('child_process');
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock('@/server/services/python-sidecar', () => ({
    sidecar: {
        execute: jest.fn(),
        listMcpTools: jest.fn(),
        callMcp: jest.fn()
    }
}));

describe('MCP Client Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('McpClient (Local via stdio)', () => {
        let mockProcess: any;

        beforeEach(() => {
            mockProcess = new EventEmitter();
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.stdin = { write: jest.fn() };
            mockProcess.kill = jest.fn();

            (spawn as jest.Mock).mockReturnValue(mockProcess);
        });

        it('connects to local process and registers', async () => {
            const client = registerMcpServer({
                id: 'local-test',
                command: 'node',
                args: ['test.js']
            });

            await client.connect();

            expect(spawn).toHaveBeenCalledWith('node', ['test.js'], expect.any(Object));
            expect(getMcpClient('local-test')).toBe(client);
        });

        it('handles stdio JSONRPC response', async () => {
            const client = new McpClient({ id: 'local-test', command: 'node', args: [] });
            await client.connect();

            const listToolsPromise = client.listTools();

            // Simulate the server responding on stdout
            mockProcess.stdout.emit('data', Buffer.from(JSON.stringify({
                jsonrpc: '2.0',
                id: 0,
                result: { tools: [{ name: 'test_tool', description: 'desc', inputSchema: {} }] }
            }) + '\n'));

            const tools = await listToolsPromise;
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe('test_tool');
        });
    });

    describe('RemoteMcpClient (via Python Sidecar)', () => {
        it('connects successfully if sidecar health check passes', async () => {
            (sidecar.execute as jest.Mock).mockResolvedValue({ status: 'success' });

            const client = new RemoteMcpClient({ id: 'remote-test' });
            await client.connect();

            expect(client.isConnected()).toBe(true);
            expect(sidecar.execute).toHaveBeenCalledWith('test');
        });

        it('throws error if sidecar health check fails', async () => {
            (sidecar.execute as jest.Mock).mockResolvedValue({ status: 'error', message: 'Offline' });

            const client = new RemoteMcpClient({ id: 'remote-test' });

            await expect(client.connect()).rejects.toThrow('Remote Sidecar Unreachable: Offline');
            expect(client.isConnected()).toBe(false);
        });

        it('lists tools from sidecar', async () => {
            const mockTools = [{ name: 'remote_tool', description: 'desc', inputSchema: {} }];
            (sidecar.listMcpTools as jest.Mock).mockResolvedValue(mockTools);

            const client = new RemoteMcpClient({ id: 'remote-test' });
            const tools = await client.listTools();

            expect(tools).toEqual(mockTools);
        });

        it('falls back to static tools if listMcpTools throws', async () => {
            (sidecar.listMcpTools as jest.Mock).mockRejectedValue(new Error('API Down'));

            const client = new RemoteMcpClient({ id: 'remote-test' });
            const tools = await client.listTools();

            // Ensures fallback array is returned
            expect(tools.length).toBeGreaterThan(0);
            expect(tools.some(t => t.name === 'healthcheck')).toBe(true);
        });

        it('calls tool via sidecar', async () => {
            (sidecar.callMcp as jest.Mock).mockResolvedValue('tool_result');

            const client = new RemoteMcpClient({ id: 'remote-test' });
            const result = await client.callTool('my_tool', { arg: 1 });

            expect(sidecar.callMcp).toHaveBeenCalledWith('my_tool', { arg: 1 });
            expect(result).toBe('tool_result');
        });
    });
});
