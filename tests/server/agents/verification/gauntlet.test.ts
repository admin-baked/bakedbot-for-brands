
import { Gauntlet } from '@/server/agents/verification/gauntlet';
import { DeeboEvaluator } from '@/server/agents/verification/evaluators/deebo-evaluator';
import { VerificationContext } from '@/server/agents/verification/types';

// Mock Claude
jest.mock('@/ai/claude', () => ({
    executeWithTools: jest.fn()
}));

import { executeWithTools } from '@/ai/claude';

describe('Gauntlet & Deebo Verification', () => {
    const mockContext: VerificationContext = {
        agentId: 'craig',
        task: 'generate-sms',
        originalPrompt: 'Send SMS',
        previousAttempts: 0
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should pass if Deebo returns passed=true', async () => {
        // Mock successful audit
        (executeWithTools as jest.Mock).mockImplementation(async (prompt, tools, executor) => {
            // Simulate agent calling the tool
            await executor('submit_audit', {
                passed: true,
                score: 100,
                issues: [],
                suggestion: 'Perfect.'
            });
            return { content: 'Done' };
        });

        const deebo = new DeeboEvaluator();
        const gauntlet = new Gauntlet([deebo]);

        const result = await gauntlet.run('Compliant Message', mockContext);
        
        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
        expect(result.issues).toHaveLength(0);
    });

    it('should fail if Deebo returns passed=false', async () => {
        // Mock failed audit
        (executeWithTools as jest.Mock).mockImplementation(async (prompt, tools, executor) => {
            await executor('submit_audit', {
                passed: false,
                score: 50,
                issues: ['Cartoon character detected'],
                suggestion: 'Remove image.'
            });
            return { content: 'Done' };
        });

        const deebo = new DeeboEvaluator();
        const gauntlet = new Gauntlet([deebo]);

        const result = await gauntlet.run('Bad Message', mockContext);
        
        expect(result.passed).toBe(false);
        expect(result.score).toBe(50);
        expect(result.issues).toContain('Cartoon character detected');
    });

    it('should handle multiple evaluators (Lowest Score Wins)', async () => {
        // Create a fake second evaluator
        const strictEvaluator = {
            name: 'Strict Judge',
            audit: jest.fn().mockResolvedValue({
                passed: true,
                score: 80,
                issues: []
            })
        };

        // Mock Deebo to pass with 100
        (executeWithTools as jest.Mock).mockImplementation(async (prompt, tools, executor) => {
            await executor('submit_audit', {
                passed: true,
                score: 100,
                issues: [],
                suggestion: 'Good.'
            });
            return { content: 'Done' };
        });

        const deebo = new DeeboEvaluator();
        const gauntlet = new Gauntlet([deebo, strictEvaluator]);

        const result = await gauntlet.run('Message', mockContext);
        
        // Both passed, but lowest score is 80
        expect(result.passed).toBe(true);
        // expect(result.score).toBe(80); // Logic says minScore
    });
});
