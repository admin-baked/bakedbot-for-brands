import { GET } from '@/app/api/playbook-runs/[runId]/route';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedRun: jest.fn(),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('GET /api/playbook-runs/[runId]', () => {
    let mockGet: jest.Mock;
    let mockCollectionGet: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet = jest.fn();
        mockCollectionGet = jest.fn();

        const mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        get: mockCollectionGet,
                        doc: jest.fn().mockReturnValue({
                            get: mockGet,
                        }),
                    }),
                }),
            }),
        };
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should return 404 if run not found', async () => {
        const { getAuthorizedRun, PlaybookApiError } = require('@/server/services/playbook-auth');
        (getAuthorizedRun as jest.Mock).mockRejectedValue(new PlaybookApiError('Run not found', 404));

        const req = new Request('http://localhost/api/playbook-runs/run_1');
        const res = await GET(req, { params: { runId: 'run_1' } });

        expect(res.status).toBe(404);
    });

    it('should return run data along with stages, artifacts, deliveries', async () => {
        const { getAuthorizedRun } = require('@/server/services/playbook-auth');
        (getAuthorizedRun as jest.Mock).mockResolvedValue({ run: { id: 'run_1', validationReport: null } });
        mockGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) });
        mockCollectionGet.mockResolvedValue({
            docs: [{ data: () => ({ name: 'item' }) }]
        });

        const req = new Request('http://localhost/api/playbook-runs/run_1');
        const res = await GET(req, { params: { runId: 'run_1' } });

        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.run.id).toBe('run_1');
        expect(data.stages).toHaveLength(1);
        expect(data.artifacts).toHaveLength(1);
        expect(data.deliveries).toHaveLength(1);
        expect(data).toHaveProperty('approval');
        expect(data).toHaveProperty('validationReport');
    });
});
