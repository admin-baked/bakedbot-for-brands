
import { seedSeoPageAction, getSeoPagesAction, deleteSeoPageAction } from '@/app/dashboard/ceo/actions';
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { getZipCodeCoordinates, getRetailersByZipCode, discoverNearbyProducts } from '@/server/services/geo-discovery';

// Mocks
jest.mock('@/firebase/server-client');
jest.mock('@/firebase/admin');
jest.mock('@/server/auth/auth');
jest.mock('@/server/services/geo-discovery');

// Mock heavily dependent modules to avoid side-effects
jest.mock('@/ai/flows/update-product-embeddings', () => ({
    updateProductEmbeddings: jest.fn()
}));
jest.mock('@/server/jobs/seo-generator', () => ({
    runChicagoPilotJob: jest.fn()
}));
jest.mock('@/server/jobs/brand-discovery-job', () => ({
    runBrandPilotJob: jest.fn()
}));
jest.mock('@/server/actions/cannmenus', () => ({
    searchCannMenusRetailers: jest.fn()
}));
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn()
}));
jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn()
}));
jest.mock('@/server/services/vector-search/rag-service', () => ({
    queryRag: jest.fn()
}));

// Mock Next.js headers/cache
jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({ get: jest.fn() }))
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

describe('Foot Traffic Actions', () => {
    const mockFirestore = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn(),
        set: jest.fn(),
        add: jest.fn(),
        delete: jest.fn(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        batch: jest.fn().mockReturnValue({
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(true)
        })
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test_admin', role: 'super_admin' });
    });

    describe('seedSeoPageAction', () => {
        it('should create an SEO page and sync retailers', async () => {
            // Mock Geo Data
            (getZipCodeCoordinates as jest.Mock).mockResolvedValue({ lat: 34.05, lng: -118.25, city: 'Los Angeles', state: 'CA' });

            // Mock Retailers
            const mockRetailers = [{
                id: 'disp1',
                name: 'Test Disp',
                city: 'Los Angeles',
                state: 'CA',
                slug: 'test-disp'
            }];
            (getRetailersByZipCode as jest.Mock).mockResolvedValue(mockRetailers);

            // Mock Discovery (Pass)
            (discoverNearbyProducts as jest.Mock).mockResolvedValue({
                totalProducts: 10,
                products: [{ id: 'p1', name: 'Product 1', price: 50, availability: [{ retailerName: 'Test Disp' }] }]
            });

            // Mock Existing Org Check (Not Found -> Create)
            mockFirestore.get.mockResolvedValueOnce({ exists: false }); // Org check

            const result = await seedSeoPageAction({ zipCode: '90001' });

            expect(result.error).toBeUndefined();
            expect(getZipCodeCoordinates).toHaveBeenCalledWith('90001');
            expect(mockFirestore.batch).toHaveBeenCalled(); // Should commit batch
        });

        it('should survive product discovery failure', async () => {
            // Mock Geo Data
            (getZipCodeCoordinates as jest.Mock).mockResolvedValue({ lat: 34.05, lng: -118.25, city: 'Los Angeles', state: 'CA' });
            (getRetailersByZipCode as jest.Mock).mockResolvedValue([]);

            // Mock Discovery (Fail)
            (discoverNearbyProducts as jest.Mock).mockRejectedValue(new Error('API Timeout'));

            const result = await seedSeoPageAction({ zipCode: '90002' });

            // Should still succeed, just with 0 products
            expect(result).not.toHaveProperty('error', true);
            expect(mockFirestore.collection).toHaveBeenCalledWith('foot_traffic');
        });
    });

    describe('getSeoPagesAction', () => {
        it('should return a list of pages', async () => {
            const mockDocs = [{
                id: '90001',
                data: () => ({
                    zipCode: '90001',
                    city: 'LA',
                    published: true,
                    metrics: { pageViews: 100 }
                })
            }];

            // Mock collection queries (zip_pages + dispensary_pages)
            mockFirestore.get.mockResolvedValue({ docs: mockDocs });

            const pages = await getSeoPagesAction();
            expect(pages).toHaveLength(2); // Mock returns same list for both queries in this simple mock
            expect(pages[0].zipCode).toBe('90001');
        });
    });

    describe('deleteSeoPageAction', () => {
        it('should delete a page via batch', async () => {
            const result = await deleteSeoPageAction('90001');
            // Expect 2 delete calls (zip_pages + seo_pages)
            expect(mockFirestore.delete).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ message: 'Successfully deleted page for 90001' });
        });
    });
});
