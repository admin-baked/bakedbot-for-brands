
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { ai } from '@/ai/genkit';
import { persistence } from '@/server/agents/persistence';

// --- Mocks ---

// Mock AI generation
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn()
    }
}));

// Mock Persistence
jest.mock('@/server/agents/persistence', () => ({
    persistence: {
        getRecentLogs: jest.fn(),
        loadBrandMemory: jest.fn(),
        saveLog: jest.fn()
    }
}));

// Mock Firebase Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
    db: {}
}));

// Mock Firebase Admin Wrapper
jest.mock('@/firebase/admin', () => ({
    adminDb: {},
    adminAuth: {}
}));

// Mock Next.js Cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

// Mock UUID
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234')
}));

// Mock CannMenus Service
jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn().mockImplementation(() => ({
        findRetailersCarryingBrand: jest.fn().mockResolvedValue([])
    }))
}));





// Mock Web Search Tool
jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn(),
    formatSearchResults: jest.fn().mockReturnValue('Formatted Search Results')
}));

// Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ 
        role: 'super_admin', 
        brandId: 'sandbox-brand-id',
        uid: 'test-user-id'
    })
}));

// Mock Internal Agent Router (Dynamic Import in SUT)
jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'ezal', confidence: 0.9 })
}));

// Mock Definitions
jest.mock('@/server/agents/agent-definitions', () => ({
    AGENT_CAPABILITIES: [
        { id: 'ezal', name: 'Ezal', specialty: 'Competitor Intel' },
        { id: 'general', name: 'General', specialty: 'Assistant' }
    ]
}));

// Mock Intuition Engine
jest.mock('@/server/algorithms/intuition-engine', () => ({
    getIntuitionSummary: jest.fn().mockReturnValue({ topEffects: [], topFormats: [] })
}));

// Mock Knowledge Base Actions
jest.mock('@/server/actions/knowledge-base', () => ({
    getKnowledgeBasesAction: jest.fn().mockResolvedValue([]),
    searchKnowledgeBaseAction: jest.fn().mockResolvedValue([])
}));


describe('runAgentChat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default Mock Returns
        (persistence.loadBrandMemory as jest.Mock).mockResolvedValue({
            brand_profile: { name: 'Sandbox Brand' },
            experiments_index: []
        });

        // Default AI response
        (ai.generate as jest.Mock).mockResolvedValue({ text: 'Mock AI Response' });
    });

    it('should execute a web search when intent is detected', async () => {
        // Arrange
        const userMessage = "Find competitors in California";
        const { searchWeb } = require('@/server/tools/web-search');
        searchWeb.mockResolvedValue({ success: true, results: [{ title: 'Comp 1', link: 'url' }] });

        (ai.generate as jest.Mock).mockResolvedValueOnce({ text: 'competitors in California' }); // For Query Conversion
        (ai.generate as jest.Mock).mockResolvedValueOnce({ text: 'Here is a report on competitors...' }); // For Synthesis

        // Act
        const result = await runAgentChat(userMessage, 'ezal');

        // Assert
        expect(result).toBeDefined();
        // Check if toolCalls contains Web Search
        const searchTool = result.toolCalls?.find(t => t.name === 'Web Search');
        expect(searchTool).toBeDefined();
        expect(searchTool?.status).toBe('success');
        
        // Verify AI was called to synthesize report
        expect(ai.generate).toHaveBeenCalledTimes(2);
    });

    it('should return a direct response if no tools are triggered', async () => {
        // Arrange
        const userMessage = "Hello, who are you?";
        
        // Mock routing to general
        const { routeToAgent } = require('@/server/agents/agent-router');
        routeToAgent.mockResolvedValueOnce({ primaryAgent: 'general', confidence: 0.5 });
        
        // Mock AI chat response
        (ai.generate as jest.Mock).mockResolvedValue({ text: 'I am BakedBot.' });

        // Act
        const result = await runAgentChat(userMessage, 'general');

        // Assert
        expect(result.content).toBe('I am BakedBot.');
        expect(result.toolCalls).toHaveLength(2); // Route + Intuition (always added)
        expect(result.toolCalls?.some(t => t.name.startsWith('Agent:'))).toBe(true);
    });

    it('should trigger a playbook when command is detected', async () => {
        // Arrange
        const userMessage = "Run welcome-sequence";

        // Act
        const result = await runAgentChat(userMessage);

        // Assert
        expect(result.content).toContain('Welcome Sequence Executed');
        expect(result.toolCalls?.some(t => t.name === 'Execute: welcome-sequence')).toBe(true);
    });

    it('should retrieve and inject knowledge base context', async () => {
        // Arrange
        const userMessage = "What is the compliance policy?";
        
        const { searchKnowledgeBaseAction, getKnowledgeBasesAction } = require('@/server/actions/knowledge-base');
        
        getKnowledgeBasesAction.mockResolvedValue([{ id: 'kb1' }]);
        searchKnowledgeBaseAction.mockResolvedValue([{ 
            title: 'Policy', 
            content: 'Must use child-proof bags', 
            similarity: 0.9 
        }]);

        // Act
        await runAgentChat(userMessage, 'deebo');

        // Assert
        expect(searchKnowledgeBaseAction).toHaveBeenCalled();
        
        // Verify AI generation was called with knowledge context
        // We can inspect the calls to ai.generate
        const aiCalls = (ai.generate as jest.Mock).mock.calls;
        const lastCall = aiCalls[aiCalls.length - 1][0]; // last call args
        expect(lastCall.prompt).toContain('[KNOWLEDGE BASE CONTEXT]');
        expect(lastCall.prompt).toContain('Must use child-proof bags');
    });

    it('should handle Ezal dispensary search seamlessly', async () => {
        // Arrange
        const userMessage = "Find dispensaries in Chicago selling Wyld Gummies";
        
        const { routeToAgent } = require('@/server/agents/agent-router');
        routeToAgent.mockResolvedValueOnce({ primaryAgent: 'ezal', confidence: 0.95 });

        // Mock CannMenus service success
        const { CannMenusService } = require('@/server/services/cannmenus');
        // The mock implementation in beforeEach/file-top should handle this, but let's be explicit if needed
        // CannMenusService mock returns findRetailersCarryingBrand -> []

        // Act
        const result = await runAgentChat(userMessage, 'ezal');

        // Assert
        expect(result.content).toBeDefined();
        expect(result.content).not.toBe('No content');
        
        // It should prefer the Specialized Agent path OR the Dispensary Search path
        // Since Ezal is specialized for this, it might try to run the agent harness first.
        // If that fails (mock default), it should fall through to Dispensary Search.
        
        // Let's see what happens in the trace
        // expect(result.toolCalls).not.toHaveLength(0); 
    });
});
