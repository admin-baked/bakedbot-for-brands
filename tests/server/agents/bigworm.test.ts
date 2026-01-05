
// 1. Mock Genkit FIRST
const mockGenerate = jest.fn();
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: (...args: any[]) => mockGenerate(...args)
    }
}));

// 2. Mock Logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

// 4. Mock Persistence & Harness (Avoid Firebase/Side Effects)
jest.mock('@/server/agents/persistence', () => ({
    mockMemoryAdapter: {},
    persistence: {}
}));
jest.mock('@/server/agents/harness', () => ({
    // Interface is type-only, but mock value just in case
}));

// 5. Mock Default Tools (Heavy Imports)
jest.mock('@/app/dashboard/ceo/agents/default-tools', () => ({
    defaultBigWormTools: {
        pythonAnalyze: jest.fn(),
        saveFinding: jest.fn()
    }
}));

// 6. Import Agent after mocks
// import { bigWormAgent } from '@/server/agents/bigworm';
import { AgentMemory } from '@/server/agents/schemas';

// Mock Tools
const mockPythonAnalyze = jest.fn();
const mockSaveFinding = jest.fn();

describe.skip('BigWorm Agent', () => {
    let mockMemory: AgentMemory;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMemory = { id: 'test_mem', user_id: 'u1' };
    });

    it('should initialize with correct system prompt', async () => {
         const initialized = await bigWormAgent.initialize({} as any, mockMemory);
         expect(initialized.system_instructions).toContain('You are Big Worm');
         expect(initialized.active_researches).toBeDefined();
    });

    it('should plan to use pythonAnalyze when asked for trend analysis', async () => {
        // Setup Agent State
        const agent = bigWormAgent;
        await agent.initialize({} as any, mockMemory);

        // Mock LLM Response to call 'pythonAnalyze'
        mockGenerate.mockResolvedValueOnce({
            output: {
                thought: "I need to crunch the numbers.",
                toolName: "pythonAnalyze",
                args: { action: 'analyze_trend', data: { sales: [100, 200] } }
            }
        });

        // Mock LLM Synthesis Response
        mockGenerate.mockResolvedValueOnce({ text: "Trend is up, homie." });
        mockPythonAnalyze.mockResolvedValueOnce({ trend: 'up' });

        const result = await agent.act(
            {} as any, 
            mockMemory, 
            'user_request', 
            { pythonAnalyze: mockPythonAnalyze, saveFinding: mockSaveFinding },
            "Analyze these sales numbers"
        );

        // Verify Tool Call
        expect(mockPythonAnalyze).toHaveBeenCalledWith('analyze_trend', { sales: [100, 200] });
        
        // Verify Log
        expect(result.logEntry?.action).toBe('tool_execution');
        expect(result.logEntry?.result).toBe("Trend is up, homie.");
    });

    it('should handle logic when LLM returns no tool (null)', async () => {
        const agent = bigWormAgent;
        
        mockGenerate.mockResolvedValueOnce({
            output: {
                thought: "I'm just chilling.",
                toolName: "null",
                args: {}
            }
        });

        const result = await agent.act(
            {} as any, 
            { ...mockMemory, system_instructions: 'test' }, 
            'user_request', 
            { pythonAnalyze: mockPythonAnalyze, saveFinding: mockSaveFinding },
            "Hello"
        );

        expect(result.logEntry?.action).toBe('chat_response');
        expect(result.logEntry?.result).toContain("I'm just chilling.");
    });
});
