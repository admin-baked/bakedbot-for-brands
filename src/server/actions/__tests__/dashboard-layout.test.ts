import { saveDashboardLayout, getDashboardLayout } from '../dashboard-layout';
import { createServerClient } from '@/firebase/server-client';
import { LAYOUT_VERSION } from '@/lib/dashboard/widget-registry';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

// Define mock functions at top level for easy access in tests
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDocFn = jest.fn();
const mockCollectionFn = jest.fn();

// Build the mock chain objects
const mockDocRef = {
    set: mockSet,
    get: mockGet
};

const mockCollectionRef = {
    doc: mockDocFn
};

const mockFirestore = {
    collection: mockCollectionFn
};

const mockAuth = {
    currentUser: { uid: 'user1' }
};

describe('Dashboard Layout Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mock implementations
        mockDocFn.mockReturnValue(mockDocRef);
        mockCollectionFn.mockReturnValue(mockCollectionRef);
        mockSet.mockResolvedValue(undefined);
        mockGet.mockResolvedValue({ exists: false }); // Default for get, can be overridden

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
            auth: mockAuth
        });
    });

    describe('saveDashboardLayout', () => {
        it('saves layout to firestore for authenticated user', async () => {
            const widgets = [{ id: 'w1', widgetType: 'kpi', x: 0, y: 0, w: 2, h: 2 }];
            const result = await saveDashboardLayout('brand', widgets as any);

            expect(result.success).toBe(true);
            expect(mockCollectionFn).toHaveBeenCalledWith('dashboard_layouts');
            expect(mockDocFn).toHaveBeenCalledWith('user1_brand');
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                role: 'brand',
                userId: 'user1',
                widgets,
                version: LAYOUT_VERSION
            }));
        });

        it('returns error if user is not authenticated', async () => {
            (createServerClient as jest.Mock).mockResolvedValue({
                firestore: mockFirestore,
                auth: { currentUser: null }
            });

            const result = await saveDashboardLayout('brand', []);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('getDashboardLayout', () => {
        it('returns layout if it exists and version matches', async () => {
            const mockData = {
                widgets: [{ id: 'w1', type: 'kpi' }],
                version: LAYOUT_VERSION
            };

            mockGet.mockResolvedValue({
                exists: true,
                data: () => mockData
            });

            const result = await getDashboardLayout('brand');

            expect(result.success).toBe(true);
            expect(result.layout).toEqual(mockData.widgets);
        });

        it('returns null layout if doc does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            const result = await getDashboardLayout('brand');
            expect(result.success).toBe(true);
            expect(result.layout).toBeNull();
        });

        it('returns null layout if version mismatch', async () => {
            const mockData = {
                widgets: [],
                version: '0.0.0' // Old version
            };

            mockGet.mockResolvedValue({
                exists: true,
                data: () => mockData
            });

            const result = await getDashboardLayout('brand');
            expect(result.success).toBe(true);
            expect(result.layout).toBeNull();
        });
    });
});
