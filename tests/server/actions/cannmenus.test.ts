
import { CannMenusService } from '@/server/services/cannmenus';
import { createServerClient } from '@/firebase/server-client';
import { UsageService } from '@/server/services/usage';
import * as monitor from '@/lib/monitoring';

// Mock Dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn()
    }
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    reportError: jest.fn(),
    monitorApiCall: jest.fn((name, fn) => fn()), // Pass through
    perfMonitor: {
        start: jest.fn(),
        end: jest.fn()
    }
}));

// Mock retry utility to avoid delays/timeouts in tests
jest.mock('@/lib/retry-utility', () => ({
    withRetry: jest.fn((fn) => fn()),
    RateLimiter: jest.fn().mockImplementation(() => ({
        execute: jest.fn((fn) => fn())
    }))
}));

jest.mock('@/lib/plan-limits', () => ({
    getPlanLimits: jest.fn().mockReturnValue({ maxRetailers: 10, maxProducts: 50 })
}));

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-123'
}));

// Global Fetch Mock
global.fetch = jest.fn();

describe('CannMenusService', () => {
    let service: CannMenusService;
    let mockFirestore: any;
    let mockBatch: any;
    let mockCollection: any;
    let mockDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CannMenusService();

        mockBatch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined)
        };

        mockDoc = {
            set: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) })
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection),
            batch: jest.fn().mockReturnValue(mockBatch)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('findRetailersCarryingBrand', () => {
        it('should fetch retailers from API and return mapped objects', async () => {
            const mockResponse = {
                data: {
                    data: [
                        { retailer_id: 'r1', name: 'Disp 1', state: 'CA', city: 'LA' },
                        { retailer_id: 'r2', name: 'Disp 2', state: 'NY', city: 'NYC' }
                    ]
                }
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await service.findRetailersCarryingBrand('TestBrand');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('r1');
            expect(result[1].id).toBe('r2');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v2/products?brand_name=TestBrand'),
                expect.anything()
            );
        });

        it('should handle API errors', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                statusText: 'Internal Server Error',
                status: 500
            });

            await expect(service.findRetailersCarryingBrand('TestBrand'))
                .rejects.toThrow('CannMenus API error');
        });
    });

    describe('syncMenusForBrand', () => {
        it('should perform a full sync successfully', async () => {
            // Mock findRetailers response
            const retailersResponse = {
                data: {
                    data: [{ retailer_id: 'r1', name: 'Disp 1' }]
                }
            };

            // Mock products response
            const productsResponse = {
                data: {
                    data: [{
                        products: [{
                            cann_sku_id: 'sku1',
                            product_name: 'Product A',
                            category: 'Edible',
                            latest_price: 20
                        }]
                    }]
                }
            };

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ // findRetailers
                    ok: true,
                    json: jest.fn().mockResolvedValue(retailersResponse)
                })
                .mockResolvedValueOnce({ // syncRetailerMenu
                    ok: true,
                    json: jest.fn().mockResolvedValue(productsResponse)
                });

            const result = await service.syncMenusForBrand('brand-123', 'TestBrand', { forceFullSync: true });

            expect(result.success).toBe(true);
            expect(result.retailersProcessed).toBe(1);
            expect(result.productsProcessed).toBe(1);
            expect(mockBatch.commit).toHaveBeenCalled(); // Should save retailers and products
        });

        it('should perform incremental sync if previous sync exists', async () => {
            // Mock last sync finding
            const lastSyncDate = new Date('2025-01-01');
            mockCollection.get.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    data: () => ({ endTime: { toDate: () => lastSyncDate } })
                }]
            });

            // Mocks for API calls (empty for mapping simplicity here)
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ data: { data: [] } })
            });

            const result = await service.syncMenusForBrand('brand-123', 'TestBrand');

            expect(result.isIncremental).toBe(true);
            // Verify getLastSuccessfulSync call chain logic
            expect(mockFirestore.collection).toHaveBeenCalledWith('sync_status');
        });
    });
});
