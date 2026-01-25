import { PythonSidecar } from '@/server/services/python-sidecar';

// Mock global fetch
global.fetch = jest.fn();

describe('PythonSidecar', () => {
    let sidecar: PythonSidecar;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PYTHON_SIDECAR_URL = 'http://test-sidecar.local';
        sidecar = new PythonSidecar();
    });

    it('should initialize with baseUrl from env', () => {
        expect(sidecar).toBeDefined();
    });

    it('should call fetch with correct params in execute()', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'success', data: 'test-data' })
        });

        const result = await sidecar.execute('analyze', { query: 'foo' });

        expect(global.fetch).toHaveBeenCalledWith('http://test-sidecar.local/execute', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ action: 'analyze', data: { query: 'foo' } })
        }));
        expect(result.status).toBe('success');
    });

    it('should route mcp_call correctly', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, result: 'mcp-result' })
        });

        const result = await sidecar.execute('mcp_call', { tool_name: 'test-tool', arguments: {} });

        expect(global.fetch).toHaveBeenCalledWith('http://test-sidecar.local/mcp/call', expect.any(Object));
        expect(result).toBe('mcp-result');
    });

    it('should handle fetch errors gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

        const result = await sidecar.execute('test');

        expect(result.status).toBe('error');
        expect(result.message).toContain('Sidecar Connection Failed');
    });
});
