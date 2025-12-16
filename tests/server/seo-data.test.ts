
import { fetchBrandPageData } from '@/lib/brand-data';
import { fetchDispensaryPageData } from '@/lib/dispensary-data';
import { fetchCityPageData } from '@/lib/city-data';
import { fetchStatePageData } from '@/lib/state-data';

// Mock Firestore
const mockGet = jest.fn();
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockOrderBy = jest.fn(() => ({ limit: mockLimit, get: mockGet })); // Add orderBy
const mockWhere = jest.fn(() => ({ limit: mockLimit, where: mockWhere, get: mockGet, orderBy: mockOrderBy }));
const mockDoc: any = jest.fn(() => ({ get: mockGet, collection: mockCollection })); // doc() returns get() AND collection()
const mockCollection: any = jest.fn(() => ({ doc: mockDoc, where: mockWhere, limit: mockLimit, get: mockGet, orderBy: mockOrderBy })); // Recursive
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

    describe('fetchCityPageData', () => {
        it('should fetch city data and dispensaries', async () => {
            // Mock City Page Config found
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ name: 'Test City', state: 'CA', slug: 'test-city' })
            });

            // Mock Retailers in City found
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'dispensary-1',
                    data: () => ({ name: 'Dispensary 1', city: 'Test City', state: 'CA' })
                }, {
                    id: 'dispensary-2',
                    data: () => ({ name: 'Dispensary 2', city: 'Test City', state: 'CA' })
                }]
            });

            const { city, dispensaries } = await fetchCityPageData('test-city');

            expect(city).not.toBeNull();
            expect(city?.name).toBe('Test City');
            expect(dispensaries).toHaveLength(2);
        });

        it('should fallback to dispensary_pages collection if main retailer scan empty', async () => {
            // Mock City Page Config found
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ name: 'Test City', state: 'CO' })
            });

            // Mock Retailers Main Query Empty
            mockGet.mockResolvedValueOnce({ empty: true });

            // Mock Dispensary Pages Query Found
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'page-1',
                    data: () => ({ retailerId: 'r1', name: 'Page Dispensary', city: 'Test City', state: 'CO' })
                }]
            });

            const { dispensaries } = await fetchCityPageData('test-city');
            expect(dispensaries).toHaveLength(1);
            expect(dispensaries[0].name).toBe('Page Dispensary');
        });
    });

    describe('fetchStatePageData', () => {
        it('should fetch state data and top cities', async () => {
            // Mock State Page Config found
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ name: 'California', slug: 'state_california' })
            });

            // Mock Cities in State found
            mockGet.mockResolvedValueOnce({
                docs: [{
                    data: () => ({ name: 'Los Angeles', slug: 'city_la', dispensaryCount: 50 })
                }, {
                    data: () => ({ name: 'San Francisco', slug: 'city_sf', dispensaryCount: 30 })
                }]
            });

            const stateData = await fetchStatePageData('state_california');

            expect(stateData).not.toBeNull();
            expect(stateData?.name).toBe('California');
            expect(stateData?.topCities).toHaveLength(2);
            expect(stateData?.topCities[0].name).toBe('Los Angeles');
        });

        it('should return null if state config not found', async () => {
            // Mock State Page Config NOT found
            mockGet.mockResolvedValueOnce({ exists: false });

            const stateData = await fetchStatePageData('state_unknown');
            expect(stateData).toBeNull();
        });
    });
});
