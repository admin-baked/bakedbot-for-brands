
// Mock Genkit first to prevent ESM import issues
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({ text: 'Mock AI Response' }),
        defineTool: jest.fn(),
    },
}));

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
jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));
jest.mock('@/lib/cache', () => ({
    getRedisClient: jest.fn().mockReturnValue(null),
    initializeRedis: jest.fn(),
}));
jest.mock('@/lib/cache/agent-runner-cache', () => ({
    agentCache: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), delete: jest.fn(), clear: jest.fn() },
    CacheKeys: {
        agentConfig: jest.fn().mockReturnValue('mock-cache-key'),
        brandProfile: jest.fn().mockReturnValue('mock-brand-key'),
        aiSettings: jest.fn().mockReturnValue('mock-settings-key'),
        kbSearch: jest.fn().mockReturnValue('mock-kb-key'),
    },
    CacheTTL: { AGENT_CONFIG: 3600, BRAND_PROFILE: 3600, AI_SETTINGS: 3600, KB_SEARCH: 60 }
}));

// Mock external deps to avoid crash
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ role: 'guest', brandId: 'demo' })
}));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockReturnValue({ firestore: { collection: () => ({ doc: () => ({ get: () => ({ exists: false }) }) }) } })
}));
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    }),
    getAdminAuth: jest.fn(),
}));
jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'craig', confidence: 1.0 })
}));
jest.mock('@/server/agents/persistence', () => ({
    persistence: { saveLog: jest.fn(), loadLogs: jest.fn() }
}));
jest.mock('@/server/jobs/thought-stream', () => ({
    emitThought: jest.fn()
}));
jest.mock('@/server/actions/knowledge-base', () => ({
    getKnowledgeBasesAction: jest.fn().mockResolvedValue([]),
    searchKnowledgeBaseAction: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/server/actions/ai-settings', () => ({
    loadAISettingsForAgent: jest.fn().mockResolvedValue({ customInstructions: '', presetPrompts: [] })
}));
jest.mock('@/server/services/org-profile', () => ({
    getOrgProfileWithFallback: jest.fn().mockResolvedValue(null),
    buildSmokeyContextBlock: jest.fn().mockReturnValue(''),
    buildCraigContextBlock: jest.fn().mockReturnValue(''),
    buildPopsContextBlock: jest.fn().mockReturnValue(''),
    buildEzalContextBlock: jest.fn().mockReturnValue(''),
}));
jest.mock('@/server/services/market-benchmarks', () => ({
    getMarketBenchmarks: jest.fn().mockResolvedValue(null),
    buildBenchmarkContextBlock: jest.fn().mockReturnValue(''),
}));
jest.mock('@/server/repos/talkTrackRepo', () => ({
    getAllTalkTracks: jest.fn().mockResolvedValue([])
}));
jest.mock('@/server/services/org-integration-status', () => ({
    buildIntegrationStatusSummaryForOrg: jest.fn().mockResolvedValue('Mock integrations'),
}));
// Mock PERSONAS to avoid import issues or undefineds
jest.mock('@/app/dashboard/ceo/agents/personas', () => ({
    PERSONAS: {
        puff: { id: 'puff' },
        craig: { id: 'craig' }
    }
}));
jest.mock('@/server/agents/agent-definitions', () => ({
    AGENT_CAPABILITIES: [{ id: 'craig', name: 'Craig' }],
    getDelegatableAgentIds: jest.fn(() => ['craig', 'leo', 'linus']),
    AGENT_LINUS: 'linus',
    AGENT_LEO: 'leo',
    AGENT_CRAIG: 'craig',
    KNOWN_INTEGRATIONS: [],
    canRoleAccessAgent: jest.fn().mockReturnValue(true),
    buildSquadRoster: jest.fn().mockReturnValue('Squad: Craig'),
    buildIntegrationStatusSummary: jest.fn().mockReturnValue('Integrations: OK'),
}));

jest.setTimeout(30000);

describe('AgentRunner Gauntlet Loop', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, ENABLE_GAUNTLET_VERIFICATION: 'true' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it.skip('should retry generation if Gauntlet fails', async () => {
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
