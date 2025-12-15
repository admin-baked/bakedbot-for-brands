
import { fetchBrandPageData, fetchLocalBrandPageData } from '@/lib/brand-data';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';

// Mock modules
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn()
}));

describe('brand-data', () => {
    // Shared mock functions
    const mockGet = jest.fn();
    const mockLimit = jest.fn().mockReturnThis();
    const mockWhere = jest.fn().mockReturnThis();
    const mockCollection = jest.fn().mockReturnThis();
    const mockDoc = jest.fn().mockReturnThis();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore chain behavior
        mockCollection.mockReturnValue({
            doc: mockDoc,
            where: mockWhere,
            limit: mockLimit,
            get: mockGet
        });

        // Setup createServerClient mock return value
        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection
            }
        });

        // Setup CannMenusService default mock
        (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
            findRetailersCarryingBrand: jest.fn().mockResolvedValue([]),
            searchProducts: jest.fn().mockResolvedValue({ products: [] })
        }));
    });

    describe('fetchBrandPageData', () => {
        it('should fetch brand by ID if doc exists', async () => {
            // Setup mock for brand doc
            mockDoc.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'brand-123',
                    data: () => ({ name: 'Test Brand', slug: 'test-brand', logoUrl: '/logo.png' })
                })
            });

            // Setup mock for products query
            mockWhere.mockReturnThis();
            mockGet.mockResolvedValueOnce({ empty: true });

            const result = await fetchBrandPageData('brand-123');

            expect(result.brand).toBeDefined();
            expect(result.brand?.id).toBe('brand-123');
            expect(result.brand?.name).toBe('Test Brand');
        });

        it('should return null if brand not found', async () => {
            // ID lookup fails
            mockDoc.mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false }) });

            // Slug lookup fails
            mockWhere.mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ empty: true })
                })
            });

            const result = await fetchBrandPageData('non-existent');
            expect(result.brand).toBeNull();
        });
    });

    describe('fetchLocalBrandPageData', () => {
        it('should fetch local brand data with retailers', async () => {
            // Mock Brand Found
            mockDoc.mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: 'brand-123',
                    data: () => ({ name: 'Test Brand', slug: 'test-brand' })
                })
            });

            // Specific mock for CannMenusService.searchProducts
            const mockSearchProducts = jest.fn().mockResolvedValue({
                products: [
                    {
                        product_name: 'Product 1',
                        retailer: 'Retailer A',
                        retailer_id: 'ret-1',
                        city: 'Detroit',
                        state: 'MI'
                    },
                    {
                        product_name: 'Product 2',
                        retailer: 'Retailer B', // No ID
                        city: 'Detroit',
                        state: 'MI'
                    }
                ]
            });

            (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
                searchProducts: mockSearchProducts
            }));

            const result = await fetchLocalBrandPageData('test-brand', '48201');

            expect(result.brand).toBeDefined();
            // Should have 2 retailers
            expect(result.retailers.length).toBe(2);

            // Check retailer names
            const names = result.retailers.map((r: any) => r.name);
            expect(names).toContain('Retailer A');
            expect(names).toContain('Retailer B');

            // Check mocked missing count exists
            expect(typeof result.missingCount).toBe('number');
        });
    });
});
