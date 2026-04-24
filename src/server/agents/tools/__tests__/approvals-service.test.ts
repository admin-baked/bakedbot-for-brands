
import { createApprovalRequest, checkIdempotency, saveIdempotency } from '../approvals/service';

// Mock Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockImplementation(async () => ({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockImplementation((path) => ({
                get: jest.fn().mockResolvedValue({
                    exists: typeof path === 'string' && path.includes('existing-key'),
                    data: () => ({ result: { cached: true }, timestamp: Date.now(), expiresAt: Date.now() + 86400000 })
                }),
                set: jest.fn().mockResolvedValue(true),
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        set: jest.fn().mockResolvedValue(true)
                    })
                })
            })),
            add: jest.fn().mockResolvedValue({ id: 'new-approval-id' }),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(true)
            })
        }
    }))
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mock-uuid-123')
}));

describe('Approvals Service', () => {
    describe('createApprovalRequest', () => {
        it('should create approval request and return id', async () => {
            // New signature: (tenantId, toolName, inputs, actorId, actorRole)
            const result = await createApprovalRequest(
                'tenant-1',
                'marketing.send',
                { campaignId: 'camp-1' },
                'user-1',
                'brand'
            );

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
            // The service returns the full doc data which has { result, timestamp, expiresAt }
            expect(result?.result).toEqual({ cached: true });
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
