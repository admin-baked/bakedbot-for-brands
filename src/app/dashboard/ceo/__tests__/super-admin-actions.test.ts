
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
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
        increment: jest.fn((n: number) => `increment-${n}`),
    }
}), { virtual: true });

// Mock dynamically-imported services used by getPlatformAnalytics
jest.mock('@/server/services/crm-service', () => ({
    getPlatformUsers: jest.fn().mockResolvedValue([
        { id: 'u1', email: 'u1@ex.com', displayName: 'User 1', plan: 'Free', signupAt: Date.now(), lastLoginAt: Date.now(), mrr: 0, accountType: 'brand' },
    ]),
    getCRMUserStats: jest.fn().mockResolvedValue({ totalMRR: 0, totalUsers: 1 }),
}));

jest.mock('@/server/actions/ai-economics', () => ({
    getAgentTelemetrySummary: jest.fn().mockResolvedValue({ agents: [] }),
}));

jest.mock('@/server/services/growth/google-analytics', () => ({
    googleAnalyticsService: {
        getTrafficReport: jest.fn().mockResolvedValue({ rows: [] }),
        getConnectionStatus: jest.fn().mockResolvedValue({ connected: false }),
    },
}));

jest.mock('@/server/services/marty-reporting', () => ({
    buildMartyScoreboard: jest.fn().mockResolvedValue({
        mrr: 0, arr: 0, mrrTarget: 83333, arrTarget: 1000000,
        accounts: { brand: 0, dispensary: 0, total: 0 },
        pipeline: { leads: 0, active: 0, converted: 0 },
        coverage: { brands: 0, dispensaries: 0, zips: 0 },
        content: { blogPosts: 0, mediaEvents: 0 },
        agentHealth: { totalCalls: 0, avgDurationMs: 0, costToday: 0 },
    }),
}));

// Import actions after mocks
import { getPlatformAnalytics } from '../actions/data-actions';
import { getSystemPlaybooks } from '../actions/system-actions';

describe('Super User Server Actions', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }), size: 0, docs: [] }),
            set: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getPlatformAnalytics', () => {
        it('should return platform analytics with signups data', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-123' });

            const result = await getPlatformAnalytics();

            expect(result.signups).toBeDefined();
            expect(result.signups.total).toBe(1);
            expect(result.recentSignups).toBeDefined();
            expect(result.recentSignups.length).toBeLessThanOrEqual(10);
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
