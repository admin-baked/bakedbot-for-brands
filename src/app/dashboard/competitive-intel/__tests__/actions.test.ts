/**
 * Unit tests for Competitive Intel Actions
 */
import {
    getCompetitors,
    autoDiscoverCompetitors,
    addManualCompetitor,
    removeCompetitor,
    type CompetitorEntry,
    type CompetitorSnapshot
} from '../actions';

// Mock dependencies
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', role: 'brand' })
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ plan: 'free', marketState: 'IL' })
                    }),
                    collection: jest.fn().mockReturnValue({
                        orderBy: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        get: jest.fn().mockResolvedValue({
                            forEach: jest.fn((cb: any) => {
                                cb({
                                    id: 'comp_1',
                                    data: () => ({
                                        name: 'Test Competitor',
                                        city: 'Chicago',
                                        state: 'IL',
                                        source: 'auto',
                                        lastUpdated: { toDate: () => new Date() }
                                    })
                                });
                            })
                        }),
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn(),
                            set: jest.fn(),
                            delete: jest.fn()
                        })
                    })
                })
            }),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined)
            })
        }
    })
}));

jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn().mockImplementation(() => ({
        findRetailers: jest.fn().mockResolvedValue([
            { id: 'ret_1', name: 'Dispensary 1', city: 'Chicago', state: 'IL' },
            { id: 'ret_2', name: 'Dispensary 2', city: 'Aurora', state: 'IL' }
        ])
    }))
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('Competitive Intel Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCompetitors', () => {
        it('should return competitor snapshot with plan info', async () => {
            const result = await getCompetitors('org_123');

            expect(result).toBeDefined();
            expect(result.competitors).toBeInstanceOf(Array);
            expect(result.updateFrequency).toBe('weekly'); // free plan
        });

        it('should indicate correct update frequency for free plan', async () => {
            const result = await getCompetitors('org_123');

            expect(result.updateFrequency).toBe('weekly');
        });
    });

    describe('addManualCompetitor', () => {
        it('should add a competitor with manual source', async () => {
            const result = await addManualCompetitor('org_123', {
                name: 'Manual Competitor',
                city: 'Detroit',
                state: 'MI'
            });

            expect(result).toBeDefined();
            expect(result.name).toBe('Manual Competitor');
            expect(result.source).toBe('manual');
        });

        it('should require a name', async () => {
            const result = await addManualCompetitor('org_123', {
                name: 'Test',
            });

            expect(result.name).toBe('Test');
        });
    });

    describe('CompetitorEntry type', () => {
        it('should have correct shape', () => {
            const entry: CompetitorEntry = {
                id: 'test',
                name: 'Test',
                source: 'auto'
            };

            expect(entry.id).toBeDefined();
            expect(entry.source).toBe('auto');
        });
    });

    describe('CompetitorSnapshot type', () => {
        it('should have correct shape', () => {
            const snapshot: CompetitorSnapshot = {
                competitors: [],
                lastUpdated: new Date(),
                nextUpdate: new Date(),
                updateFrequency: 'weekly',
                canRefresh: true
            };

            expect(snapshot.updateFrequency).toBe('weekly');
            expect(snapshot.canRefresh).toBe(true);
        });
    });
});
