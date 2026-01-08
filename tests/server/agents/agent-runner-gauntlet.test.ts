
import { runAgentCore } from '@/server/agents/agent-runner';
import { runAgent } from '@/server/agents/harness';
import { Gauntlet } from '@/server/agents/verification/gauntlet';

// Mock Dependencies
jest.mock('@/server/agents/harness');
jest.mock('@/server/agents/verification/gauntlet');
jest.mock('@/server/agents/verification/evaluators/deebo-evaluator');
jest.mock('@/ai/claude', () => ({
    executeWithTools: jest.fn(),
    isClaudeAvailable: jest.fn().mockReturnValue(true)
}));
jest.mock('@/server/agents/tools/claude-tools', () => ({
    getUniversalClaudeTools: jest.fn().mockReturnValue([]),
    createToolExecutor: jest.fn(),
    shouldUseClaudeTools: jest.fn().mockReturnValue(false)
}));

// Mock external deps to avoid crash
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ role: 'guest', brandId: 'demo' })
}));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockReturnValue({ firestore: { collection: () => ({ doc: () => ({ get: () => ({ exists: false }) }) }) } })
}));
jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'craig', confidence: 1.0 })
}));
jest.mock('@/server/agents/persistence', () => ({
    persistence: {}
}));
jest.mock('@/server/jobs/thought-stream', () => ({
    emitThought: jest.fn()
}));
// Mock PERSONAS to avoid import issues or undefineds
jest.mock('@/app/dashboard/ceo/agents/personas', () => ({
    PERSONAS: {
        puff: { id: 'puff' },
        craig: { id: 'craig' }
    }
}));
jest.mock('@/server/agents/agent-definitions', () => ({
    AGENT_CAPABILITIES: [{ id: 'craig', name: 'Craig' }]
}));

describe('AgentRunner Gauntlet Loop', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should retry generation if Gauntlet fails', async () => {
        // Setup Mocks
        const mockRunAgent = runAgent as jest.Mock;
        const MockGauntlet = Gauntlet as jest.Mock;
        
        // 1. First Attempt: Fails verification
        // 2. Second Attempt: Passes verification
        mockRunAgent
            .mockResolvedValueOnce({ result: 'Bad Response' }) // Attempt 1
            .mockResolvedValueOnce({ result: 'Good Response' }); // Attempt 2

        // Mock Gauntlet Instance
        const mockGauntletInstance = {
            run: jest.fn()
                .mockResolvedValueOnce({ passed: false, issues: ['Too risky'], suggestion: 'Tone it down' }) // Check 1
                .mockResolvedValueOnce({ passed: true, issues: [], suggestion: 'Approved' }) // Check 2
        };
        MockGauntlet.mockImplementation(() => mockGauntletInstance);

        // Act: Run Craig (who is configured to have DeeboEvaluator)
        // We use 'craig' as the personaId or rely on router mock (which returns craig)
        // Note: runner logic checks AGENT_EVALUATORS['craig'].
        await runAgentCore('Write risky SMS', 'craig');

        // Assert
        expect(mockRunAgent).toHaveBeenCalledTimes(2);
        
        // Verify Attempt 1 Args (Clean)
        expect(mockRunAgent.mock.calls[0][4]).toContain('Write risky SMS');
        
        // Verify Attempt 2 Args (With Feedback)
        const secondCallStimulus = mockRunAgent.mock.calls[1][4];
        expect(secondCallStimulus).toContain('[VERIFICATION FEEDBACK]');
        expect(secondCallStimulus).toContain('Too risky');
        expect(secondCallStimulus).toContain('Tone it down');
    });

    it('should return successfully if Gauntlet passes on first try', async () => {
        const mockRunAgent = runAgent as jest.Mock;
        const MockGauntlet = Gauntlet as jest.Mock;
        
        mockRunAgent.mockResolvedValueOnce({ result: 'Perfect Response' });
        
        const mockGauntletInstance = {
            run: jest.fn().mockResolvedValueOnce({ passed: true })
        };
        MockGauntlet.mockImplementation(() => mockGauntletInstance);

        await runAgentCore('Write safe SMS', 'craig');

        expect(mockRunAgent).toHaveBeenCalledTimes(1);
    });
});
