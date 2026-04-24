/**
 * @jest-environment node
 */

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/server/services/insights/customer-metrics', () => ({
    getActiveCustomerCount: jest.fn(),
}));

import { getAdminFirestore } from '@/firebase/admin';
import { getInsightsForOrg } from '@/server/actions/insights';

type MockTimestamp = {
    toDate: () => Date;
};

type MockInsightDoc = {
    id: string;
    category: 'velocity' | 'customer' | 'market';
    title: string;
    headline: string;
    severity: 'critical' | 'warning' | 'info' | 'success';
    generatedAt: string;
    expiresAt: string;
};

function makeTimestamp(iso: string): MockTimestamp {
    return {
        toDate: () => new Date(iso),
    };
}

function makeDoc(doc: MockInsightDoc) {
    return {
        id: doc.id,
        data: () => ({
            category: doc.category,
            agentId:
                doc.category === 'velocity'
                    ? 'money_mike'
                    : doc.category === 'market'
                      ? 'ezal'
                      : 'mrs_parker',
            agentName:
                doc.category === 'velocity'
                    ? 'Money Mike'
                    : doc.category === 'market'
                      ? 'Ezal'
                      : 'Mrs. Parker',
            title: doc.title,
            headline: doc.headline,
            severity: doc.severity,
            actionable: true,
            generatedAt: makeTimestamp(doc.generatedAt),
            expiresAt: makeTimestamp(doc.expiresAt),
            lastUpdated: new Date(doc.generatedAt),
            dataSource: 'test',
        }),
    };
}

describe('getInsightsForOrg', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('fetches active insights without composite ordering and prioritizes in memory', async () => {
        const docs = [
            makeDoc({
                id: 'customer-old',
                category: 'customer',
                title: 'CUSTOMER MIX',
                headline: '15 returning customers',
                severity: 'warning',
                generatedAt: '2026-03-09T10:00:00.000Z',
                expiresAt: '2026-03-10T10:00:00.000Z',
            }),
            makeDoc({
                id: 'customer-new',
                category: 'customer',
                title: 'LOYALTY PERFORMANCE',
                headline: '22 loyal customers',
                severity: 'success',
                generatedAt: '2026-03-10T10:00:00.000Z',
                expiresAt: '2026-03-11T10:00:00.000Z',
            }),
            makeDoc({
                id: 'velocity-warning',
                category: 'velocity',
                title: 'SLOW MOVERS',
                headline: '12 products stagnant',
                severity: 'warning',
                generatedAt: '2026-03-10T09:00:00.000Z',
                expiresAt: '2026-03-11T09:00:00.000Z',
            }),
            makeDoc({
                id: 'market-critical',
                category: 'market',
                title: 'COMPETITOR PRICE DROP',
                headline: 'Competitor cut prices 40%',
                severity: 'critical',
                generatedAt: '2026-03-10T08:00:00.000Z',
                expiresAt: '2026-03-11T08:00:00.000Z',
            }),
        ];

        const get = jest.fn().mockResolvedValue({
            empty: false,
            docs,
        });
        const limit = jest.fn().mockReturnValue({ get });
        const where = jest.fn().mockReturnValue({ limit });
        const insightsCollection = jest.fn().mockReturnValue({ where });
        const doc = jest.fn().mockReturnValue({ collection: insightsCollection });
        const collection = jest.fn().mockReturnValue({ doc });

        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection,
        });

        const result = await getInsightsForOrg('org-thrive', 5);

        expect(collection).toHaveBeenCalledWith('tenants');
        expect(doc).toHaveBeenCalledWith('org-thrive');
        expect(insightsCollection).toHaveBeenCalledWith('insights');
        expect(where).toHaveBeenCalledWith('expiresAt', '>', expect.any(Date));
        expect(limit).toHaveBeenCalledWith(200);
        expect(result).toEqual({
            success: true,
            insights: expect.arrayContaining([
                expect.objectContaining({ id: 'market-critical', category: 'market' }),
                expect.objectContaining({ id: 'velocity-warning', category: 'velocity' }),
                expect.objectContaining({ id: 'customer-old', category: 'customer' }),
                expect.objectContaining({ id: 'customer-new', category: 'customer' }),
            ]),
        });

        if (!result.success) {
            throw new Error('Expected proactive insights to succeed');
        }

        // Dedup is by category:title, so CUSTOMER MIX and LOYALTY PERFORMANCE both survive
        expect(result.insights.map((insight) => insight.id)).toEqual([
            'market-critical',
            'velocity-warning',
            'customer-old',
            'customer-new',
        ]);
        expect(result.insights).toHaveLength(4);
    });
});
