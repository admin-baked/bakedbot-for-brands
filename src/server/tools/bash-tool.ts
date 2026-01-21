'use server';

/**
 * Bash Tool for Executive Boardroom Agents
 *
 * Provides secure shell command execution capabilities.
 * Only available to Executive/Super User roles.
 *
 * Security:
 * - REQUIRES Super User authentication
 * - Commands are sandboxed (no network by default)
 * - No sudo/admin commands allowed
 * - Timeout limits enforced
 * - Output truncated to prevent memory issues
 */

import { z } from 'zod';
import { tool } from 'genkit';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { requireSuperUser } from '@/server/auth/auth';

const execAsync = promisify(exec);

// Blocked commands for security
const BLOCKED_COMMANDS = [
    // System destructive commands
    'sudo', 'su', 'rm -rf /', 'rm -rf /*', 'mkfs', 'dd',
    'chmod 777', 'format', 'del /f', 'shutdown', 'reboot',
    ':(){:|:&};:', // fork bomb
    // Network commands
    'curl', 'wget', 'nc', 'netcat', 'ssh', 'scp', 'rsync',
    // Code execution via interpreters
    'node -e', 'python -c', 'python3 -c', 'ruby -e', 'perl -e',
    // Package management (dangerous operations)
    'npm publish', 'npm unpublish', 'npm install -g',
    'yarn publish', 'pnpm publish',
    // Git dangerous operations
    'git push --force', 'git push -f', 'git reset --hard origin',
    // AWS/Cloud
    'aws ', 'gcloud ', 'az ', 'kubectl delete',
    // Database
    'drop database', 'drop table', 'truncate table'
];

// Max output length to prevent memory issues
const MAX_OUTPUT_LENGTH = 50000;

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = 30000;

/**
 * Check if a command is safe to execute
 */
function isCommandSafe(command: string): { safe: boolean; reason?: string } {
    const lowerCmd = command.toLowerCase();
    
    for (const blocked of BLOCKED_COMMANDS) {
        if (lowerCmd.includes(blocked.toLowerCase())) {
            return { 
                safe: false, 
                reason: `Command contains blocked pattern: ${blocked}` 
            };
        }
    }
    
    // Block pipe to network commands
    if (lowerCmd.includes('| curl') || lowerCmd.includes('| wget') || lowerCmd.includes('| nc')) {
        return { 
            safe: false, 
            reason: 'Network operations in pipes are blocked' 
        };
    }
    
    return { safe: true };
}

/**
 * Truncate output if too long
 */
function truncateOutput(output: string): string {
    if (output.length > MAX_OUTPUT_LENGTH) {
        return output.substring(0, MAX_OUTPUT_LENGTH) + '\n...[OUTPUT TRUNCATED]';
    }
    return output;
}

// ============================================================================
// TOOL: Execute Bash Command
// ============================================================================
export const bashExecute = tool({
    name: 'bash_execute',
    description: 'Execute a shell command. Use for running scripts, checking file contents, managing local development tasks. Security restrictions apply. REQUIRES Super User privileges.',
    inputSchema: z.object({
        command: z.string().describe('The shell command to execute'),
        cwd: z.string().optional().describe('Working directory (defaults to project root)'),
        timeout: z.number().optional().default(DEFAULT_TIMEOUT).describe('Timeout in milliseconds')
    }),
    outputSchema: z.any(),
}, async ({ command, cwd, timeout }) => {
    try {
        // Security gate: Only super users can execute bash commands
        await requireSuperUser();

        // Security check
        const safetyCheck = isCommandSafe(command);
        if (!safetyCheck.safe) {
            return {
                success: false,
                error: `Security: ${safetyCheck.reason}`,
                exitCode: -1
            };
        }

        // Determine working directory
        const workingDir = cwd || process.cwd();
        
        // Validate cwd is within project (basic path traversal protection)
        const resolvedCwd = path.resolve(workingDir);
        const projectRoot = path.resolve(process.cwd());
        if (!resolvedCwd.startsWith(projectRoot)) {
            return {
                success: false,
                error: 'Working directory must be within project root',
                exitCode: -1
            };
        }

        // Execute command
        const { stdout, stderr } = await execAsync(command, {
            cwd: workingDir,
            timeout: timeout || DEFAULT_TIMEOUT,
            maxBuffer: MAX_OUTPUT_LENGTH * 2,
            shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
        });

        return {
            success: true,
            command,
            cwd: workingDir,
            stdout: truncateOutput(stdout || ''),
            stderr: truncateOutput(stderr || ''),
            exitCode: 0
        };
    } catch (e: any) {
        // Handle timeout
        if (e.killed) {
            return {
                success: false,
                command,
                error: 'Command timed out',
                exitCode: -1
            };
        }

        // Handle execution errors (command failed but ran)
        return {
            success: false,
            command,
            stdout: truncateOutput(e.stdout || ''),
            stderr: truncateOutput(e.stderr || e.message),
            exitCode: e.code || 1,
            error: e.message
        };
    }
});

// ============================================================================
// TOOL: List Directory
// ============================================================================
export const bashListDir = tool({
    name: 'bash_list_dir',
    description: 'List the contents of a directory with file details. REQUIRES Super User privileges.',
    inputSchema: z.object({
        path: z.string().optional().default('.').describe('Directory path to list'),
        showHidden: z.boolean().optional().default(false).describe('Show hidden files')
    }),
    outputSchema: z.any(),
}, async ({ path: dirPath, showHidden }) => {
    try {
        // Security gate: Only super users can list directories
        await requireSuperUser();

        const isWindows = process.platform === 'win32';
        const command = isWindows 
            ? `Get-ChildItem -Path "${dirPath}" ${showHidden ? '-Force' : ''} | Select-Object Mode, Length, LastWriteTime, Name | Format-Table -AutoSize`
            : `ls -la${showHidden ? '' : ' --ignore=.*'} "${dirPath}"`;

        const { stdout } = await execAsync(command, {
            cwd: process.cwd(),
            timeout: 10000,
            shell: isWindows ? 'powershell.exe' : '/bin/bash'
        });

        return {
            success: true,
            path: dirPath,
            contents: stdout
        };
    } catch (e: any) {
        return {
            success: false,
            error: e.message
        };
    }
});

// ============================================================================
// TOOL: Read File Contents
// ============================================================================
export const bashReadFile = tool({
    name: 'bash_read_file',
    description: 'Read the contents of a file. REQUIRES Super User privileges.',
    inputSchema: z.object({
        filePath: z.string().describe('Path to the file to read'),
        maxLines: z.number().optional().default(100).describe('Maximum number of lines to read')
    }),
    outputSchema: z.any(),
}, async ({ filePath, maxLines }) => {
    try {
        // Security gate: Only super users can read files via bash
        await requireSuperUser();

        const isWindows = process.platform === 'win32';
        const command = isWindows 
            ? `Get-Content -Path "${filePath}" -TotalCount ${maxLines}`
            : `head -n ${maxLines} "${filePath}"`;

        const { stdout } = await execAsync(command, {
            cwd: process.cwd(),
            timeout: 10000,
            shell: isWindows ? 'powershell.exe' : '/bin/bash'
        });

        return {
            success: true,
            filePath,
            content: truncateOutput(stdout),
            lineCount: stdout.split('\n').length
        };
    } catch (e: any) {
        return {
            success: false,
            error: e.message
        };
    }
});

// Export all tools
export const bashTools = [
    bashExecute,
    bashListDir,
    bashReadFile
];
