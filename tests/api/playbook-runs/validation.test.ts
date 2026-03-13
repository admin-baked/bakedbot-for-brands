import { GET } from '@/app/api/playbook-runs/[runId]/validation/route';

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedRun: jest.fn(),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('GET /api/playbook-runs/[runId]/validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the validation report from the run record', async () => {
        const { getAuthorizedRun } = require('@/server/services/playbook-auth');
        (getAuthorizedRun as jest.Mock).mockResolvedValue({
            run: {
                id: 'run_1',
                validationReport: {
                    overallStatus: 'pass',
                },
            },
        });

        const req = new Request('http://localhost/api/playbook-runs/run_1/validation');
        const res = await GET(req, { params: { runId: 'run_1' } });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.validationReport.overallStatus).toBe('pass');
    });
});
