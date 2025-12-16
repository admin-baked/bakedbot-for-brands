
import { PageGeneratorService } from '@/server/services/page-generator';
import { CannMenusService } from '@/server/services/cannmenus';
import { createServerClient } from '@/firebase/server-client';

// Mocks
jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn().mockImplementation(() => ({
        findRetailers: jest.fn(),
        searchProducts: jest.fn()
    }))
}));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    apps: [],
    credential: {
        cert: jest.fn()
    }
}));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn()
    }
}));

describe('PageGeneratorService', () => {
    let service: PageGeneratorService;
    let mockCannMenus: jest.Mocked<CannMenusService>;
    let mockFirestore: any;
    let mockBatch: any;

    beforeEach(() => {
        service = new PageGeneratorService();
        mockCannMenus = (service as any).cannMenus; // Access private property or mock prototype

        // Mock Firestore
        mockBatch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined)
        };
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            batch: jest.fn().mockReturnValue(mockBatch)
        };
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

        // Mock CannMenus responses
        mockCannMenus.findRetailers.mockResolvedValue([
            { id: 101, name: 'Test Disp 1', city: 'Test City', state: 'TS' },
            { id: 102, name: 'Test Disp 2', city: 'Test City', state: 'TS' }
        ]);

        mockCannMenus.searchProducts.mockResolvedValue({
            products: [
                { brand_name: 'Test Brand 1' } as any,
                { brand_name: 'Test Brand 2' } as any
            ]
        });

        // Mock fetch (for geocoding)
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => [{ lat: '123', lon: '456' }]
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('scanAndGenerateDispensaries creates pages', async () => {
        const result = await service.scanAndGenerateDispensaries({ limit: 10, dryRun: false });

        expect(result.success).toBe(true);
        expect(result.itemsFound).toBe(10); // 5 zips * 2 items each? No, loop over SEED_ZIPS (5 CA, 5 NY..)
        // SEED_ZIPS length is 15. Limit 10 -> 10 ZIPS.
        // For each ZIP, we find 2 retailers. Total 20 items.
        expect(result.itemsFound).toBe(20);

        expect(mockBatch.set).toHaveBeenCalled();
        expect(mockBatch.commit).toHaveBeenCalled();
    });

    test('dry run does not commit to firestore', async () => {
        const result = await service.scanAndGenerateDispensaries({ limit: 1, dryRun: true });

        expect(result.success).toBe(true);
        expect(mockBatch.commit).not.toHaveBeenCalled();
    });
});
