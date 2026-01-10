
import { defaultExecutiveBoardTools, defaultSmokeyTools, defaultPopsTools } from '@/app/dashboard/ceo/agents/default-tools';

// --- MOCKS ---

jest.mock('@/ai/genkit', () => ({
    ai: { generate: jest.fn().mockResolvedValue({ text: 'Mock Response' }) }
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: { checkContent: jest.fn() }
}));

jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {}
}));

jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn()
}));

jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn(),
    formatSearchResults: jest.fn()
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn()
}));

jest.mock('@/server/services/letta/client', () => ({
    lettaClient: {
        listAgents: jest.fn().mockResolvedValue([]),
        createAgent: jest.fn().mockResolvedValue({ id: 'mock-agent-id' }),
        sendMessage: jest.fn().mockResolvedValue({ success: true })
    }
}));

jest.mock('@/server/services/python-sidecar', () => ({
    sidecar: { execute: jest.fn() }
}));

jest.mock('@/server/tools/mcp-tools', () => ({
    mcpListServers: jest.fn()
}));

jest.mock('@/server/services/mcp/client', () => ({
    getMcpClient: jest.fn()
}));

jest.mock('@/server/services/rtrvr/client', () => ({
    getRTRVRClient: jest.fn()
}));

jest.mock('@/server/services/letta/block-manager', () => ({
    lettaBlockManager: {},
    BLOCK_LABELS: {}
}));

jest.mock('@/server/services/letta/dynamic-memory', () => ({
    dynamicMemoryService: {}
}));

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {}
}));

describe('Super User Tools', () => {
    describe('spawnAgent', () => {
        it('should successfully spawn an agent and return an ID', async () => {
             const result = await defaultExecutiveBoardTools.spawnAgent(
                 'Test Research Task',
                 'research',
                 3600
             );

             expect(result.success).toBe(true);
             expect(result.agentId).toBeDefined();
             expect(result.agentId).toContain('spawned-research-');
             expect(result.status).toBe('active');
        });
    });

    describe('generateExecutiveReport', () => {
        it('should allow Smokey to generate a CEO report', async () => {
            const topic = 'Inventory Health';
            const result = await defaultSmokeyTools.generateExecutiveReport(topic);
            
            expect(result.recipient).toBe('CEO');
            expect(result.topic).toBe(topic);
            expect(result.status).toBe('delivered');
            expect(result.summary).toContain('Smokey');
        });

        it('should allow Pops to generate a CEO report', async () => {
            const topic = 'Q3 Revenue';
            const result = await defaultPopsTools.generateExecutiveReport(topic);
            
            expect(result.recipient).toBe('CEO');
            expect(result.topic).toBe(topic);
            expect(result.status).toBe('delivered');
            expect(result.summary).toContain('Pops');
        });
    });
});
