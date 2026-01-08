
import { Evaluator, VerificationContext, VerificationResult } from '../types';
import { executeWithTools, ClaudeTool } from '@/ai/claude';

export class TechnicalEvaluator implements Evaluator {
    name = 'Technical Review (Linus)';

    async audit(content: any, context: VerificationContext): Promise<VerificationResult> {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        // Simple Regex for secrets (Safety net)
        // Checks for sk_live, sk_test, basic API key patterns
        const secretPatterns = /sk_(live|test)_[0-9a-zA-Z]{10,}|AIza[0-9A-Za-z-_]{35}/;
        const hasSecrets = secretPatterns.test(contentStr);

        if (hasSecrets) {
             return {
                passed: false,
                score: 0,
                issues: ['CRITICAL: Hardcoded secret detected in output.'],
                suggestion: 'Remove all API keys and use environment variables.'
            };
        }

        const prompt = `
        You are Linus, the CTO. Audit this technical output (Code or Architecture Plan).
        
        CRITERIA:
        1. **Security**: No insecure patterns (eval, raw SQL injection risk).
        2. **Syntax**: If code is provided, is it valid?
        3. **Completeness**: Does it solve the user's technical ask?
        4. **Clean Code**: SOLID principles.

        CONTENT TO AUDIT:
        """
        ${contentStr}
        """

        Use 'submit_audit' to pass or fail this content.
        `;

        const auditTool: ClaudeTool = {
            name: 'submit_audit',
            description: 'Submit the technical audit verdict.',
            input_schema: {
                type: 'object',
                properties: {
                    passed: { type: 'boolean' },
                    score: { type: 'number' },
                    issues: { type: 'array', items: { type: 'string' } },
                    suggestion: { type: 'string' }
                },
                required: ['passed', 'score', 'issues']
            }
        };

        let result: VerificationResult = {
            passed: false,
            score: 0,
            issues: ['Audit failed to execute.'],
            suggestion: 'System Error during audit.'
        };

        try {
            await executeWithTools(
                prompt,
                [auditTool],
                async (toolName, input) => {
                    if (toolName === 'submit_audit') {
                        result = input as unknown as VerificationResult;
                        return "Audit submitted.";
                    }
                    return "Unknown tool.";
                },
                { model: 'claude-3-opus-20240229', role: 'CTO Auditor' }
            );
        } catch (error) {
            console.error('[TechnicalEvaluator] Error:', error);
            result.issues.push(String(error));
        }

        return result;
    }
}
