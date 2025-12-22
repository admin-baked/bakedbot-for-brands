import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { ai } from '@/ai/genkit';

// Mocks
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn()
    }
}));

jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'general', confidence: 0.9 })
}));

jest.mock('@/server/agents/agent-definitions', () => ({
    AGENT_CAPABILITIES: [
        { id: 'general', name: 'General Assistant', specialty: 'General tasks' },
        { id: 'craig', name: 'Craig', specialty: 'Marketing' }
    ]
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ role: 'brand', brandId: 'test-brand' })
}));

jest.mock('@/server/algorithms/intuition-engine', () => ({
    getIntuitionSummary: jest.fn().mockReturnValue({ stage: 'learning', confidence: 0.5, interactions: 10 })
}));

jest.mock('@/server/actions/knowledge-base', () => ({
    getKnowledgeBasesAction: jest.fn().mockResolvedValue([]),
    searchKnowledgeBaseAction: jest.fn().mockResolvedValue([])
}));

// Mock tools
jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn().mockResolvedValue({ success: true, results: [{ title: 'Res', body: 'Content' }] }),
    formatSearchResults: jest.fn().mockReturnValue('Formatted Results')
}));

describe('runAgentChat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes general chat to general agent', async () => {
        // Mock AI response for general chat logic
        (ai.generate as jest.Mock).mockResolvedValue({ text: 'Hello from AI' });

        const result = await runAgentChat('Hello bot');

        expect(result.content).toBeDefined();
        // Intuition and Route tools should be present
        expect(result.toolCalls?.some(t => t.id.startsWith('route-'))).toBe(true);
    });

    it('handles search requests', async () => {
        // Mock AI query conversion
        (ai.generate as jest.Mock)
            .mockResolvedValueOnce({ text: 'competitors' }) // Query conversion
            .mockResolvedValueOnce({ text: 'Search Report' }); // Synthesis

        const result = await runAgentChat('Find competitors');

        expect(result.toolCalls?.some(t => t.id.startsWith('search-'))).toBe(true);
        expect(result.content).toBe('Search Report');
    });
});
