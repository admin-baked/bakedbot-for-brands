import { Evaluator, VerificationContext, VerificationResult } from './types';
import { DecisionLogService, EvaluatorResult } from '@/server/services/context-os';
import { logger } from '@/lib/logger';

export class Gauntlet {
    constructor(private evaluators: Evaluator[]) {}

    /**
     * Runs the content through all configured evaluators.
     * All evaluators must pass for the Gauntlet to pass.
     * Results are logged to Context OS for decision lineage.
     */
    async run(content: any, context: VerificationContext): Promise<VerificationResult> {
        const allIssues: string[] = [];
        let lowestScore = 100;
        let suggestion = '';
        const evaluatorResults: EvaluatorResult[] = [];

        logger.info(`[Gauntlet] Starting verification for agent ${context.agentId}...`);

        for (const evaluator of this.evaluators) {
            try {
                logger.info(`[Gauntlet] Running evaluator: ${evaluator.name}`);
                const result = await evaluator.audit(content, context);
                
                // Collect results for Context OS
                evaluatorResults.push({
                    evaluatorName: evaluator.name,
                    passed: result.passed,
                    score: result.score,
                    issues: result.issues,
                    suggestion: result.suggestion,
                });
                
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
                logger.error(`[Gauntlet] Evaluator ${evaluator.name} crashed:`, { error: error instanceof Error ? error.message : String(error) });
                allIssues.push(`Evaluator ${evaluator.name} failed to execute.`);
                evaluatorResults.push({
                    evaluatorName: evaluator.name,
                    passed: false,
                    score: 0,
                    issues: [`Evaluator crashed: ${error}`],
                });
            }
        }

        const passed = allIssues.length === 0;

        // Log to Context OS for decision lineage
        try {
            const decisionData = DecisionLogService.createDecisionFromGauntlet(
                context.agentId,
                context.task,
                content,
                evaluatorResults,
                passed,
                { retryCount: context.previousAttempts }
            );
            
            await DecisionLogService.logDecision(decisionData);
            logger.info(`[Gauntlet] Decision logged to Context OS`);
        } catch (logError) {
            // Don't fail verification if logging fails
            logger.error(`[Gauntlet] Failed to log to Context OS:`, { error: logError instanceof Error ? logError.message : String(logError) });
        }

        if (passed) {
            logger.info(`[Gauntlet] Verification PASSED.`);
            return {
                passed: true,
                score: lowestScore,
                issues: [],
                suggestion: 'Approved.'
            };
        }

        logger.info(`[Gauntlet] Verification FAILED with ${allIssues.length} issues.`);
        return {
            passed: false,
            score: lowestScore,
            issues: allIssues,
            suggestion: suggestion.trim() || `Fix the following issues: ${allIssues.join('; ')}`
        };
    }
}

