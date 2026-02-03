/**
 * Code execution logic using Jest test runner
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ExecutionRequest, ExecutionResult, TestResults } from './types';

const execFileAsync = promisify(execFile);

/**
 * Execute code with tests
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    let tmpDir: string | null = null;

    try {
        // Create temporary directory
        tmpDir = await fs.mkdtemp(path.join('/tmp/executions', 'code-'));

        // Write code and test files
        await writeCodeFiles(tmpDir, request);

        // Run Jest tests
        const jestResult = await runJestTests(tmpDir, request.timeout || 10000);

        const executionTime = Date.now() - startTime;

        // Parse test results
        const testResults = parseJestOutput(jestResult);

        return {
            success: testResults.numFailedTests === 0,
            output: jestResult.stdout,
            testResults,
            executionTime,
        };
    } catch (error) {
        const executionTime = Date.now() - startTime;

        return {
            success: false,
            output: error instanceof Error ? error.message : 'Unknown error',
            executionTime,
            error: error instanceof Error ? error.message : 'Execution failed',
        };
    } finally {
        // Cleanup temporary directory
        if (tmpDir) {
            await cleanupTempDir(tmpDir);
        }
    }
}

/**
 * Write code and test files to disk
 */
async function writeCodeFiles(tmpDir: string, request: ExecutionRequest): Promise<void> {
    const ext = request.language === 'typescript' ? 'ts' : 'js';

    // Write user code
    const codePath = path.join(tmpDir, `code.${ext}`);
    await fs.writeFile(codePath, request.code, 'utf-8');

    // Write tests
    const testPath = path.join(tmpDir, `code.test.${ext}`);
    const testContent = `
import { describe, test, expect } from '@jest/globals';

${request.tests}
`;
    await fs.writeFile(testPath, testContent, 'utf-8');

    // Write Jest config
    const jestConfig = {
        preset: 'ts-jest',
        testEnvironment: 'node',
        testMatch: ['**/*.test.ts', '**/*.test.js'],
        moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
        transform: {
            '^.+\\.tsx?$': 'ts-jest',
        },
        testTimeout: request.timeout || 10000,
        verbose: true,
        collectCoverage: false,
    };

    await fs.writeFile(
        path.join(tmpDir, 'jest.config.json'),
        JSON.stringify(jestConfig, null, 2),
        'utf-8'
    );

    // Write TypeScript config if needed
    if (request.language === 'typescript') {
        const tsConfig = {
            compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                lib: ['ES2020'],
                esModuleInterop: true,
                skipLibCheck: true,
                strict: true,
            },
        };

        await fs.writeFile(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify(tsConfig, null, 2),
            'utf-8'
        );
    }

    // Write package.json (minimal, for type resolution)
    const packageJson = {
        name: 'code-execution',
        version: '1.0.0',
        type: 'commonjs',
    };

    await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
        'utf-8'
    );
}

/**
 * Run Jest tests in temporary directory
 */
async function runJestTests(tmpDir: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
    const jestPath = path.join(process.cwd(), 'node_modules', '.bin', 'jest');

    try {
        const { stdout, stderr } = await execFileAsync(
            jestPath,
            ['--config=jest.config.json', '--json', '--testLocationInResults'],
            {
                cwd: tmpDir,
                timeout: timeout + 5000, // Extra buffer for Jest startup
                maxBuffer: 1024 * 1024, // 1MB output buffer
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    NO_COLOR: '1', // Disable ANSI colors
                },
            }
        );

        return { stdout, stderr };
    } catch (error: any) {
        // Jest exits with non-zero code when tests fail (expected behavior)
        if (error.stdout) {
            return { stdout: error.stdout, stderr: error.stderr || '' };
        }

        throw new Error(`Jest execution failed: ${error.message}`);
    }
}

/**
 * Parse Jest JSON output
 */
function parseJestOutput(jestResult: { stdout: string; stderr: string }): TestResults {
    try {
        // Try to parse JSON output
        const jsonMatch = jestResult.stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // Fallback: parse text output
            return parseTextOutput(jestResult.stdout);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const testResults = parsed.testResults?.[0]?.assertionResults || [];

        return {
            numPassedTests: parsed.numPassedTests || 0,
            numFailedTests: parsed.numFailedTests || 0,
            numTotalTests: parsed.numTotalTests || 0,
            testResults: testResults.map((result: any) => ({
                title: result.title || result.fullName || 'Unknown test',
                status: result.status === 'passed' ? 'passed' : 'failed',
                duration: result.duration || 0,
                failureMessage: result.failureMessages?.[0],
            })),
        };
    } catch (error) {
        console.error('Failed to parse Jest output:', error);

        // Return empty results on parse failure
        return {
            numPassedTests: 0,
            numFailedTests: 0,
            numTotalTests: 0,
            testResults: [],
        };
    }
}

/**
 * Parse Jest text output (fallback)
 */
function parseTextOutput(output: string): TestResults {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    const numPassedTests = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const numFailedTests = failedMatch ? parseInt(failedMatch[1], 10) : 0;

    return {
        numPassedTests,
        numFailedTests,
        numTotalTests: numPassedTests + numFailedTests,
        testResults: [],
    };
}

/**
 * Cleanup temporary directory
 */
async function cleanupTempDir(tmpDir: string): Promise<void> {
    try {
        await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
        console.error('Failed to cleanup temp dir:', tmpDir, error);
        // Don't throw - cleanup failure shouldn't fail the request
    }
}
