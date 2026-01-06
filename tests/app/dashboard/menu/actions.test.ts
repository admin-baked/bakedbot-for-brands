
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

describe('syncMenu', () => {
    let mockGet: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockBatchSet: jest.Mock;
    let mockBatchCommit: jest.Mock;
    let mockFetchMenu: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mocks
        mockGet = jest.fn();
        mockUpdate = jest.fn();
        mockBatchSet = jest.fn();
        mockBatchCommit = jest.fn();

        const mockBatch = {
            set: mockBatchSet,
            commit: mockBatchCommit
        };

        const mockDoc = {
            get: mockGet,
            update: mockUpdate
        };

        const mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: mockGet
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: jest.fn().mockReturnValue(mockCollection),
                batch: jest.fn().mockReturnValue(mockBatch)
            }
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
        // Mock Location Config
        mockGet.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                posConfig: { provider: 'dutchie', storeId: '1235', apiKey: 'xyz' }
            })
        });

        // Mock Dutchie Products
        mockFetchMenu.mockResolvedValue([
            { externalId: 'p1', name: 'Product 1', brandName: 'Brand A', category: 'Flower', price: 50, stock: 100, thcPercent: 20 },
            { externalId: 'p2', name: 'Product 2', brandName: 'Brand B', category: 'Edible', price: 20, stock: 0 }
        ]);

        const result = await syncMenu();

        expect(result.success).toBe(true);
        expect(result.count).toBe(2);

        // Verify batch writes
        expect(mockBatchSet).toHaveBeenCalledTimes(2);
        
        // Check update of location sync status
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            'posConfig.lastSyncStatus': 'success'
        }));
    });

    it('should handle errors gracefully', async () => {
         mockGet.mockRejectedValue(new Error('Firestore error'));
         const result = await syncMenu();
         expect(result.success).toBe(false);
         expect(result.error).toContain('Firestore error');
    });
});
