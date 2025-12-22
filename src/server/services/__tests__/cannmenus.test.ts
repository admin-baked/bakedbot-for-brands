import { CannMenusService } from '../cannmenus';
import { createServerClient } from '@/firebase/server-client';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid'
}));

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/lib/retry-utility', () => ({
    withRetry: (fn: any) => fn(),
    RateLimiter: jest.fn().mockImplementation(() => ({
        schedule: (fn: any) => fn()
    }))
}));
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    },
    reportError: jest.fn(),
    monitorApiCall: (name: any, fn: any) => fn(),
    perfMonitor: {
        start: jest.fn(),
        end: jest.fn()
    }
}));
jest.mock('@/lib/plan-limits', () => ({
    getPlanLimits: jest.fn().mockReturnValue({ maxRetailers: 10, maxProducts: 100 })
}));
jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn()
    }
}));
jest.mock('@/lib/config', () => ({
    CANNMENUS_CONFIG: {
        API_KEY: 'mock_key',
        API_BASE: 'https://api.mock.com'
    }
}));

describe('CannMenusService', () => {
    let service: CannMenusService;
    const mockFirestore = {
        collection: jest.fn(),
        batch: jest.fn().mockReturnValue({
            set: jest.fn(),
            update: jest.fn(),
            commit: jest.fn(),
        })
    };
    const mockDoc = jest.fn();
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc, add: jest.fn() });
        mockDoc.mockReturnValue({
            get: mockGet,
            set: mockSet,
            update: mockUpdate,
            collection: jest.fn().mockReturnValue({ add: jest.fn() })
        });

        service = new CannMenusService();
    });

    // Mock syncRetailerMenu to avoid real API calls
    beforeEach(() => {
        // We mock the private method by casting or prototype
        // Actually, since we want to test syncDispensaryInventory which CALLS syncRetailerMenu, 
        // we should probably mock the network call inside syncRetailerMenu or mock fetch/axios if used.
        // Looking at the file, it uses 'fetch'.
        global.fetch = jest.fn() as any;
    });

    describe('syncDispensaryInventory', () => {
        it('should sync successfully', async () => {
            // Mock API response for search (step 1 inside syncRetailerMenu if necessary? No, assumes retailerId is known)
            // Wait, syncRetailerMenu implementation fetches products.
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: {
                        data: [
                            {
                                products: [
                                    {
                                        product_name: 'Product 1',
                                        cann_sku_id: 'sku1',
                                        category: 'Edibles',
                                        latest_price: 20
                                    },
                                    {
                                        product_name: 'Product 2',
                                        cann_sku_id: 'sku2',
                                        category: 'Flower',
                                        latest_price: 35
                                    }
                                ]
                            }
                        ]
                    }
                })
            });

            // Mock createSyncStatus to return a mock ID
            jest.spyOn(service as any, 'createSyncStatus').mockResolvedValue('sync_123');
            jest.spyOn(service as any, 'completeSyncStatus').mockResolvedValue(true);

            const result = await service.syncDispensaryInventory(
                'retailer_123',
                'Test Dispensary',
                'loc_123'
            );

            expect(result.success).toBe(true);
            expect(result.productsProcessed).toBe(2);
            expect(result.retailersProcessed).toBe(1);
        });

        it('should handle failure', async () => {
            // Mock failure
            jest.spyOn(service as any, 'createSyncStatus').mockResolvedValue('sync_123');
            jest.spyOn(service as any, 'failSyncStatus').mockResolvedValue(true);

            // Mock error in network
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

            const result = await service.syncDispensaryInventory(
                'retailer_123',
                'Test Dispensary',
                'loc_123'
            );

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Network Error');
        });
    });
});
