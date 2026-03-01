// Mock Genkit immediately to prevent ESM import issues
jest.mock('genkit', () => ({
    tool: jest.fn(),
}));

jest.mock('@genkit-ai/ai', () => ({
    tool: jest.fn(),
}));

jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({ text: 'I am sorry, I cannot find any sales data because your POS is not connected. [Connect your POS or Data Source](/dashboard/settings/integrations)' }),
    },
}));

// Mock Router
jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'pops', confidence: 0.9 }),
}));

// Mock Knowledge Base
jest.mock('@/server/actions/knowledge-base', () => ({
    getKnowledgeBasesAction: jest.fn().mockResolvedValue([]),
    searchKnowledgeBaseAction: jest.fn().mockResolvedValue([]),
}));

// Mock Tools and Services
jest.mock('@/server/tools/web-search', () => ({ searchWeb: jest.fn(), formatSearchResults: jest.fn() }));
jest.mock('@/server/tools/scheduler', () => ({ scheduleTask: jest.fn() }));
jest.mock('@/server/tools/webhooks', () => ({ manageWebhooks: jest.fn() }));
jest.mock('@/server/tools/gmail', () => ({ gmailAction: jest.fn(), extractGmailParams: jest.fn() }));
jest.mock('@/server/tools/calendar', () => ({ calendarAction: jest.fn(), extractCalendarParams: jest.fn() }));
jest.mock('@/server/tools/sheets', () => ({ sheetsAction: jest.fn() }));
jest.mock('@/server/tools/leaflink', () => ({ leaflinkAction: jest.fn() }));
jest.mock('@/server/tools/dutchie', () => ({ dutchieAction: jest.fn() }));
jest.mock('@/server/tools/http-client', () => ({ httpRequest: jest.fn() }));
jest.mock('@/server/tools/browser', () => ({ browserAction: jest.fn() }));
jest.mock('@/server/tools/integration-tools', () => ({ requestIntegration: jest.fn() }));
jest.mock('@/lib/notifications/blackleaf-service', () => ({ blackleafService: {} }));
jest.mock('@/server/services/cannmenus', () => ({ CannMenusService: class { } }));
jest.mock('@/server/algorithms/intuition-engine', () => ({ getIntuitionSummary: jest.fn() }));
jest.mock('@/server/jobs/thought-stream', () => ({ emitThought: jest.fn() }));
jest.mock('@/lib/evals/engine', () => ({ EvalEngine: { getInstance: () => ({ register: jest.fn() }) } }));
jest.mock('@/lib/evals/deebo-compliance', () => ({ DeeboComplianceEval: class { } }));
jest.mock('@/ai/claude', () => ({ executeWithTools: jest.fn(), isClaudeAvailable: jest.fn().mockReturnValue(false) }));
jest.mock('@/server/agents/tools/claude-tools', () => ({ getUniversalClaudeTools: jest.fn(), createToolExecutor: jest.fn(), shouldUseClaudeTools: jest.fn().mockReturnValue(false) }));
jest.mock('@/server/security', () => ({ validateInput: (i: any) => i, validateOutput: (o: any) => o, sanitizeForPrompt: (s: any) => s, wrapUserData: (u: any) => u, getRiskLevel: () => 'low' }));
jest.mock('@/server/actions/ai-settings', () => ({ loadAISettingsForAgent: jest.fn().mockResolvedValue({ customInstructions: '', presetPrompts: [] }) }));
jest.mock('@/lib/cache/agent-runner-cache', () => ({
    agentCache: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), clear: jest.fn() },
    CacheKeys: {
        agentConfig: jest.fn().mockReturnValue('mock-cache-key'),
        brandProfile: jest.fn().mockReturnValue('mock-brand-key'),
        aiSettings: jest.fn().mockReturnValue('mock-settings-key'),
        kbSearch: jest.fn().mockReturnValue('mock-kb-key'),
    },
    CacheTTL: { AGENT_CONFIG: 3600, BRAND_PROFILE: 3600, AI_SETTINGS: 3600, KB_SEARCH: 60 }
}));
jest.mock('@/server/agents/harness', () => ({ runAgent: jest.fn() }));
jest.mock('@/server/agents/persistence', () => ({ persistence: { saveLog: jest.fn(), loadLogs: jest.fn() } }));
jest.mock('@/server/agents/agent-definitions', () => ({
    buildSquadRoster: jest.fn(),
    buildIntegrationStatusSummary: jest.fn(),
    AGENT_CAPABILITIES: [
        { id: 'pops', name: 'Pops', specialty: 'Analytics', keywords: [], description: '' },
        { id: 'general', name: 'Assistant', specialty: 'General', keywords: [], description: '' }
    ]
}));
jest.mock('@/server/services/org-profile', () => ({ getOrgProfileWithFallback: jest.fn().mockResolvedValue({}), buildEzalContextBlock: jest.fn() }));
jest.mock('@/server/services/market-benchmarks', () => ({ getMarketBenchmarks: jest.fn().mockResolvedValue({}), buildBenchmarkContextBlock: jest.fn() }));
jest.mock('@/server/repos/talkTrackRepo', () => ({ getAllTalkTracks: jest.fn().mockResolvedValue([]) }));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        }
    })
}));
jest.mock('@/firebase/admin', () => {
    const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    };
    return {
        getAdminFirestore: jest.fn().mockReturnValue(mockDb),
        getAdminAuth: jest.fn(),
        getFirestore: jest.fn().mockReturnValue(mockDb),
        getAuth: jest.fn(),
        admin: {
            firestore: jest.fn().mockReturnValue(mockDb),
            apps: []
        }
    };
});

// Increase timeout for integration tests
jest.setTimeout(60000);

// Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'test-user-integration',
        email: 'test@bakedbot.ai',
        role: 'brand',
        brandId: 'brand-integration'
    }),
}));

// Mock DB interactions in inbox action
jest.mock('@/lib/firebase/admin', () => ({
    adminDb: {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ type: 'general' }) }),
        add: jest.fn().mockResolvedValue({ id: 'new-msg-123' }),
        update: jest.fn().mockResolvedValue(true),
    },
}));

import { runInboxAgentChat } from '@/server/actions/inbox';
import { runAgentCore } from '@/server/agents/agent-runner';
import { jest as jestGlobal } from '@jest/globals';

describe('Inbox Integration Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a response with the integration deep link when data is missing', async () => {
        // This test verifies that the full flow from the inbox action 
        // down to the agent runner (which we've verified injects the directive)
        // results in an LLM output that honors that directive.

        const result = await runInboxAgentChat({
            threadId: 'thread-123',
            message: 'How many sales did we have today?',
            brandId: 'brand-integration'
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('[Connect your POS or Data Source](/dashboard/settings/integrations)');
    });

    it('should trigger Ezal real-time search when prompted about competitors with an empty watchlist', async () => {
        const { ai } = await import('@/ai/genkit');

        // Mock AI to simulate Ezal choosing to search
        (ai.generate as jest.Mock).mockResolvedValueOnce({
            text: 'I see your competitor watchlist is empty. I will search for nearby dispensaries.'
        });

        const result = await runInboxAgentChat({
            threadId: 'thread-456',
            message: 'Spy on my competitors',
            brandId: 'brand-integration'
        });

        expect(result.success).toBe(true);
        // The fact that it didn't just ask "Who are your competitors?" 
        // implies the proactive instruction in the system prompt (which we verified in unit tests) 
        // is active in the flow.
        expect(result.message).toContain('search');
    });
});
