
import { createCampaignDraft } from '../domain/marketing';
import { getKPIs } from '../domain/analytics';
import { scanCompetitors } from '../domain/intel';
import { searchProducts } from '../domain/catalog';

// Mock Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockImplementation(async () => ({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockImplementation((path) => ({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ name: 'Test Segment', competitors: ['Comp A'] }),
                    id: 'mock-doc-id'
                }),
                set: jest.fn().mockResolvedValue(true)
            })),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            // Mock snapshot for searchProducts — returns docs array
            get: jest.fn().mockResolvedValue({
                docs: [
                    { id: 'prod-1', data: () => ({ name: 'Blue Dream', price: 40 }) }
                ],
                // getKPIs uses ordersSnapshot.forEach — Firestore snapshots have forEach
                forEach: jest.fn((cb) => {
                    cb({
                        data: () => ({
                            status: 'completed',
                            total: 100,
                            customer: { email: 'a@b.com' },
                            items: [{ name: 'Blue Dream', qty: 2 }]
                        })
                    });
                }),
            })
        }
    }))
}));

// Mock web search for intel tools
jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn().mockResolvedValue({
        results: [
            { snippet: 'Great deals at Comp A', link: 'https://compa.example.com' }
        ]
    })
}));

describe('Domain Tools', () => {
    const tenantId = 'test-tenant';

    describe('Marketing Tools', () => {
        it('createCampaignDraft should create a draft in firestore', async () => {
            const result = await createCampaignDraft(tenantId, {
                name: 'Test Campaign',
                channel: 'email',
                segmentId: 'seg-123',
                content: 'Hello World'
            });

            expect(result).toBeDefined();
            expect(result.status).toBe('draft');
            expect(result.name).toBe('Test Campaign');
            expect(result.id).toBeDefined();
        });
    });

    describe('Analytics Tools', () => {
        it('getKPIs should return a report structure', async () => {
            const result = await getKPIs(tenantId, { period: 'month' });
            expect(result.tenantId).toBe(tenantId);
            expect(result.revenue).toBeGreaterThanOrEqual(0);
            expect(result.topProducts).toBeDefined();
        });
    });

    describe('Intel Tools', () => {
        it('scanCompetitors should return scan results', async () => {
            const result = await scanCompetitors(tenantId, {});
            expect(result).toHaveLength(1);
            expect(result[0].competitorName).toBe('Comp A');
            // URL comes from search results (may be empty if search mock returns no link)
            expect(result[0].url).toBeDefined();
        });
    });

    describe('Catalog Tools', () => {
        it('searchProducts should return mapped products', async () => {
            const result = await searchProducts(tenantId, { query: 'Blue' });
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Blue Dream');
        });
    });
});
