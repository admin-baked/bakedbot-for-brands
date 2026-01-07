
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as path from 'path';

// Mock genkit
jest.mock('genkit', () => ({
  __esModule: true,
  tool: jest.fn((config, fn) => fn)
}));

// Mock exec
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: (cmd: string, options: any, cb: any) => mockExec(cmd, options, cb)
}));

import { bashExecute, bashListDir, bashReadFile } from '../bash-tool';

describe('Bash Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default successful response
        mockExec.mockImplementation((cmd, opts, cb) => {
            cb(null, { stdout: 'success', stderr: '' });
        });
    });

    describe('bashExecute', () => {
        it('should block dangerous commands', async () => {
            const forbidden = ['rm -rf /', 'sudo apt-get', 'wget http://malware'];
            
            for (const cmd of forbidden) {
                const result = await bashExecute({ command: cmd });
                expect(result).toEqual(expect.objectContaining({
                    success: false,
                    error: expect.stringContaining('Security:')
                }));
            }
        });

        it('should execute safe commands', async () => {
             mockExec.mockImplementation((cmd, opts, cb) => {
                cb(null, { stdout: 'Hello World', stderr: '' });
            });

            const result = await bashExecute({ command: 'echo "Hello World"' });
            
            expect(result).toEqual(expect.objectContaining({
                success: true,
                stdout: 'Hello World'
            }));
            expect(mockExec).toHaveBeenCalled();
        });

        it('should truncate excessively long output', async () => {
            const longOutput = 'a'.repeat(60000);
            mockExec.mockImplementation((cmd, opts, cb) => {
                cb(null, { stdout: longOutput, stderr: '' });
            });

            const result = await bashExecute({ command: 'cat huge_file' });
            
            expect(result.stdout).toContain('...[OUTPUT TRUNCATED]');
            expect(result.stdout.length).toBeLessThan(60000);
        });

        it('should enforce project root for cwd', async () => {
            const result = await bashExecute({ 
                command: 'ls', 
                cwd: '/etc' // Outside project
            });

            expect(result).toEqual(expect.objectContaining({
                success: false,
                error: expect.stringContaining('Working directory must be within project root')
            }));
        });
    });

    describe('bashListDir', () => {
        it('should use correct command for OS', async () => {
            // Mock platform
            Object.defineProperty(process, 'platform', { value: 'win32' });
            
            await bashListDir({ path: '.' });
            
            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('Get-ChildItem'),
                expect.anything(),
                expect.anything()
            );
        });
    });
});
