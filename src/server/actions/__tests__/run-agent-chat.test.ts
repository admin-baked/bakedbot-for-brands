import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { dispatchAgentJob } from '@/server/jobs/dispatch';
import { getAgentForIntent } from '@/lib/agents/intent-router';
import { routeToAgent } from '@/server/agents/agent-router';

const mockJobSet = jest.fn().mockResolvedValue(undefined);
const mockJobDoc = jest.fn(() => ({
    set: mockJobSet,
}));
const mockCollection = jest.fn(() => ({
    doc: mockJobDoc,
}));
const mockDb = {
    collection: mockCollection,
};

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    requireSuperUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockDb),
}));

jest.mock('@/server/jobs/dispatch', () => ({
    dispatchAgentJob: jest.fn(),
}));

jest.mock('@/lib/agents/intent-router', () => ({
    getAgentForIntent: jest.fn(),
}));

jest.mock('@/server/agents/agent-router', () => ({
    routeToAgent: jest.fn(),
}));

jest.mock('@/server/security', () => ({
    validateInput: jest.fn(() => ({
        blocked: false,
        riskScore: 0,
    })),
    getRiskLevel: jest.fn(() => 'low'),
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'server-timestamp'),
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('runAgentChat', () => {
    const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
    const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<typeof getAdminFirestore>;
    const mockDispatchAgentJob = dispatchAgentJob as jest.MockedFunction<typeof dispatchAgentJob>;
    const mockGetAgentForIntent = getAgentForIntent as jest.MockedFunction<typeof getAgentForIntent>;
    const mockRouteToAgent = routeToAgent as jest.MockedFunction<typeof routeToAgent>;
    let randomUuidSpy: jest.SpiedFunction<typeof crypto.randomUUID>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetAdminFirestore.mockReturnValue(mockDb as ReturnType<typeof getAdminFirestore>);
        mockRequireUser.mockResolvedValue({
            uid: 'user-123',
            role: 'brand_admin',
            brandId: 'brand-456',
        } as Awaited<ReturnType<typeof requireUser>>);
        mockDispatchAgentJob.mockResolvedValue({
            success: true,
            taskId: 'task-123',
        });
        mockGetAgentForIntent.mockReturnValue(null);
        mockRouteToAgent.mockResolvedValue({
            primaryAgent: 'general',
            confidence: 0.9,
        });

        randomUuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('job-123');
    });

    afterEach(() => {
        randomUuidSpy.mockRestore();
    });

    it('creates a pending Puff job for general chat fallback', async () => {
        const result = await runAgentChat('Hello bot');

        expect(mockJobDoc).toHaveBeenCalledWith('job-123');
        expect(mockJobSet).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'pending',
                userId: 'user-123',
                userInput: 'Hello bot',
                persona: 'puff',
                brandId: 'brand-456',
                thoughts: [],
                createdAt: 'server-timestamp',
                updatedAt: 'server-timestamp',
                resumeOptions: expect.objectContaining({
                    brandId: 'brand-456',
                    modelLevel: 'standard',
                }),
            }),
        );

        expect(mockDispatchAgentJob).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-123',
                userInput: 'Hello bot',
                persona: 'puff',
                jobId: 'job-123',
                options: expect.objectContaining({
                    brandId: 'brand-456',
                    modelLevel: 'standard',
                }),
            }),
        );

        expect(result).toEqual({
            content: '',
            toolCalls: [],
            metadata: {
                jobId: 'job-123',
                agentName: 'BakedBot',
                type: 'session_context',
                brandId: 'brand-456',
            },
        });
    });

    it('routes competitor-search requests to Ezal before dispatching', async () => {
        mockRouteToAgent.mockResolvedValue({
            primaryAgent: 'ezal',
            confidence: 0.95,
            reasoning: 'Competitive intel intent detected',
        });

        const result = await runAgentChat('Find competitors');

        expect(mockDispatchAgentJob).toHaveBeenCalledWith(
            expect.objectContaining({
                persona: 'ezal',
                jobId: 'job-123',
                userInput: 'Find competitors',
            }),
        );
        expect(mockJobSet).toHaveBeenCalledWith(
            expect.objectContaining({
                persona: 'ezal',
            }),
        );
        expect(result.metadata).toEqual({
            jobId: 'job-123',
            agentName: 'ezal',
            type: 'session_context',
            brandId: 'brand-456',
        });
    });
});
