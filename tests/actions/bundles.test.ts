
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

    describe('Bundle Scheduling', () => {
        it('persists startDate and endDate for scheduled bundles', async () => {
            const now = new Date();
            const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week

            const bundleData = {
                name: 'Scheduled Bundle',
                orgId: 'org123',
                type: 'bogo' as const,
                status: 'scheduled' as const,
                startDate,
                endDate,
            };

            const result = await createBundle(bundleData);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                startDate: expect.any(Date),
                endDate: expect.any(Date),
                status: 'scheduled',
            }));
        });

        it('fetches bundles ordered by createdAt desc', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'b1',
                        data: () => ({
                            name: 'Bundle 1',
                            orgId: 'org123',
                            createdAt: new Date('2026-02-20'),
                            updatedAt: new Date('2026-02-20'),
                        })
                    },
                    {
                        id: 'b2',
                        data: () => ({
                            name: 'Bundle 2',
                            orgId: 'org123',
                            createdAt: new Date('2026-02-15'),
                            updatedAt: new Date('2026-02-15'),
                        })
                    }
                ]
            });

            const result = await getBundles('org123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
        });

        it('converts Firestore Timestamps to ISO strings', async () => {
            const firestoreTimestamp = {
                toDate: () => new Date('2026-02-20T10:00:00Z'),
            };

            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'b1',
                        data: () => ({
                            name: 'Bundle 1',
                            orgId: 'org123',
                            startDate: firestoreTimestamp,
                            endDate: firestoreTimestamp,
                            createdAt: firestoreTimestamp,
                            updatedAt: firestoreTimestamp,
                        })
                    }
                ]
            });

            const result = await getBundles('org123');

            expect(result.success).toBe(true);
            expect(result.data?.[0].startDate).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
            expect(result.data?.[0].endDate).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
        });
    });

    describe('Bundle Redemption Tracking', () => {
        it('initializes bundle with zero current redemptions', async () => {
            const bundleData = {
                name: 'Redemption Test',
                orgId: 'org123',
                type: 'percentage' as const,
                status: 'active' as const,
            };

            const result = await createBundle(bundleData);

            expect(result.success).toBe(true);
            expect(result.data?.currentRedemptions).toBe(0);
        });

        it('increments current redemptions on bundle update', async () => {
            const updateData = {
                currentRedemptions: 5,
            };

            const result = await updateBundle('b1', updateData);

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                currentRedemptions: 5,
            }));
        });

        it('includes perCustomerLimit in bundle data', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'b1',
                        data: () => ({
                            name: 'Limited Bundle',
                            orgId: 'org123',
                            perCustomerLimit: 3,
                            currentRedemptions: 2,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                    }
                ]
            });

            const result = await getBundles('org123');

            expect(result.success).toBe(true);
            expect(result.data?.[0].perCustomerLimit).toBe(3);
            expect(result.data?.[0].currentRedemptions).toBe(2);
        });

        it('updates redemption count atomically with updatedAt timestamp', async () => {
            const updateData = {
                currentRedemptions: 10,
            };

            await updateBundle('b1', updateData);

            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                currentRedemptions: 10,
                updatedAt: expect.any(Date),
            }));
        });
    });

    describe('Bundle Savings Calculation', () => {
        it('stores original total and bundle price for savings calculation', async () => {
            const bundleData = {
                name: 'Deal',
                orgId: 'org123',
                type: 'fixed_price' as const,
                originalTotal: 100,
                bundlePrice: 79.99,
                savingsAmount: 20.01,
                savingsPercent: 20,
            };

            const result = await createBundle(bundleData);

            expect(result.success).toBe(true);
            expect(result.data?.originalTotal).toBe(100);
            expect(result.data?.bundlePrice).toBe(79.99);
            expect(result.data?.savingsPercent).toBe(20);
        });

        it('fetches bundle products with pricing info', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'b1',
                        data: () => ({
                            name: 'Bundle',
                            orgId: 'org123',
                            products: [
                                { id: 'p1', name: 'Product 1', originalPrice: 50, bundlePrice: 40 },
                                { id: 'p2', name: 'Product 2', originalPrice: 50, bundlePrice: 40 },
                            ],
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                    }
                ]
            });

            const result = await getBundles('org123');

            expect(result.success).toBe(true);
            expect(result.data?.[0].products).toHaveLength(2);
        });
    });
});
