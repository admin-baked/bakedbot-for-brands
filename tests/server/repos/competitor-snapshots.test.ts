/**
 * Unit Tests: Competitor Snapshots Repository
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase
const mockAdd = jest.fn().mockResolvedValue({ id: 'snapshot-123' });
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        add: mockAdd,
                        get: mockGet,
                        where: mockWhere,
                        orderBy: mockOrderBy,
                        limit: mockLimit,
                    }),
                }),
            }),
        },
    }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Competitor Snapshots Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveCompetitorSnapshot', () => {
        it('should save a snapshot with calculated metrics', async () => {
            const { saveCompetitorSnapshot } = await import('@/server/repos/competitor-snapshots');
            
            const snapshotData = {
                orgId: 'org-123',
                competitorId: 'comp-1',
                competitorName: 'Green Leaf Dispensary',
                deals: [
                    { name: 'Daily Special', price: 25.00 },
                    { name: 'Weekend Deal', price: 30.00 },
                ],
                products: [
                    { name: 'Blue Dream', price: 45.00, category: 'Flower' },
                ],
            };

            const id = await saveCompetitorSnapshot('org-123', snapshotData);

            expect(id).toBe('snapshot-123');
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    competitorId: 'comp-1',
                    competitorName: 'Green Leaf Dispensary',
                    dealCount: 2,
                    productCount: 1,
                    avgDealPrice: 27.5, // (25 + 30) / 2
                })
            );
        });
    });

    describe('getWeeklySnapshots', () => {
        it('should fetch snapshots from the last 7 days', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'snap-1',
                        data: () => ({
                            competitorId: 'comp-1',
                            competitorName: 'Test Disp',
                            deals: [],
                            products: [],
                            scrapedAt: { toDate: () => new Date() },
                        }),
                    },
                ],
            });

            const { getWeeklySnapshots } = await import('@/server/repos/competitor-snapshots');
            
            const snapshots = await getWeeklySnapshots('org-123');

            expect(snapshots).toHaveLength(1);
            expect(mockWhere).toHaveBeenCalledWith('scrapedAt', '>=', expect.any(Date));
        });
    });

    describe('getCompetitorSummaries', () => {
        it('should aggregate snapshots by competitor', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'snap-1',
                        data: () => ({
                            competitorId: 'comp-1',
                            competitorName: 'Dispensary A',
                            deals: [{ name: 'Deal 1', price: 20 }],
                            products: [],
                            scrapedAt: { toDate: () => new Date() },
                        }),
                    },
                    {
                        id: 'snap-2',
                        data: () => ({
                            competitorId: 'comp-1',
                            competitorName: 'Dispensary A',
                            deals: [{ name: 'Deal 2', price: 30 }],
                            products: [],
                            scrapedAt: { toDate: () => new Date() },
                        }),
                    },
                ],
            });

            const { getCompetitorSummaries } = await import('@/server/repos/competitor-snapshots');
            
            const summaries = await getCompetitorSummaries('org-123', 7);

            expect(summaries).toHaveLength(1);
            expect(summaries[0]).toMatchObject({
                competitorId: 'comp-1',
                competitorName: 'Dispensary A',
                snapshotCount: 2,
                totalDeals: 2,
                avgDealPrice: 25, // (20 + 30) / 2
            });
        });
    });
});
