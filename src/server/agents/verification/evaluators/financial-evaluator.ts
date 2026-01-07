
import { Evaluator, VerificationContext, VerificationResult } from '../types';
import { executeWithTools, ClaudeTool } from '@/ai/claude';

export class FinancialEvaluator implements Evaluator {
    name = 'Financial Audit (Mike)';

    async audit(content: any, context: VerificationContext): Promise<VerificationResult> {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        const prompt = `
        You are Mike, the CFO. You are auditing a financial plan or report produced by the team.
        
        CRITERIA:
        1. **Math Integrity**: Do the numbers add up? (e.g. Revenue - Cost = Profit).
        2. **Sanity Check**: Are margins realistic? (No >90% net margins without explanation).
        3. **Formatting**: Currency must be formatted ($X,XXX.XX).
        4. **Negative Logic**: No negative revenue forecasts unless explicitly stated as loss.

        CONTENT TO AUDIT:
        """
        ${contentStr}
        """

        Use 'submit_audit' to pass or fail this content.
        `;

        const auditTool: ClaudeTool = {
            name: 'submit_audit',
            description: 'Submit the financial audit verdict.',
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
                { model: 'claude-3-opus-20240229', role: 'CFO Auditor' }
            );
        } catch (error) {
            console.error('[FinancialEvaluator] Error:', error);
            result.issues.push(String(error));
        }

        return result;
    }
}
