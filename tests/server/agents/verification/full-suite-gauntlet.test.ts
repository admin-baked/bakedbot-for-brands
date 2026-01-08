
import { Gauntlet } from '@/server/agents/verification/gauntlet';
import { FinancialEvaluator } from '@/server/agents/verification/evaluators/financial-evaluator';
import { TechnicalEvaluator } from '@/server/agents/verification/evaluators/technical-evaluator';
import { executeWithTools } from '@/ai/claude';

// Mock Claude
jest.mock('@/ai/claude', () => ({
    executeWithTools: jest.fn(),
    isClaudeAvailable: jest.fn().mockReturnValue(true)
}));

describe('Gauntlet Full Suite Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Financial Evaluator (Mike/Jack)', () => {
        it('should fail on negative revenue logic', async () => {
            const financialEval = new FinancialEvaluator();
            const gauntlet = new Gauntlet([financialEval]);
            const mockExecutor = executeWithTools as jest.Mock;

            // Trigger failure
            mockExecutor.mockImplementation(async (prompt, tools, toolRunner) => {
                await toolRunner('submit_audit', { 
                    passed: false, 
                    score: 40, 
                    issues: ['Projected revenue is negative -$500 without loss explanation.'], 
                    suggestion: 'Fix revenue checks.' 
                });
                return { content: "Audit Done" };
            });

            const result = await gauntlet.run({ revenue: -500 }, { agentId: 'mike_exec' } as any);
            expect(result.passed).toBe(false);
            expect(result.issues[0]).toContain('Projected revenue');
        });
    });

    describe('Technical Evaluator (Linus)', () => {
        it('should fail immediately on hardcoded secrets (Regex check)', async () => {
            const techEval = new TechnicalEvaluator();
            const gauntlet = new Gauntlet([techEval]);
            
            // Note: The Regex check happens BEFORE calling Claude.
            // So we don't expect executeWithTools to be called if regex matches.
            const unsafeContent = "const apiKey = 'sk_live_1234567890abcdefghij';";
            
            const result = await gauntlet.run(unsafeContent, { agentId: 'linus' } as any);
            
            expect(result.passed).toBe(false);
            expect(result.issues[0]).toContain('CRITICAL: Hardcoded secret');
        });
    });
});
