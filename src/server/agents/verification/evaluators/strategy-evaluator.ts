
import { Evaluator, VerificationContext, VerificationResult } from '../types';
import { executeWithTools, ClaudeTool } from '@/ai/claude';

export class StrategyEvaluator implements Evaluator {
    name = 'Strategy Review (Leo)';

    async audit(content: any, context: VerificationContext): Promise<VerificationResult> {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        const prompt = `
        You are Leo, the COO/Strategy Lead. Audit this strategic plan or operational update.
        
        CRITERIA:
        1. **Alignment**: Does this align with the $100k MRR goal? (If applicable).
        2. **Completeness**: Are there clear next steps or Action Items?
        3. **Logic**: Does the strategy make sense? Are there gaps?
        4. **Resources**: Is it feasible with current resources?

        CONTENT TO AUDIT:
        """
        ${contentStr}
        """

        Use 'submit_audit' to pass or fail this content.
        `;

        const auditTool: ClaudeTool = {
            name: 'submit_audit',
            description: 'Submit the strategic audit verdict.',
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
                { model: 'claude-3-opus-20240229', role: 'Strategy Auditor' }
            );
        } catch (error) {
            console.error('[StrategyEvaluator] Error:', error);
            result.issues.push(String(error));
        }

        return result;
    }
}
