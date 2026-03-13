import { POST } from '@/app/api/playbooks/[playbookId]/runs/route';

var mockGetAuthorizedPlaybook = jest.fn();
var mockStartRun = jest.fn();

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedPlaybook: (...args: unknown[]) => mockGetAuthorizedPlaybook(...args),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

jest.mock('@/server/services/playbook-run-coordinator', () => ({
    PlaybookRunCoordinator: jest.fn().mockImplementation(() => ({
        startRun: (...args: unknown[]) => mockStartRun(...args),
    }))
}));

jest.mock('@/server/services/playbook-infra-adapters');

describe('POST /api/playbooks/[playbookId]/runs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStartRun.mockResolvedValue({ runId: 'run_123' });
        mockGetAuthorizedPlaybook.mockResolvedValue({
            playbook: { version: 2, orgId: 'org_1' },
        });
    });

    it('should return 404 if playbook not found', async () => {
        const { PlaybookApiError } = require('@/server/services/playbook-auth');
        mockGetAuthorizedPlaybook.mockRejectedValue(new PlaybookApiError('Playbook not found', 404));

        const req = {
            json: async () => ({}),
        } as any;

        const res = await POST(req, { params: { playbookId: 'pb_1' } });
        expect(res.status).toBe(404);
    });

    it('should start a run if playbook exists', async () => {
        const req = {
            json: async () => ({ triggerEvent: { type: 'webhook' } }),
        } as any;

        const res = await POST(req, { params: { playbookId: 'pb_1' } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.runId).toBe('run_123');
        expect(mockStartRun).toHaveBeenCalledWith({
            playbookId: 'pb_1',
            playbookVersion: 2,
            orgId: 'org_1',
            triggerEvent: { type: 'webhook' },
        });
    });
});
