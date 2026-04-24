
import { syncMenu } from '@/app/dashboard/menu/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { DutchieClient } from '@/lib/pos/adapters/dutchie';

// Define mocks with inline factories
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('@/lib/pos/adapters/dutchie', () => ({
    DutchieClient: jest.fn()
}));

jest.mock('firebase-admin/firestore', () => ({ Firestore: jest.fn() }));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

// Non-fatal dynamic import — prevent real LanceDB calls
jest.mock('@/server/services/ezal/lancedb-store', () => ({
    upsertOwnProducts: jest.fn().mockResolvedValue({ upserted: 0, errors: 0 }),
}));

describe('syncMenu', () => {
    let mockUpdate: jest.Mock;
    let mockBatchSet: jest.Mock;
    let mockBatchCommit: jest.Mock;
    let mockFetchMenu: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUpdate = jest.fn().mockResolvedValue(undefined);
        mockBatchSet = jest.fn();
        mockBatchCommit = jest.fn().mockResolvedValue(undefined);

        const mockBatch = {
            set: mockBatchSet,
            commit: mockBatchCommit,
            delete: jest.fn(),
        };

        // Chainable subcollection mock — all gets return empty by default
        const makeChainableDoc = (): any => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [], exists: false, data: () => ({}) }),
            update: mockUpdate,
            set: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn(),
            collection: jest.fn(() => makeChainableColl()),
        });

        const makeChainableColl = (): any => {
            const coll: any = {
                doc: jest.fn(() => makeChainableDoc()),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            };
            coll.withConverter = jest.fn().mockReturnValue(coll);
            return coll;
        };

        // Location collection returns real location data on first get
        const locationDoc = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ posConfig: { provider: 'dutchie', storeId: '1235', apiKey: 'xyz' } }),
            }),
            update: mockUpdate,
            collection: jest.fn(() => makeChainableColl()),
        };

        const locationColl = {
            doc: jest.fn().mockReturnValue(locationDoc),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: jest.fn((name: string) =>
                    name === 'locations' ? locationColl : makeChainableColl()
                ),
                batch: jest.fn().mockReturnValue(mockBatch),
            },
        });

        // Setup Auth Mock
        (requireUser as jest.Mock).mockResolvedValue({ locationId: 'loc_123' });

        // Setup Dutchie Mock
        mockFetchMenu = jest.fn();
        (DutchieClient as jest.Mock).mockImplementation(() => ({
            fetchMenu: mockFetchMenu
        }));
    });

    it('should fetch menu from Dutchie and sync to Firestore', async () => {
        // Mock Dutchie Products
        mockFetchMenu.mockResolvedValue([
            { externalId: 'p1', name: 'Product 1', brandName: 'Brand A', category: 'Flower', price: 50, stock: 100, thcPercent: 20 },
            { externalId: 'p2', name: 'Product 2', brandName: 'Brand B', category: 'Edible', price: 20, stock: 0 }
        ]);

        const result = await syncMenu();

        expect(result.success).toBe(true);
        expect(result.count).toBe(2);

        // Verify batch writes: 2 products to legacy + 1 in-stock product to tenant catalog
        expect(mockBatchSet).toHaveBeenCalledTimes(3);
        
        // Check update of location sync status
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            'posConfig.lastSyncStatus': 'success'
        }));
    });

    it('should handle errors gracefully', async () => {
         (createServerClient as jest.Mock).mockRejectedValue(new Error('Firestore error'));
         const result = await syncMenu();
         expect(result.success).toBe(false);
         expect(result.error).toContain('Firestore error');
    });
});
