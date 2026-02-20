
describe('Cache Integration Tests', () => {
    let ProductsGET: any;
    let InsightsGET: any;
    let InsightsPOST: any;
    let withCacheMock: any;
    let invalidateCachePatternMock: any;
    let cacheModule: any;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();

        // Mock Next.js Server
        jest.doMock('next/server', () => ({
            NextResponse: {
                json: jest.fn((body) => ({
                    json: async () => body,
                    body
                }))
            },
            NextRequest: class {
                constructor(input: any, init: any) {
                    Object.assign(this, init);
                    this.url = input;
                    this.nextUrl = new URL(input);
                }
            }
        }));

        // Mock Cache Layer
        withCacheMock = jest.fn();
        invalidateCachePatternMock = jest.fn();

        jest.doMock('@/lib/cache', () => ({
            withCache: withCacheMock,
            invalidateCachePattern: invalidateCachePatternMock,
            CachePrefix: {
                PRODUCTS: 'products',
                ANALYTICS: 'analytics',
            },
            CacheTTL: {
                PRODUCTS: 300,
            }
        }));

        // Mock Firebase Admin
        jest.doMock('@/firebase/admin', () => ({
            getAdminFirestore: jest.fn(),
        }));

        // Mock Services
        jest.doMock('@/server/services/ezal', () => ({
            dismissInsight: jest.fn(),
            markInsightConsumed: jest.fn(),
            getRecentInsights: jest.fn(),
            findPriceGaps: jest.fn(),
        }));

        // Mock server-only
        jest.doMock('server-only', () => { });

        // Mock Logger
        jest.doMock('@/lib/logger', () => ({
            logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
        }));

        // Import routes dynamically
        const productsRoute = await import('@/app/api/products/route');
        ProductsGET = productsRoute.GET;

        const insightsRoute = await import('@/app/api/ezal/insights/route');
        InsightsGET = insightsRoute.GET;
        InsightsPOST = insightsRoute.POST;

        cacheModule = await import('@/lib/cache');
    });

    describe('Products API', () => {
        it('uses cache with correct key', async () => {
            // Mock NextRequest
            const req = {
                url: 'http://localhost/api/products?orgId=org_123',
                nextUrl: new URL('http://localhost/api/products?orgId=org_123'),
            } as any;

            withCacheMock.mockImplementation((...args: any[]) => {
                return Promise.resolve([{ id: 'prod_1' }]);
            });

            await ProductsGET(req);

            expect(withCacheMock).toHaveBeenCalledWith(
                'products',
                'org_123',
                expect.anything(),
                300
            );
        });
    });

    describe('Ezal Insights API', () => {
        it('caches price gaps with long TTL', async () => {
            const req = {
                url: 'http://localhost/api/ezal/insights?tenantId=org_1&mode=price_gaps',
                nextUrl: new URL('http://localhost/api/ezal/insights?tenantId=org_1&mode=price_gaps'),
            } as any;

            withCacheMock.mockResolvedValue([]);

            await InsightsGET(req);

            expect(withCacheMock).toHaveBeenCalledWith(
                'analytics',
                'price_gaps:org_1:all',
                expect.any(Function),
                900
            );
        });

        it('invalidates cache on dismiss action', async () => {
            const req = {
                method: 'POST',
                json: async () => ({
                    tenantId: 'org_1',
                    insightId: 'ins_1',
                    action: 'dismiss'
                })
            } as any;

            await InsightsPOST(req);

            expect(invalidateCachePatternMock).toHaveBeenCalledWith(
                `analytics:insights:org_1:*`
            );
        });
    });
});
