import { POST } from '@/app/api/playbook-runs/[runId]/approve/route';

var mockHandleApproval = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        set: jest.fn().mockResolvedValue(undefined),
                    }),
                }),
            }),
        }),
    }),
}));

jest.mock('@/server/services/playbook-run-coordinator', () => ({
    PlaybookRunCoordinator: jest.fn().mockImplementation(() => ({
        handleApproval: (...args: unknown[]) => mockHandleApproval(...args),
    }))
}));

jest.mock('@/server/services/playbook-infra-adapters', () => ({
    FirestorePlaybookAdapter: jest.fn(),
    CloudTasksDispatcher: jest.fn(),
    FirebaseStorageBlobStore: jest.fn(),
    GitArtifactRepoMock: jest.fn(),
    createPlaybookArtifactRepoStore: jest.fn(),
}));

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({ artifact: { id: 'art_1' } }),
    })),
}));

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedRun: jest.fn().mockResolvedValue({
        user: { uid: 'user_1', email: 'user_1@bakedbot.ai' },
        run: { startedAt: '2026-03-12T00:00:00.000Z' },
        playbook: { id: 'pb_1', orgId: 'org_1' },
    }),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('POST /api/playbook-runs/[runId]/approve', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHandleApproval.mockResolvedValue(undefined);
    });

    it('should return 400 if approved or reviewerId missing', async () => {
        const req = {
            json: async () => ({}),
        } as any;

        const res = await POST(req, { params: { runId: 'run_1' } });
        expect(res.status).toBe(400);
    });

    it('should call coordinator.handleApproval with true', async () => {
        const req = {
            json: async () => ({ approved: true }),
        } as any;

        const res = await POST(req, { params: { runId: 'run_1' } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.approved).toBe(true);
        expect(mockHandleApproval).toHaveBeenCalledWith({
            runId: 'run_1',
            approved: true,
            reviewerId: 'user_1',
        });
    });
});
