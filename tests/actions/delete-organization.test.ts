import { deleteBrand, deleteDispensary, getAllBrands, getAllDispensaries } from '@/server/actions/delete-organization';
import { adminDb } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';
import { isSuperUser } from '@/server/actions/delete-account';

// Mock dependencies
jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    adminDb: {
        collection: jest.fn(),
        batch: jest.fn(),
    },
}));

jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn(),
}));

jest.mock('@/server/actions/delete-account', () => ({
    isSuperUser: jest.fn(),
}));

describe('delete-organization actions', () => {
    const mockBatch = {
        delete: jest.fn(),
        update: jest.fn(),
        commit: jest.fn(),
    };

    const mockOrgRef = {
        collection: jest.fn(),
    };

    const mockDoc = jest.fn(() => mockOrgRef);

    beforeEach(() => {
        jest.clearAllMocks();
        (adminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });
        (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
        mockBatch.commit.mockResolvedValue(undefined);
        (isSuperUser as jest.Mock).mockResolvedValue(true);
        (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
    });

    describe('deleteBrand', () => {
        beforeEach(() => {
            // Mock subcollections listDocuments
            mockOrgRef.collection.mockReturnValue({
                listDocuments: jest.fn().mockResolvedValue([]),
            });

            // Mock other collections
            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                const mockWhere = jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                }));
                return {
                    doc: mockDoc,
                    where: mockWhere,
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                };
            });
        });

        it('should successfully delete a brand', async () => {
            const result = await deleteBrand('brand123');

            expect(isSuperUser).toHaveBeenCalledWith('superuser123');
            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('should reject unauthorized users', async () => {
            (isSuperUser as jest.Mock).mockResolvedValue(false);

            const result = await deleteBrand('brand123');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unauthorized');
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });

        it('should delete associated SEO pages, claims, and products', async () => {
            const mockPages = [{ ref: { path: 'seo_pages/1' } }];
            const mockClaims = [{ ref: { path: 'claims/1' } }];
            const mockProducts = [{ ref: { path: 'products/1' } }];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                let docs: any[] = [];
                if (name === 'seo_pages') docs = mockPages;
                if (name === 'claims') docs = mockClaims;
                if (name === 'products') docs = mockProducts;

                return {
                    doc: mockDoc,
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ docs }),
                    })),
                };
            });

            await deleteBrand('brand123');

            // Should delete brand ref + subdocs (mocked as 0) + pages + claims + products
            // Brand ref (1) + pages (1) + claims (1) + products (1) = 4 calls
            expect(mockBatch.delete).toHaveBeenCalledTimes(4);
        });

        it('should update users associated with the brand', async () => {
            const mockUsers = [
                {
                    ref: { path: 'users/1' },
                    data: () => ({
                        organizationIds: ['brand123', 'otherOrg'],
                        brandId: 'brand123',
                        currentOrgId: 'brand123',
                    }),
                },
            ];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === 'users') {
                    return {
                        where: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ docs: mockUsers }),
                        })),
                    };
                }
                return {
                    doc: mockDoc,
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                    })),
                };
            });

            await deleteBrand('brand123');

            expect(mockBatch.update).toHaveBeenCalledWith(
                mockUsers[0].ref,
                expect.objectContaining({
                    organizationIds: ['otherOrg'],
                    brandId: null,
                    currentOrgId: 'otherOrg',
                })
            );
        });
    });

    describe('deleteDispensary', () => {
        beforeEach(() => {
            mockOrgRef.collection.mockReturnValue({
                listDocuments: jest.fn().mockResolvedValue([]),
            });

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                return {
                    doc: mockDoc,
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                    })),
                };
            });
        });

        it('should successfully delete a dispensary', async () => {
            const result = await deleteDispensary('disp123');

            expect(result).toEqual({ success: true });
            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should delete associated SEO pages and claims but NOT products (directly)', async () => {
            const mockPages = [{ ref: { path: 'seo_pages/1' } }];
            const mockClaims = [{ ref: { path: 'claims/1' } }];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                let docs: any[] = [];
                if (name === 'seo_pages') docs = mockPages;
                if (name === 'claims') docs = mockClaims;
                
                return {
                    doc: mockDoc,
                    where: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ docs }),
                    })),
                };
            });

            await deleteDispensary('disp123');

            // Brand ref (1) + pages (1) + claims (1) = 3 calls
            expect(mockBatch.delete).toHaveBeenCalledTimes(3);
        });
    });

    describe('getAllBrands', () => {
        it('should return list of brands with page counts', async () => {
            const mockBrands = [
                {
                    id: 'brand1',
                    data: () => ({ name: 'Brand One', claimed: true }),
                },
            ];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === 'brands') {
                    return { get: jest.fn().mockResolvedValue({ docs: mockBrands }) };
                }
                if (name === 'seo_pages') {
                    return {
                        where: jest.fn(() => ({
                            count: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    data: () => ({ count: 5 }),
                                }),
                            })),
                        })),
                    };
                }
                return {};
            });

            const result = await getAllBrands();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 'brand1',
                name: 'Brand One',
                claimed: true,
                pageCount: 5,
            });
        });

        it('should throw error for non-super users', async () => {
            (isSuperUser as jest.Mock).mockResolvedValue(false);
            await expect(getAllBrands()).rejects.toThrow('Unauthorized');
        });
    });

    describe('getAllDispensaries', () => {
        it('should return list of dispensaries with page counts', async () => {
            const mockRetailers = [
                {
                    id: 'disp1',
                    data: () => ({ name: 'Disp One', claimed: false }),
                },
            ];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === 'retailers') {
                    return { get: jest.fn().mockResolvedValue({ docs: mockRetailers }) };
                }
                if (name === 'seo_pages') {
                    return {
                        where: jest.fn(() => ({
                            count: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    data: () => ({ count: 10 }),
                                }),
                            })),
                        })),
                    };
                }
                return {};
            });

            const result = await getAllDispensaries();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 'disp1',
                name: 'Disp One',
                claimed: false,
                pageCount: 10,
            });
        });
    });
});
