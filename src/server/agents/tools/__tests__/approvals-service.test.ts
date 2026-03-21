jest.mock('uuid', () => ({ v4: () => 'approval-123' }));

import { createFirestoreTestHarness } from '@/server/services/__tests__/firestore-test-helpers';

let harness = createFirestoreTestHarness();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({
        firestore: harness.firestore,
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import {
    createApprovalRequest,
    getApprovalPayload,
    checkIdempotency,
    saveIdempotency,
} from '../approvals/service';

describe('Approvals Service', () => {
    beforeEach(() => {
        harness = createFirestoreTestHarness();
    });

    it('creates approval requests with proactive metadata and exact payload storage', async () => {
        const result = await createApprovalRequest({
            tenantId: 'tenant-1',
            toolName: 'marketing.send',
            inputs: {
                campaignId: 'camp-1',
                nested: { audience: 'vip', optional: undefined },
            },
            actorId: 'user-1',
            actorRole: 'brand',
            options: {
                taskId: 'task-1',
                requestedByAgent: 'craig',
                rationale: 'VIP win-back draft is ready to send.',
                riskClass: 'medium',
                evidenceRefs: ['inbox://artifact-1'],
                expiresAt: 1234567890,
            },
        });

        expect(result).toMatchObject({
            id: 'approval-123',
            tenantId: 'tenant-1',
            toolName: 'marketing.send',
            status: 'pending',
            taskId: 'task-1',
            requestedByAgent: 'craig',
            rationale: 'VIP win-back draft is ready to send.',
            riskClass: 'medium',
            evidenceRefs: ['inbox://artifact-1'],
            expiresAt: 1234567890,
        });

        const payload = await getApprovalPayload('tenant-1', 'approval-123');
        expect(payload).toEqual({
            campaignId: 'camp-1',
            nested: { audience: 'vip' },
        });
    });

    it('supports the legacy positional signature used by the tool router', async () => {
        const result = await createApprovalRequest(
            'tenant-1',
            'marketing.send',
            { campaignId: 'camp-2' },
            'user-2',
            'brand'
        );

        expect(result.id).toBe('approval-123');
        expect(result.requestedBy.userId).toBe('user-2');
    });

    it('returns null for missing idempotency keys', async () => {
        const result = await checkIdempotency('new-key');
        expect(result).toBeNull();
    });

    it('saves and returns idempotency results', async () => {
        await saveIdempotency('key-123', { status: 'success', data: { result: 'ok' } });

        const result = await checkIdempotency('key-123');
        expect(result).toMatchObject({
            status: 'success',
            data: { result: 'ok' },
        });
    });
});
