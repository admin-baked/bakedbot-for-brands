import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { routeToolCall } from '@/server/agents/tools/router';
import { ToolRequest } from '@/types/agent-toolkit';

// Mock fs/promises
const mockFs = {
    stat: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
};

jest.mock('fs/promises', () => mockFs);

// Mock path for consistent resolve/path behavior
jest.mock('path', () => ({
    resolve: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
    join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
}));

describe('Dev Tools - readCodebase', () => {
    const rootDir = process.cwd();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const actor = { userId: 'admin-1', role: 'owner' as any };

    it('should read a file successfully', async () => {
        const request: ToolRequest = {
            toolName: 'dev.readCodebase',
            actor,
            inputs: { path: 'src/app/page.tsx' },
            tenantId: 'tenant-1'
        };

        (mockFs.stat as any).mockResolvedValue({ isDirectory: () => false });
        (mockFs.readFile as any).mockResolvedValue('export default function Page() {}');

        const response = await routeToolCall(request);

        expect(response.status).toBe('success');
        expect(response.data.content).toContain('export default function Page()');
        expect(mockFs.readFile).toHaveBeenCalled();
    });

    it('should list a directory successfully', async () => {
        const request: ToolRequest = {
            toolName: 'dev.readCodebase',
            actor,
            inputs: { path: 'src/app' },
            tenantId: 'tenant-1'
        };

        (mockFs.stat as any).mockResolvedValue({ isDirectory: () => true });
        (mockFs.readdir as any).mockResolvedValue(['page.tsx', 'layout.tsx']);

        const response = await routeToolCall(request);

        expect(response.status).toBe('success');
        expect(response.data.type).toBe('directory');
        expect(response.data.files).toContain('page.tsx');
    });

    it('should block path traversal outside of root', async () => {
        const request: ToolRequest = {
            toolName: 'dev.readCodebase',
            actor,
            inputs: { path: '../../etc/passwd' },
            tenantId: 'tenant-1'
        };

        const response = await routeToolCall(request);

        expect(response.status).toBe('failed');
        expect(response.error).toContain('Access denied');
        expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should handle missing files gracefully', async () => {
        const request: ToolRequest = {
            toolName: 'dev.readCodebase',
            actor,
            inputs: { path: 'non-existent.txt' },
            tenantId: 'tenant-1'
        };

        (mockFs.stat as any).mockRejectedValue(new Error('File not found'));

        const response = await routeToolCall(request);

        expect(response.status).toBe('failed');
        expect(response.error).toContain('File not found');
    });
});
