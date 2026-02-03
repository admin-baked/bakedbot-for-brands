/**
 * Input validation for code execution requests
 */

import { z } from 'zod';
import type { ValidationResult, ExecutionRequest } from './types';

const ExecutionRequestSchema = z.object({
    code: z.string()
        .min(1, 'Code cannot be empty')
        .max(50000, 'Code exceeds maximum size of 50KB'),
    tests: z.string()
        .min(1, 'Tests cannot be empty')
        .max(50000, 'Tests exceed maximum size of 50KB'),
    language: z.enum(['typescript', 'javascript']),
    timeout: z.number()
        .min(1000, 'Timeout must be at least 1 second')
        .max(30000, 'Timeout cannot exceed 30 seconds')
        .optional()
        .default(10000),
});

/**
 * Validate execution request
 */
export function validateExecutionRequest(input: unknown): ValidationResult {
    try {
        const data = ExecutionRequestSchema.parse(input);

        // Additional security checks
        const securityErrors = performSecurityChecks(data);
        if (securityErrors.length > 0) {
            return {
                success: false,
                errors: securityErrors,
            };
        }

        return {
            success: true,
            data: data as ExecutionRequest,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
            };
        }

        return {
            success: false,
            errors: ['Invalid request format'],
        };
    }
}

/**
 * Perform security checks on code
 */
function performSecurityChecks(data: ExecutionRequest): string[] {
    const errors: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /require\s*\(\s*['"]child_process['"]/,
        /require\s*\(\s*['"]fs['"]/,
        /require\s*\(\s*['"]net['"]/,
        /require\s*\(\s*['"]http['"]/,
        /process\.exit/,
        /process\.kill/,
        /__dirname/,
        /__filename/,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(data.code)) {
            errors.push(`Code contains disallowed pattern: ${pattern.source}`);
        }
        if (pattern.test(data.tests)) {
            errors.push(`Tests contain disallowed pattern: ${pattern.source}`);
        }
    }

    // Check for excessive imports
    const importCount = (data.code.match(/import\s+/g) || []).length;
    if (importCount > 20) {
        errors.push('Code contains too many imports (max 20)');
    }

    return errors;
}
