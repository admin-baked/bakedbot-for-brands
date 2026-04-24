
import { listBrandPlaybooks, togglePlaybookStatus, runPlaybookTest } from '@/server/actions/playbooks';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('server-only', () => ({}));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: { increment: jest.fn((n) => ({ _increment: n })), serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })) },
}));

describe('playbook actions', () => {
    let mockFirestore: any;
    let mockBatch: any;
    let mockDocRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBatch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        mockDocRef = {
            id: 'doc-id',
            get: jest.fn().mockResolvedValue({ exists: true, id: 'pb1', data: () => ({ name: 'Test', ownerId: 'user123', status: 'active', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) }),
            update: jest.fn().mockResolvedValue(undefined),
            collection: jest.fn(),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnValue(mockDocRef),
            get: jest.fn().mockResolvedValue({ empty: false, size: 0, docs: [] }),
            batch: jest.fn().mockReturnValue(mockBatch),
        };
        mockDocRef.collection = jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue(mockDocRef),
            get: jest.fn().mockResolvedValue({ empty: false, size: 0, docs: [] }),
        });

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        // super_user bypasses assertBrandAccess and canEditPlaybook
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user123', role: 'super_user' });
    });

    describe('listBrandPlaybooks', () => {
        it('should seed default playbooks if none exist', async () => {
            mockDocRef.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDocRef),
                get: jest.fn().mockResolvedValue({ empty: true }),
            });

            const result = await listBrandPlaybooks('brand123');

            expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(result).toHaveLength(DEFAULT_PLAYBOOKS.length);
            expect(result[0]).toHaveProperty('id');
            expect(result[0].status).toBe('active');
        });

        it('should return existing playbooks with formatted dates', async () => {
            const mockDate = new Date('2024-01-01');
            const mockSnap = {
                empty: false,
                size: 1,
                docs: [
                    {
                        id: 'pb1',
                        data: () => ({
                            name: 'Test Playbook',
                            createdAt: { toDate: () => mockDate },
                            updatedAt: { toDate: () => mockDate },
                        }),
                    },
                ],
            };
            mockDocRef.collection.mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDocRef),
                get: jest.fn().mockResolvedValue(mockSnap),
            });

            const result = await listBrandPlaybooks('brand123');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('pb1');
        });

        it('should return empty array if brandId is missing', async () => {
            // listBrandPlaybooks catches errors and returns []
            const result = await listBrandPlaybooks('');
            expect(result).toEqual([]);
        });
    });

    describe('togglePlaybookStatus', () => {
        it('should update playbook status to active', async () => {
            const result = await togglePlaybookStatus('brand123', 'pb1', true);

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'active',
            }));
        });

        it('should update playbook status to paused', async () => {
            const result = await togglePlaybookStatus('brand123', 'pb1', false);

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'paused',
            }));
        });
    });

    describe('runPlaybookTest', () => {
        it('should increment runCount', async () => {
            const result = await runPlaybookTest('brand123', 'pb1');

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                runCount: expect.anything(),
            }));
        });
    });
});
