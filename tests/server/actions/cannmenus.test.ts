
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
        it('should throw when API key is not configured', async () => {
            // CANNMENUS_API_KEY is not set in the test env
            await expect(service.findRetailersCarryingBrand('TestBrand'))
                .rejects.toThrow('CANNMENUS_API_KEY is not configured');
        });
    });

    describe('syncMenusForBrand', () => {
        it('should return failure when API key is not configured', async () => {
            // CANNMENUS_API_KEY is not set in test env, so findRetailersCarryingBrand
            // throws, and syncMenusForBrand catches it returning success: false
            const result = await service.syncMenusForBrand('brand-123', 'TestBrand', { forceFullSync: true });

            expect(result.success).toBe(false);
            expect(result.errors).toContain('CANNMENUS_API_KEY is not configured');
        });

        it('should return failure for incremental sync when API key is not configured', async () => {
            // Even with a previous sync record, the API key check fires first inside findRetailersCarryingBrand
            mockCollection.get.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    data: () => ({ endTime: { toDate: () => new Date('2025-01-01') } })
                }]
            });

            const result = await service.syncMenusForBrand('brand-123', 'TestBrand');

            expect(result.success).toBe(false);
            // Verify sync_status collection was used to create sync record
            expect(mockFirestore.collection).toHaveBeenCalledWith('sync_status');
        });
    });
});
