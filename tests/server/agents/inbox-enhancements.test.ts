// Mock Genkit immediately to prevent ESM import issues
jest.mock('genkit', () => ({
    tool: jest.fn(),
}));

jest.mock('@genkit-ai/ai', () => ({
    tool: jest.fn(),
}));

jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({ text: 'Mock AI Response' }),
    },
}));

// Mock Router
jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'puff', confidence: 0.9 }),
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
jest.mock('@/server/security', () => ({
    validateInput: (i: string) => ({ safe: true, sanitized: i, riskScore: 0, blocked: false, flags: [] }),
    validateOutput: (o: string) => ({ safe: true, sanitized: o, flags: [] }),
    sanitizeForPrompt: (s: any) => s,
    wrapUserData: (u: any) => u,
    getRiskLevel: () => 'low'
}));
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
    canRoleAccessAgent: jest.fn().mockReturnValue(false),
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

import { ezalAgent } from '@/server/agents/ezal';
import { DecodedIdToken } from 'firebase-admin/auth';
import { jest as jestGlobal } from '@jest/globals';

// Increase timeout for agent runner tests
jest.setTimeout(60000);

describe('Inbox and Agent Enhancements', () => {
    const mockUser: DecodedIdToken = {
        uid: 'test-user',
        email: 'test@bakedbot.ai',
        email_verified: true,
        role: 'brand',
        brandId: 'brand-123',
        auth_time: 123,
        iat: 123,
        exp: 123,
        aud: 'test',
        iss: 'test',
        sub: 'test-user',
        firebase: { identities: {}, sign_in_provider: 'custom' }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Agent Runner Integration Cues', () => {
        it('should inject the missing integration directive into customInstructionsBlock', async () => {
            const userMessage = 'How many sales today?';
            const { runAgentCore } = await import('@/server/agents/agent-runner');
            const { ai } = await import('@/ai/genkit');

            await runAgentCore(userMessage, 'pops', {}, mockUser, userMessage);

            const callArgs = (ai.generate as jest.Mock).mock.calls[0][0];
            const promptText = typeof callArgs.prompt === 'string'
                ? callArgs.prompt
                : callArgs.prompt[0].text;

            expect(promptText).toContain('[SYSTEM DIRECTIVE: MISSING DATA]');
            expect(promptText).toContain('/dashboard/settings/integrations');
            expect(promptText).toContain('[Connect your POS or Data Source](/dashboard/settings/integrations)');
        });
    });

    describe('Ezal Proactive Search', () => {
        it('should have updated system instructions for proactive search', async () => {
            const brandMemory = {
                brand_profile: { name: 'Test Brand', id: 'brand-123' }
            };
            const agentMemory = {
                competitor_watchlist: [],
                agent_id: 'ezal-123'
            };

            const initializedMemory = await ezalAgent.initialize(brandMemory as any, agentMemory as any);

            expect(initializedMemory.system_instructions).toContain('DO NOT just ask for names');
            expect(initializedMemory.system_instructions).toContain('PROACTIVELY use the `searchWeb` tool');
        });
    });
});
