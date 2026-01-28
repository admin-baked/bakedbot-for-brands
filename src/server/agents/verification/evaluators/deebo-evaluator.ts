import { Evaluator, VerificationContext, VerificationResult } from '../types';
import { executeWithTools, ClaudeTool, CLAUDE_TOOL_MODEL } from '@/ai/claude';

export class DeeboEvaluator implements Evaluator {
    name = 'Deebo (Compliance)';

    async audit(content: any, context: VerificationContext): Promise<VerificationResult> {
        // 1. Prepare the Prompt
        // If content is an object, stringify it.
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        const prompt = `
        You are Deebo, the BakedBot Compliance Officer. 
        Your job is to audited the following Marketing Copy for California Cannabis Regulations (DCC).
        
        AGGRESSIVELY reject any copy that:
        1. Appeals to minors (cartoons, candy terms).
        2. Makes unverified health claims.
        3. Misses the license number placeholder.
        4. Misses "21+" or "Reply STOP".
        
        COPY TO AUDIT:
        """
        ${contentStr}
        """

        You MUST use the 'submit_audit' tool to return your verdict.
        `;

        // 2. Define the Tool
        const auditTool: ClaudeTool = {
            name: 'submit_audit',
            description: 'Submit the final audit verdict.',
            input_schema: {
                type: 'object',
                properties: {
                    passed: { type: 'boolean', description: 'True if compliant, False if verified violation.' },
                    score: { type: 'number', description: 'Compliance score (0-100).' },
                    issues: { type: 'array', items: { type: 'string' }, description: 'List of specific code violations.' },
                    suggestion: { type: 'string', description: 'How to fix the issues.' }
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

        // 3. Execute with Claude
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
                {
                    model: CLAUDE_TOOL_MODEL, // Use current Claude Opus model for compliance
                    role: 'Compliance Auditor'
                }
            );
        } catch (error) {
            console.error('[DeeboEvaluator] Error:', error);
            result.issues.push(String(error));
        }

        return result;
    }
}
