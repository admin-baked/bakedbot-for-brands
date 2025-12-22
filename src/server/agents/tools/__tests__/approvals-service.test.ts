
import { createApprovalRequest, checkIdempotency, saveIdempotency } from '../approvals/service';

// Mock Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockImplementation(async () => ({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockImplementation((id) => ({
                get: jest.fn().mockResolvedValue({
                    exists: id === 'existing-key',
                    data: () => ({ status: 'success', data: { cached: true } })
                }),
                set: jest.fn().mockResolvedValue(true)
            })),
            add: jest.fn().mockResolvedValue({ id: 'new-approval-id' })
        }
    }))
}));

describe('Approvals Service', () => {
    describe('createApprovalRequest', () => {
        it('should create approval request and return id', async () => {
            const result = await createApprovalRequest({
                tenantId: 'tenant-1',
                toolName: 'marketing.send',
                payload: { campaignId: 'camp-1' },
                requestedBy: 'user-1'
            });

            expect(result).toHaveProperty('id');
            expect(result.id).toBeDefined();
        });
    });

    describe('checkIdempotency', () => {
        it('should return null for new key', async () => {
            const result = await checkIdempotency('new-key');
            expect(result).toBeNull();
        });

        it('should return cached result for existing key', async () => {
            const result = await checkIdempotency('existing-key');
            expect(result).toBeDefined();
            expect(result?.data).toEqual({ cached: true });
        });
    });

    describe('saveIdempotency', () => {
        it('should save result without throwing', async () => {
            await expect(
                saveIdempotency('key-123', { status: 'success', data: { result: 'ok' } })
            ).resolves.not.toThrow();
        });
    });
});
