import { hydrateRecords, retrieveContext } from '../retrieval-plane';

jest.mock('@/server/services/ezal/lancedb-store', () => ({
    searchProducts: jest.fn(async (tenantId: string) => (tenantId === 'org_2' ? [
        {
            id: 'p3',
            competitorId: 'comp_3',
            brandName: 'North Star',
            productName: 'Dream Tincture',
            category: 'tincture',
            priceCurrent: 32,
            inStock: true,
            score: 0.95,
        },
    ] : [
        {
            id: 'p1',
            competitorId: '__self__',
            brandName: 'Thrive',
            productName: 'Sleep Gummies',
            category: 'edible',
            priceCurrent: 25,
            inStock: true,
            score: 0.9,
        },
        {
            id: 'p2',
            competitorId: 'comp_2',
            brandName: 'Competitor',
            productName: 'Night Gummies',
            category: 'edible',
            priceCurrent: 19,
            inStock: true,
            score: 0.7,
        },
    ])),
    searchInsights: jest.fn(async () => ([
        {
            id: 'i1',
            type: 'price_drop',
            brandName: 'Cookies',
            competitorId: 'comp_1',
            severity: 'medium',
            deltaPercentage: -10,
            createdAt: new Date().toISOString(),
            summary: 'Price dropped by 10%',
            score: 0.8,
        },
    ])),
    lancedbStore: {
        getProductsByIds: jest.fn(async (_tenantId: string, ids: string[]) => ids.map((id) => ({ id, title: `Product ${id}`, thc: 20 }))),
    },
}));

describe('retrieval-plane', () => {
    const env = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...env };
        delete process.env.RETRIEVAL_RERANK_PROVIDER;
        delete process.env.JINA_API_KEY;
        delete process.env.JINA_RERANK_MODEL;
    });

    afterAll(() => {
        process.env = env;
    });

    it('returns compact catalog context from retrieveContext', async () => {
        const result = await retrieveContext({
            query: 'best sleep gummies in stock',
            intent: 'recommend',
            domain: 'catalog',
            tenant_scope: {
                org_ids: ['org_1'],
                role_scope: 'dispensary',
                visibility: 'tenant_only',
            },
            filters: { statuses: ['in_stock'] },
            top_k: 10,
        });

        expect(result.result_count).toBe(2);
        expect(result.results[0].entity_type).toBe('product');
    });


    it('queries all authorized org IDs and merges results', async () => {
        const result = await retrieveContext({
            query: 'sleep support',
            intent: 'recommend',
            domain: 'catalog',
            tenant_scope: {
                org_ids: ['org_1', 'org_2'],
                role_scope: 'super_user',
                visibility: 'cross_tenant_allowed',
            },
            top_k: 10,
        });

        expect(result.result_count).toBe(3);
        expect(result.results.map((row) => row.id)).toContain('p3');
        expect(result.results.map((row) => row.source)).toContain('lancedb:org_2:competitive_products');
    });

    it('reranks with Jina when configured', async () => {
        process.env.RETRIEVAL_RERANK_PROVIDER = 'jina';
        process.env.JINA_API_KEY = 'test-key';
        global.fetch = jest.fn(async () => ({
            ok: true,
            json: async () => ({
                results: [
                    { index: 1, relevance_score: 0.98 },
                    { index: 0, relevance_score: 0.42 },
                ],
            }),
        })) as unknown as typeof fetch;

        const result = await retrieveContext({
            query: 'best sleep gummies in stock',
            intent: 'recommend',
            domain: 'catalog',
            tenant_scope: {
                org_ids: ['org_1'],
                role_scope: 'dispensary',
                visibility: 'tenant_only',
            },
            filters: { statuses: ['in_stock'] },
            top_k: 10,
        });

        expect(result.reranker_used).toBe('jina-reranker-v2-base-multilingual');
        expect(result.results[0].id).toBe('p2');
    });

    it('hydrates records and supports field projection', async () => {
        const result = await hydrateRecords({ ids: ['p1', 'p2'], fields: ['id'] }, 'org_1');
        expect(result.records).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    });
});
