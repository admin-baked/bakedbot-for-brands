import { Evaluator, VerificationContext, VerificationResult } from './types';

export class Gauntlet {
    constructor(private evaluators: Evaluator[]) {}

    /**
     * Runs the content through all configured evaluators.
     * All evaluators must pass for the Gauntlet to pass.
     */
    async run(content: any, context: VerificationContext): Promise<VerificationResult> {
        const allIssues: string[] = [];
        let lowestScore = 100;
        let suggestion = '';

        console.log(`[Gauntlet] Starting verification for agent ${context.agentId}...`);

        for (const evaluator of this.evaluators) {
            try {
                console.log(`[Gauntlet] Running evaluator: ${evaluator.name}`);
                const result = await evaluator.audit(content, context);
                
                if (!result.passed) {
                    allIssues.push(...result.issues);
                    if (result.suggestion) {
                        suggestion += `${evaluator.name}: ${result.suggestion}\n`;
                    }
                }
                
                if (result.score < lowestScore) {
                    lowestScore = result.score;
                }
            } catch (error) {
                console.error(`[Gauntlet] Evaluator ${evaluator.name} crashed:`, error);
                allIssues.push(`Evaluator ${evaluator.name} failed to execute.`);
            }
        }

        const passed = allIssues.length === 0;

        if (passed) {
            console.log(`[Gauntlet] Verification PASSED.`);
            return {
                passed: true,
                score: lowestScore,
                issues: [],
                suggestion: 'Approved.'
            };
        }

        console.log(`[Gauntlet] Verification FAILED with ${allIssues.length} issues.`);
        return {
            passed: false,
            score: lowestScore,
            issues: allIssues,
            suggestion: suggestion.trim() || `Fix the following issues: ${allIssues.join('; ')}`
        };
    }
}
