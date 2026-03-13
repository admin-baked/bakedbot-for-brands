import { POST } from '@/app/api/playbook-runs/[runId]/retry/route';

var mockGetAuthorizedRun = jest.fn();
var mockEnqueueStage = jest.fn();

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedRun: (...args: unknown[]) => mockGetAuthorizedRun(...args),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

jest.mock('@/server/services/playbook-infra-adapters', () => ({
    CloudTasksDispatcher: jest.fn().mockImplementation(() => ({
        enqueueStage: (...args: unknown[]) => mockEnqueueStage(...args),
    }))
}));

describe('POST /api/playbook-runs/[runId]/retry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEnqueueStage.mockResolvedValue(undefined);
        mockGetAuthorizedRun.mockResolvedValue({
            run: { playbookId: 'pb_1', triggerEvent: {} }
        });
    });

    it('should return 400 if stageName is missing', async () => {
        const req = {
            json: async () => ({}),
        } as any;

        const res = await POST(req, { params: { runId: 'run_1' } });
        expect(res.status).toBe(400);
    });

    it('should return 404 if run is not found', async () => {
        const { PlaybookApiError } = require('@/server/services/playbook-auth');
        mockGetAuthorizedRun.mockRejectedValue(new PlaybookApiError('Run not found', 404));

        const req = {
            json: async () => ({ stageName: 'generating_output' }),
        } as any;

        const res = await POST(req, { params: { runId: 'run_1' } });
        expect(res.status).toBe(404);
    });

    it('should enqueue the specified stage and return 200', async () => {
        const req = {
            json: async () => ({ stageName: 'validating', attempt: 2 }),
        } as any;

        const res = await POST(req, { params: { runId: 'run_1' } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.stageRequeued).toBe('validating');
        expect(mockEnqueueStage).toHaveBeenCalledWith({
            runId: 'run_1',
            playbookId: 'pb_1',
            stageName: 'validating',
            attempt: 2,
            triggerEvent: {}
        });
    });
});
