
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('firebase-admin', () => ({
    firestore: () => ({}),
    auth: () => ({}),
    apps: [],
}));

jest.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidatePath: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/actions/cannmenus', () => ({
    searchCannMenusRetailers: jest.fn(),
}));

jest.mock('@/server/jobs/seo-generator', () => ({
    runChicagoPilotJob: jest.fn(),
}));

jest.mock('@/server/jobs/brand-discovery-job', () => ({
    runBrandPilotJob: jest.fn(),
}));

jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn(),
}));

jest.mock('@/ai/flows/update-product-embeddings', () => ({
    updateProductEmbeddings: jest.fn(),
}));

jest.mock('@/server/services/geo-discovery', () => ({
    getZipCodeCoordinates: jest.fn(),
    getRetailersByZipCode: jest.fn(),
    discoverNearbyProducts: jest.fn(),
}));

jest.mock('@/lib/seo-kpis', () => ({
    fetchSeoKpis: jest.fn(),
}));

jest.mock('@/lib/mrr-ladder', () => ({
    calculateMrrLadder: jest.fn(),
}));

// Mock auth and other dash deps
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
  isSuperUser: jest.fn(),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
    })),
}));

jest.mock('date-fns', () => ({
    formatDistanceToNow: jest.fn(() => 'mock-time'),
}));

// Mock both formats of firebase-admin imports for firestore
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'mock-timestamp'),
        increment: jest.fn((n) => `increment-${n}`),
    }
}), { virtual: true });

// Import actions after mocks
import { getPlatformAnalytics, getSystemPlaybooks } from '../actions';

describe('Super User Server Actions', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn(),
            set: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getPlatformAnalytics', () => {
        it('should fetch counts and recent logs correctly', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-123' });
            
            // Mock counts
            mockFirestore.get.mockResolvedValueOnce({ data: () => ({ count: 10 }) }); // users
            mockFirestore.get.mockResolvedValueOnce({ data: () => ({ count: 5 }) });  // brands
            mockFirestore.get.mockResolvedValueOnce({ data: () => ({ count: 3 }) });  // orgs
            mockFirestore.get.mockResolvedValueOnce({ data: () => ({ count: 20 }) }); // leads

            // Mock recent signups
            mockFirestore.get.mockResolvedValueOnce({
                docs: [
                    { id: 'u1', data: () => ({ email: 'u1@ex.com', createdAt: { toDate: () => new Date() } }) }
                ]
            });

            // Mock agent logs
            mockFirestore.get.mockResolvedValueOnce({
                docs: [
                    { data: () => ({ agentName: 'Smokey', status: 'success', durationMs: 1000, estimatedCost: 0.05 }) }
                ]
            });

            const result = await getPlatformAnalytics();

            expect(result.signups.total).toBe(10);
            expect(result.recentSignups).toHaveLength(1);
        });
    });

    describe('getSystemPlaybooks', () => {
        it('should fetch playbooks from Firestore', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-123' });
            
            mockFirestore.get.mockResolvedValueOnce({
                docs: [
                    { 
                        id: 'pb-1', 
                        data: () => ({ 
                            name: 'Test PB', 
                            active: true, 
                            runsToday: 1, 
                            category: 'ops' 
                        }) 
                    }
                ]
            });

            const result = await getSystemPlaybooks();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test PB');
        });
    });
});
