
import { Gauntlet } from '@/server/agents/verification/gauntlet';
import { DeeboEvaluator } from '@/server/agents/verification/evaluators/deebo-evaluator';
import { executeWithTools } from '@/ai/claude';

// Mock Claude to avoid real API calls and testing network
jest.mock('@/ai/claude', () => ({
    executeWithTools: jest.fn(),
    isClaudeAvailable: jest.fn().mockReturnValue(true)
}));

describe('Gauntlet Integration: Deebo Evaluator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly flag non-compliant content', async () => {
        // Setup
        const deebo = new DeeboEvaluator();
        const gauntlet = new Gauntlet([deebo]);
        const mockExecutor = executeWithTools as jest.Mock;

        // Mock Claude Simulation: Returning a failure outcome
        mockExecutor.mockImplementation(async (prompt, tools, toolRunner) => {
            // Simulate the tool running by calling the callback manually or returning logic
            // But DeeboEvaluator relies on toolRunner being called?
            // DeeboEvaluator passes a callback to executeWithTools.
            // We need to simulate executeWithTools calling that callback.
            
            // The DeeboEvaluator logic:
            // await executeWithTools(..., async (toolName, input) => { ... })
            
            // We need to capture the runner function passed as 3rd arg
            const capturedRunner = toolRunner;
            
            // Use the tool!
            const toolInput = {
                passed: false,
                score: 20,
                issues: ['Appeals to minors (candy)'],
                suggestion: 'Remove candy reference'
            };
            
            await capturedRunner('submit_audit', toolInput);
            
            return { content: "Audit completed." };
        });

        // Act
        const result = await gauntlet.run({ text: "Free candy for kids!" }, { agentId: 'craig' } as any);

        // Assert
        expect(result.passed).toBe(false);
        expect(result.issues).toContain('Appeals to minors (candy)');
        expect(mockExecutor).toHaveBeenCalled();
        const promptUsed = mockExecutor.mock.calls[0][0];
        expect(promptUsed).toContain('Deebo, the BakedBot Compliance Officer');
    });

    it('should pass compliant content', async () => {
        const deebo = new DeeboEvaluator();
        const gauntlet = new Gauntlet([deebo]);
        const mockExecutor = executeWithTools as jest.Mock;

        mockExecutor.mockImplementation(async (prompt, tools, toolRunner) => {
            const capturedRunner = toolRunner;
            await capturedRunner('submit_audit', { 
                passed: true, 
                score: 100, 
                issues: [], 
                suggestion: 'Approved' 
            });
            return { content: "Audit passed." };
        });

        const result = await gauntlet.run("Visit us at 123 Main St. Lic C12-0000. 21+ Only.", { agentId: 'craig' } as any);

        expect(result.passed).toBe(true);
        expect(result.issues).toHaveLength(0);
    });
});
