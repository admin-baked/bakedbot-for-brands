import { GET } from '@/app/api/playbook-runs/[runId]/summary-for-ai-engineers/route';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedRun: jest.fn().mockResolvedValue({
        run: { id: 'run_1' },
    }),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('GET /api/playbook-runs/[runId]/summary-for-ai-engineers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the latest summary artifact', async () => {
        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                docs: [
                                    {
                                        data: () => ({
                                            artifactType: 'summary_for_ai_engineers',
                                            createdAt: '2026-03-12T13:00:00.000Z',
                                            metadata: { repoPath: 'artifacts/playbooks/org_1/pb_1/runs/2026/03/12/run_1/summary_for_ai_engineers.md' },
                                        }),
                                    },
                                    {
                                        data: () => ({
                                            artifactType: 'summary_for_ai_engineers',
                                            createdAt: '2026-03-12T14:00:00.000Z',
                                            metadata: { repoPath: 'latest.md' },
                                        }),
                                    },
                                ],
                            }),
                        }),
                    }),
                }),
            }),
        });

        const req = new Request('http://localhost/api/playbook-runs/run_1/summary-for-ai-engineers');
        const res = await GET(req, { params: { runId: 'run_1' } });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.artifact.metadata.repoPath).toBe('latest.md');
    });
});
