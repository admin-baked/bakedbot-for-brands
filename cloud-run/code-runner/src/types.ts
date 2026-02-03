/**
 * Type definitions for code execution service
 */

export interface ExecutionRequest {
    code: string;
    tests: string;
    language: 'typescript' | 'javascript';
    timeout?: number;
}

export interface ExecutionResult {
    success: boolean;
    output: string;
    testResults?: TestResults;
    executionTime: number;
    error?: string;
}

export interface TestResults {
    numPassedTests: number;
    numFailedTests: number;
    numTotalTests: number;
    testResults: TestResult[];
}

export interface TestResult {
    title: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    failureMessage?: string;
}

export interface ValidationResult {
    success: boolean;
    data?: ExecutionRequest;
    errors?: string[];
}
