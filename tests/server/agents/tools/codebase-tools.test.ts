import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { readCodebase } from '@/server/tools/codebase';

// Mock FS
const mockStat = jest.fn();
const mockReadFile = jest.fn();
const mockReaddir = jest.fn();

jest.mock('fs/promises', () => ({
    __esModule: true,
    default: {
        stat: mockStat,
        readFile: mockReadFile,
        readdir: mockReaddir,
    },
    stat: mockStat,
    readFile: mockReadFile,
    readdir: mockReaddir,
}));

jest.mock('path', () => {
    const mockPath = {
        resolve: (...args: string[]) => {
            // Normalize and join
            const combined = args.join('/').replace(/\\/g, '/');
            const parts = combined.split('/');
            const res: string[] = [];
            for (const p of parts) {
                if (p === '..') res.pop();
                else if (p !== '.' && p !== '') res.push(p);
            }
            return '/' + res.join('/');
        },
        join: (...args: string[]) => args.join('/').replace(/\\/g, '/'),
    };
    return {
        __esModule: true,
        default: mockPath,
        ...mockPath,
    };
});

describe('Codebase Tool', () => {
    // Spy on process.cwd
    const mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/app');

    beforeEach(() => {
        jest.clearAllMocks();
        mockCwd.mockReturnValue('/app');
    });

    afterAll(() => {
        mockCwd.mockRestore();
    });

    it('should read a file successfully', async () => {
        mockStat.mockResolvedValue({ isDirectory: () => false });
        mockReadFile.mockResolvedValue('export default function Page() {}');

        const result = await readCodebase({ path: 'src/app/page.tsx' });

        expect(result.status).toBe('success');
        expect(result.data.content).toContain('export default function Page()');
        expect(mockReadFile).toHaveBeenCalled();
    });

    it('should list a directory successfully', async () => {
        mockStat.mockResolvedValue({ isDirectory: () => true });
        mockReaddir.mockResolvedValue(['page.tsx', 'layout.tsx']);

        const result = await readCodebase({ path: 'src/app' });

        expect(result.status).toBe('success');
        expect(result.data.type).toBe('directory');
        expect(result.data.files).toContain('page.tsx');
    });

    it('should block path traversal outside of root', async () => {
        const promise = readCodebase({ path: '../../etc/passwd' });

        // Logic throws "Access denied"
        await expect(promise).rejects.toThrow('Access denied');
        expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should handle missing files gracefully', async () => {
         mockStat.mockRejectedValue(new Error('File not found'));

         // Logic throws because it catches and rethrows "Failed to read codebase: File not found"
         // Wait, the router caught it and returned { status: 'failed' }. 
         // The extracted function throws.
         // So we assert rejection.

        await expect(readCodebase({ path: 'non-existent.txt' }))
            .rejects.toThrow('Failed to read codebase');
    });
});
