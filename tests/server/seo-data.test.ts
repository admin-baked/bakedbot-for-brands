
import { fetchBrandPageData } from '@/lib/brand-data';
import { fetchDispensaryPageData } from '@/lib/dispensary-data';

// Mock Firestore
const mockGet = jest.fn();
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn(() => ({ limit: mockLimit, where: mockWhere })); // Recursive for multiple wheres
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc, where: mockWhere }));
const mockFirestore = {
    collection: mockCollection,
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({ firestore: mockFirestore })),
}));

// Mock CannMenusService
jest.mock('@/server/services/cannmenus', () => {
    return {
        CannMenusService: jest.fn().mockImplementation(() => ({
            findRetailersCarryingBrand: jest.fn().mockResolvedValue([]),
        })),
    };
});

describe('SEO Data Fetching', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchBrandPageData', () => {
        it('should fetch brand data by slug if doc exists', async () => {
            // Mock brand doc exists
            mockGet.mockResolvedValueOnce({
                exists: true,
                id: 'test-brand',
                data: () => ({ name: 'Test Brand', slug: 'test-brand' })
            });
            // Mock products query empty
            mockGet.mockResolvedValueOnce({ empty: true });
            // Mock products query snake_case empty
            mockGet.mockResolvedValueOnce({ empty: true });

            const { brand } = await fetchBrandPageData('test-brand');
            expect(brand).not.toBeNull();
            expect(brand?.name).toBe('Test Brand');
        });

        it('should return null if brand not found', async () => {
            // Mock brand doc does not exist
            mockGet.mockResolvedValueOnce({ exists: false });
            // Mock slug query empty
            mockGet.mockResolvedValueOnce({ empty: true });

            const { brand } = await fetchBrandPageData('non-existent');
            expect(brand).toBeNull();
        });
    });

    describe('fetchDispensaryPageData', () => {
        it('should fetch dispensary and products by slug', async () => {
            // Mock retailers query by slug found
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'dispensary-1',
                    data: () => ({ name: 'Test Dispensary', slug: 'test-dispensary' })
                }]
            });

            // Mock products query found
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'prod-1',
                    data: () => ({ name: 'Test Product', retailerIds: ['dispensary-1'] })
                }]
            });

            const { retailer, products } = await fetchDispensaryPageData('test-dispensary');

            expect(retailer).not.toBeNull();
            expect(retailer?.name).toBe('Test Dispensary');
            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('Test Product');
        });

        it('should return null if dispensary not found', async () => {
            // Mock retailers query empty
            mockGet.mockResolvedValueOnce({ empty: true });
            // Mock retailers doc get not exists
            mockGet.mockResolvedValueOnce({ exists: false });

            const { retailer } = await fetchDispensaryPageData('non-existent');
            expect(retailer).toBeNull();
        });
    });
});
