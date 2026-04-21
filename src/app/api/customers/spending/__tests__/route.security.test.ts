import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockPosCacheGet = jest.fn();
const mockPosCacheSet = jest.fn();

jest.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: {
        json: (body: any, init?: any) => ({
            status: init?.status || 200,
            json: async () => body,
        }),
    },
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
    posCache: {
        get: (...args: unknown[]) => mockPosCacheGet(...args),
        set: (...args: unknown[]) => mockPosCacheSet(...args),
    },
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
    ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('/api/customers/spending security', () => {
    let GET: typeof import('../route').GET;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockPosCacheGet.mockReturnValue(undefined);
        mockPosCacheSet.mockReset();
        mockCreateServerClient.mockResolvedValue({ firestore: { collection: jest.fn() } });

        ({ GET } = await import('../route'));
    });

    it('requires authentication before reading spending data', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const response = await GET({
            url: 'https://example.com/api/customers/spending?orgId=org-a',
        } as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
        expect(mockPosCacheGet).not.toHaveBeenCalled();
        expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('blocks cross-org requests for non-super users', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            role: 'brand_admin',
            brandId: 'org-a',
        });

        const response = await GET({
            url: 'https://example.com/api/customers/spending?orgId=org-b',
        } as any);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toContain('Cannot access another organization');
        expect(mockPosCacheGet).not.toHaveBeenCalled();
        expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('returns cached spending data for same-org users', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            role: 'dispensary_admin',
            orgId: 'org-a',
            currentOrgId: 'org-a',
        });
        mockPosCacheGet.mockReturnValue({
            alleaves_1: {
                totalSpent: 125,
                orderCount: 3,
                lastOrderDate: '2026-03-10T10:00:00.000Z',
                firstOrderDate: '2026-01-10T10:00:00.000Z',
                avgOrderValue: 41.67,
            },
        });

        const response = await GET({
            url: 'https://example.com/api/customers/spending?orgId=org-a',
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.cached).toBe(true);
        expect(body.spending.alleaves_1.totalSpent).toBe(125);
        expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('allows super users to request an explicit org', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'super-1',
            role: 'super_user',
            currentOrgId: 'org-super',
        });
        mockPosCacheGet.mockReturnValue({
            alleaves_9: {
                totalSpent: 500,
                orderCount: 5,
                lastOrderDate: '2026-03-11T10:00:00.000Z',
                firstOrderDate: '2026-02-01T10:00:00.000Z',
                avgOrderValue: 100,
            },
        });

        const response = await GET({
            url: 'https://example.com/api/customers/spending?orgId=org-target',
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockPosCacheGet).toHaveBeenCalledWith('spending:org-target');
    });

    it('uses the precomputed spending index before falling back to live POS calls', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            role: 'dispensary_admin',
            orgId: 'org-a',
            currentOrgId: 'org-a',
        });
        mockPosCacheGet.mockReturnValue(null);

        const spendingDocs = [
            {
                id: 'cid_42',
                data: () => ({
                    totalSpent: 210,
                    orderCount: 3,
                    avgOrderValue: 70,
                    lastOrderDate: { toDate: () => new Date('2026-03-10T10:00:00.000Z') },
                    firstOrderDate: { toDate: () => new Date('2026-01-10T10:00:00.000Z') },
                }),
            },
        ];

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name !== 'tenants') throw new Error(`Unexpected collection: ${name}`);
                return {
                    doc: jest.fn(() => ({
                        collection: jest.fn(() => ({
                            limit: jest.fn().mockReturnThis(),
                            get: jest.fn().mockResolvedValue({
                                empty: false,
                                docs: spendingDocs,
                                forEach: (callback: (doc: typeof spendingDocs[number]) => void) => spendingDocs.forEach(callback),
                            }),
                        })),
                    })),
                };
            }),
        };
        mockCreateServerClient.mockResolvedValue({ firestore });

        const response = await GET({
            url: 'https://example.com/api/customers/spending?orgId=org-a',
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.source).toBe('customer_spending_index');
        expect(body.spending.alleaves_42.totalSpent).toBe(210);
        expect(mockPosCacheSet).toHaveBeenCalledWith('spending:org-a', expect.any(Object), 900);
    });
});
