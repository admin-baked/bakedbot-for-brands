
/**
 * Bash Tool Tests
 *
 * Tests the bash tool security checks, output truncation, and directory validation.
 * Uses callback-style exec mock since bash-tool.ts promisifies child_process.exec.
 */

// Mock genkit tool() to return the handler directly
jest.mock('genkit', () => ({
  __esModule: true,
  tool: jest.fn((_config: any, fn: any) => fn),
}));

// Mock auth
jest.mock('@/server/auth/auth', () => ({
  requireSuperUser: jest.fn().mockResolvedValue(undefined),
  requireUser: jest.fn().mockResolvedValue({ uid: 'test', role: 'super_user' }),
}));

// Mock child_process.exec as a callback function that resolves through promisify
// promisify(exec) converts (cmd, opts, cb) → (cmd, opts) → Promise
let execResult = { stdout: 'success', stderr: '' };
let execError: any = null;
jest.mock('child_process', () => ({
  exec: (cmd: string, opts: any, cb?: Function) => {
    // promisify calls exec with (cmd, opts) and wraps in Promise
    // Provide callback-style and promise-style compatibility
    if (typeof cb === 'function') {
      cb(execError, execResult);
    } else if (typeof opts === 'function') {
      opts(execError, execResult);
    }
    return undefined;
  }
}));

import { bashExecute, bashListDir } from '../bash-tool';
import { requireSuperUser } from '@/server/auth/auth';

describe('Bash Tools', () => {
    beforeEach(() => {
        (requireSuperUser as jest.Mock).mockReset();
        (requireSuperUser as jest.Mock).mockResolvedValue(undefined);
        execResult = { stdout: 'success', stderr: '' };
        execError = null;
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
            execResult = { stdout: 'Hello World', stderr: '' };

            const result = await bashExecute({ command: 'echo "Hello World"' });

            expect(result).toEqual(expect.objectContaining({
                success: true,
                stdout: 'Hello World'
            }));
        });

        it('should truncate excessively long output', async () => {
            execResult = { stdout: 'a'.repeat(60000), stderr: '' };

            const result = await bashExecute({ command: 'cat huge_file' });

            expect(result.stdout).toContain('...[OUTPUT TRUNCATED]');
            expect(result.stdout.length).toBeLessThan(60000);
        });

        it('should enforce project root for cwd', async () => {
            const result = await bashExecute({
                command: 'ls',
                cwd: '/etc'
            });

            expect(result).toEqual(expect.objectContaining({
                success: false,
                error: expect.stringContaining('Working directory must be within project root')
            }));
        });
    });

    describe('bashListDir', () => {
        it('should call exec for directory listing', async () => {
            execResult = { stdout: 'file1\nfile2\nfile3', stderr: '' };

            const result = await bashListDir({ path: '.', showHidden: false });

            expect(result).toEqual(expect.objectContaining({
                success: true,
            }));
            expect(result.contents).toContain('file1');
        });
    });
});
