
import { AgentKernel } from '@/lib/intuition/runtime';
import { WorkOrder } from '@/types/intuition-os';

// Mock DomainMemory
const mockSaveTrace = jest.fn();
const mockFindSimilar = jest.fn();

jest.mock('@/lib/intuition/domain-memory', () => {
    return {
        DomainMemory: jest.fn().mockImplementation(() => ({
            saveTrace: mockSaveTrace,
            findSimilarTraces: mockFindSimilar
        }))
    };
});

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-' + Math.random().toString(36).substring(7)
}));

describe('AgentKernel (Intuition OS)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use System 2 when no history is found', async () => {
        mockFindSimilar.mockResolvedValue([]); // System 1 Miss

        const kernel = new AgentKernel('smokey');
        const wo: WorkOrder = {
            id: 'wo-1',
            agentId: 'smokey',
            goal: 'Do something new',
            context: { data: {}, capturedAt: new Date() },
            priority: 'medium'
        };

        const artifact = await kernel.run(wo);

        expect(artifact).toBeDefined();
        expect(artifact.content).toContain('System 2 Result');

        // Should verify saveTrace was called with method 'system_2_planning'
        expect(mockSaveTrace).toHaveBeenCalledWith(expect.objectContaining({
            method: 'system_2_planning'
        }));
    });

    it('should use System 1 when history is found', async () => {
        mockFindSimilar.mockResolvedValue([{ id: 'past-trace-1' }]); // System 1 Hit

        const kernel = new AgentKernel('smokey');
        const wo: WorkOrder = {
            id: 'wo-2',
            agentId: 'smokey',
            goal: 'Do something repeat',
            context: { data: {}, capturedAt: new Date() },
            priority: 'medium'
        };

        const artifact = await kernel.run(wo);

        expect(artifact.content).toContain('System 1 Result');

        // Should verify saveTrace was called with method 'system_1_heuristic'
        expect(mockSaveTrace).toHaveBeenCalledWith(expect.objectContaining({
            method: 'system_1_heuristic'
        }));
    });
});
