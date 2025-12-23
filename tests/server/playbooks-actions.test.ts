
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

describe('playbook actions', () => {
    let mockFirestore: any;
    let mockBatch: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBatch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn(),
            update: jest.fn().mockResolvedValue({ success: true }),
            batch: jest.fn().mockReturnValue(mockBatch),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user123' });
    });

    describe('listBrandPlaybooks', () => {
        it('should seed default playbooks if none exist', async () => {
            mockFirestore.get.mockResolvedValueOnce({ empty: true });

            const result = await listBrandPlaybooks('brand123');

            expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
            expect(mockFirestore.doc).toHaveBeenCalledWith('brand123');
            expect(mockFirestore.collection).toHaveBeenCalledWith('playbooks');
            expect(mockBatch.set).toHaveBeenCalledTimes(DEFAULT_PLAYBOOKS.length);
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
            mockFirestore.get.mockResolvedValueOnce(mockSnap);

            const result = await listBrandPlaybooks('brand123');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('pb1');
            expect(result[0].createdAt).toEqual(mockDate);
            expect(result[0].updatedAt).toEqual(mockDate);
        });

        it('should throw error if brandId is missing', async () => {
            await expect(listBrandPlaybooks('')).rejects.toThrow('Brand ID is required');
        });
    });

    describe('togglePlaybookStatus', () => {
        it('should update playbook status to active', async () => {
            await togglePlaybookStatus('brand123', 'pb1', true);

            expect(mockFirestore.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'active',
            }));
        });

        it('should update playbook status to paused', async () => {
            await togglePlaybookStatus('brand123', 'pb1', false);

            expect(mockFirestore.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'paused',
            }));
        });
    });

    describe('runPlaybookTest', () => {
        it('should increment runCount', async () => {
            const result = await runPlaybookTest('brand123', 'pb1');

            expect(result.success).toBe(true);
            expect(mockFirestore.update).toHaveBeenCalledWith(expect.objectContaining({
                runCount: expect.anything(), // FieldValue.increment is complex to match exactly
            }));
        });
    });
});
