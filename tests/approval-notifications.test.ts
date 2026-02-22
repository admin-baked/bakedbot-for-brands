import { Timestamp } from 'firebase-admin/firestore';
import type { ApprovalRequest } from '@/server/services/approval-queue';

const fetchMock = jest.fn();
global.fetch = fetchMock as any;

function makeApproval(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
    return {
        id: 'req-123',
        createdAt: Timestamp.now(),
        requestedBy: 'linus@example.com',
        operationType: 'cloud_scheduler_create',
        operationDetails: {
            targetResource: 'nightly-job',
            action: 'create',
            reason: 'nightly sync',
            riskLevel: 'high',
        },
        status: 'pending',
        auditLog: [],
        ...overrides,
    };
}

async function loadNotificationsModule() {
    jest.resetModules();
    return import('@/server/services/approval-notifications');
}

describe('Approval notifications service', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        fetchMock.mockReset();
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('skips notifications when Slack webhook is not configured', async () => {
        delete process.env.SLACK_WEBHOOK_LINUS_APPROVALS;
        delete process.env.SLACK_WEBHOOK_URL;

        const { notifyNewApprovalRequest } = await loadNotificationsModule();
        await notifyNewApprovalRequest(
            makeApproval(),
            'https://example.com/dashboard/linus-approvals?request=req-123',
        );

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('posts new approval payload to configured Slack webhook', async () => {
        process.env.SLACK_WEBHOOK_LINUS_APPROVALS = 'https://hooks.slack.test/approval';

        const { notifyNewApprovalRequest } = await loadNotificationsModule();
        await notifyNewApprovalRequest(
            makeApproval(),
            'https://example.com/dashboard/linus-approvals?request=req-123',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://hooks.slack.test/approval');

        const payload = JSON.parse((init as RequestInit).body as string);
        expect(payload.text).toBe('New Approval Request');
        expect(payload.blocks).toBeInstanceOf(Array);
    });

    it('uses execution-specific titles for success and failure', async () => {
        process.env.SLACK_WEBHOOK_LINUS_APPROVALS = 'https://hooks.slack.test/approval';

        const { notifyApprovalExecuted } = await loadNotificationsModule();

        await notifyApprovalExecuted(
            makeApproval({
                status: 'executed',
                execution: {
                    executedAt: Timestamp.now(),
                    executedBy: 'system',
                    result: 'success',
                },
            }),
        );

        await notifyApprovalExecuted(
            makeApproval({
                status: 'failed',
                execution: {
                    executedAt: Timestamp.now(),
                    executedBy: 'system',
                    result: 'failure',
                    error: 'Timeout',
                },
            }),
        );

        const firstPayload = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        const secondPayload = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);

        expect(firstPayload.text).toBe('Execution Successful');
        expect(secondPayload.text).toBe('Execution Failed');
    });
});
