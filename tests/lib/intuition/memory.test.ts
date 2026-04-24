
import { DomainMemory } from '@/lib/intuition/domain-memory';
import { Trace } from '@/types/intuition-os';

// Mock Firestore
// NOTE: must use var (not const/let) here because jest.mock factories are hoisted
// above variable declarations, which causes TDZ errors with const/let.
// eslint-disable-next-line no-var
var mockSet = jest.fn();
// eslint-disable-next-line no-var
var mockGet = jest.fn();
// eslint-disable-next-line no-var
var mockCollection = jest.fn().mockReturnThis();
// eslint-disable-next-line no-var
var mockDoc = jest.fn().mockReturnThis();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockImplementation(() => Promise.resolve({
        firestore: {
            collection: (...args: unknown[]) => mockCollection(...args),
            doc: (...args: unknown[]) => mockDoc(...args),
        }
    }))
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('DomainMemory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCollection.mockReturnValue({
            doc: mockDoc,
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: mockGet
        });
        mockDoc.mockReturnValue({
            set: mockSet,
            update: jest.fn()
        });
    });

    it('should save a trace to Firestore', async () => {
        const memory = new DomainMemory('smokey');
        const trace: Trace = {
            id: 'trace-1',
            workOrderId: 'wo-1',
            method: 'system_2_planning',
            steps: [],
            durationMs: 100,
            startedAt: new Date(),
            completedAt: new Date()
        };

        await memory.saveTrace(trace);

        expect(mockCollection).toHaveBeenCalledWith('agent_traces');
        expect(mockDoc).toHaveBeenCalledWith('trace-1');
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
            id: 'trace-1',
            agentId: 'smokey'
        }));
    });

    it('should retrieve recent traces', async () => {
        const memory = new DomainMemory('smokey');
        mockGet.mockResolvedValue({
            docs: [
                { data: () => ({ id: 'trace-old' }) }
            ]
        });

        // Mock work order
        const wo: any = { id: 'wo-new', goal: 'test' };

        const traces = await memory.findSimilarTraces(wo);

        expect(traces).toHaveLength(1);
        expect(traces[0].id).toBe('trace-old');
    });
});
