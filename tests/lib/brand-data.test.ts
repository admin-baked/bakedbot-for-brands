import { fetchBrandPageData } from '@/lib/brand-data';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: {
        getRetailersForBrand: jest.fn(),
    },
}));

describe('fetchBrandPageData Mock Fallback', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return mock data for brand_ecstatic_edibles when firestore auth fails', async () => {
        // Mock firestore to throw UNAUTHENTICATED error
        const mockFirestoreError = new Error('UNAUTHENTICATED');
        (mockFirestoreError as any).code = 16;

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: jest.fn().mockImplementation(() => {
                    throw mockFirestoreError;
                })
            }
        });

        const result = await fetchBrandPageData('brand_ecstatic_edibles');

        expect(result.brand).toBeDefined();
        expect(result.brand?.id).toBe('brand_ecstatic_edibles');
        expect(result.brand?.purchaseModel).toBe('online_only'); // D2C
        expect(result.brand?.theme?.primaryColor).toBe('#e11d48'); // Rose-600

        expect(result.products).toHaveLength(2);
        expect(result.products[0].name).toBe('Snickerdoodle Bites');

        expect(result.retailers).toHaveLength(0);
    });

    it('should throw or return null for unknown brand when auth fails', async () => {
        // Mock firestore to throw UNAUTHENTICATED error
        const mockFirestoreError = new Error('UNAUTHENTICATED');
        (mockFirestoreError as any).code = 16;

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: jest.fn().mockImplementation(() => {
                    throw mockFirestoreError;
                })
            }
        });

        // The current implementation returns the error result in the catch block if not the special brand
        // Wait, looking at the code:
        /*
        } catch (error: any) {
            // ... logs ...
            if (brandParam === 'brand_ecstatic_edibles') {
                return { ... }
            }
            throw error; // This is what it does for other brands
        }
        */

        const result = await fetchBrandPageData('unknown_brand');
        expect(result.brand).toBeNull();
        expect(result.products).toHaveLength(0);
    });
});
