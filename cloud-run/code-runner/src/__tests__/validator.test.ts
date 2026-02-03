/**
 * Code Execution Validator - Unit Tests
 */

import { describe, expect, it } from '@jest/globals';
import { validateExecutionRequest } from '../validator';

describe('Code Execution Validator', () => {
    describe('validateExecutionRequest', () => {
        it('should accept valid request', () => {
            const request = {
                code: 'function add(a: number, b: number) { return a + b; }',
                tests: 'test("adds", () => { expect(add(1, 2)).toBe(3); });',
                language: 'typescript',
                timeout: 10000,
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        it('should reject empty code', () => {
            const request = {
                code: '',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('Code cannot be empty'));
        });

        it('should reject empty tests', () => {
            const request = {
                code: 'const x = 1;',
                tests: '',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('Tests cannot be empty'));
        });

        it('should reject code exceeding 50KB', () => {
            const request = {
                code: 'x'.repeat(60000), // > 50KB
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('exceeds maximum size'));
        });

        it('should reject invalid language', () => {
            const request = {
                code: 'const x = 1;',
                tests: 'test("test", () => {});',
                language: 'python', // Not supported
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
        });

        it('should reject timeout too short', () => {
            const request = {
                code: 'const x = 1;',
                tests: 'test("test", () => {});',
                language: 'typescript',
                timeout: 500, // < 1000ms minimum
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('at least 1 second'));
        });

        it('should reject timeout too long', () => {
            const request = {
                code: 'const x = 1;',
                tests: 'test("test", () => {});',
                language: 'typescript',
                timeout: 40000, // > 30000ms maximum
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('cannot exceed 30 seconds'));
        });

        it('should detect eval usage', () => {
            const request = {
                code: 'eval("console.log(1)")',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('disallowed pattern'));
        });

        it('should detect Function constructor', () => {
            const request = {
                code: 'new Function("return 1")()',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('disallowed pattern'));
        });

        it('should detect child_process require', () => {
            const request = {
                code: 'const cp = require("child_process")',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('disallowed pattern'));
        });

        it('should detect fs require', () => {
            const request = {
                code: 'const fs = require("fs")',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('disallowed pattern'));
        });

        it('should detect process.exit', () => {
            const request = {
                code: 'process.exit(1)',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('disallowed pattern'));
        });

        it('should reject excessive imports', () => {
            const imports = Array.from({ length: 25 }, (_, i) => `import { x${i} } from 'mod${i}';`).join('\n');

            const request = {
                code: imports,
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(expect.stringContaining('too many imports'));
        });

        it('should allow safe code', () => {
            const request = {
                code: `
export function calculateTotal(items: number[]): number {
    return items.reduce((sum, item) => sum + item, 0);
}
                `,
                tests: `
import { calculateTotal } from './code';
test('calculates total', () => {
    expect(calculateTotal([1, 2, 3])).toBe(6);
});
                `,
                language: 'typescript',
                timeout: 5000,
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(true);
            expect(result.data?.code).toBeDefined();
            expect(result.data?.tests).toBeDefined();
            expect(result.data?.timeout).toBe(5000);
        });

        it('should use default timeout if not provided', () => {
            const request = {
                code: 'const x = 1;',
                tests: 'test("test", () => {});',
                language: 'typescript',
            };

            const result = validateExecutionRequest(request);

            expect(result.success).toBe(true);
            expect(result.data?.timeout).toBe(10000); // Default
        });
    });
});
