
import { createBundle, getBundles, updateBundle, deleteBundle } from '../../src/app/actions/bundles';
import { getAdminFirestore } from '@/firebase/admin';

// Mock UUID to avoid ESM transformation issues
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-123',
}));

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

// Mock Next Cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

describe('Bundle Actions', () => {
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockSet: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockDelete: jest.Mock;
    let mockGet: jest.Mock;
    let mockWhere: jest.Mock;
    let mockOrderBy: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mocks
        mockSet = jest.fn().mockResolvedValue({});
        mockUpdate = jest.fn().mockResolvedValue({});
        mockDelete = jest.fn().mockResolvedValue({});
        mockGet = jest.fn();
        mockWhere = jest.fn().mockReturnThis();
        mockOrderBy = jest.fn().mockReturnThis();

        mockDoc = jest.fn((id) => ({
            set: mockSet,
            update: mockUpdate,
            delete: mockDelete,
            get: mockGet,
        }));

        mockCollection = jest.fn((name) => ({
            doc: mockDoc,
            where: mockWhere,
            orderBy: mockOrderBy,
            get: mockGet,
            add: jest.fn(),
        }));

        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: mockCollection,
        });
    });

    describe('createBundle', () => {
        it('should create a bundle with valid data', async () => {
            const bundleData = {
                name: 'Test Bundle',
                orgId: 'org123',
                type: 'bogo' as const,
                status: 'draft' as const,
            };

            const result = await createBundle(bundleData);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.name).toBe('Test Bundle');
            expect(result.data?.id).toBe('test-uuid-123'); // From mock

            expect(mockCollection).toHaveBeenCalledWith('bundles');
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Bundle',
                type: 'bogo',
                status: 'draft',
            }));
        });
    });

    describe('getBundles', () => {
        it('should fetch bundles for org', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'b1',
                        data: () => ({
                            name: 'Bundle 1',
                            orgId: 'org123',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    }
                ]
            });

            const result = await getBundles('org123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data![0].name).toBe('Bundle 1');
            expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org123');
        });
    });

    describe('updateBundle', () => {
        it('should update bundle', async () => {
            const result = await updateBundle('b1', { name: 'Updated' });
            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('b1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
        });
    });

    describe('deleteBundle', () => {
        it('should delete bundle', async () => {
            const result = await deleteBundle('b1');
            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('b1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
