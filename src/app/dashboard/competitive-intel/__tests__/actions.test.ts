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

        it('should include maxCompetitors from plan limits', async () => {
            const result = await getCompetitors('org_123');
            expect(typeof result.maxCompetitors).toBe('number');
            expect(result.maxCompetitors).toBeGreaterThan(0);
        });
    });

    describe('getCompetitors — deduplication (Feb 2026 fix)', () => {
        /**
         * Helper to build a mock Firestore query snapshot from an array of docs.
         */
        function mkSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
            return {
                forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
                    docs.forEach(d => cb({ id: d.id, data: () => d.data }));
                },
            };
        }

        function mkCollectionQuery(snap: ReturnType<typeof mkSnap>) {
            return {
                orderBy: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue(snap),
                doc: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }),
            };
        }

        beforeEach(() => {
            // Override the module-level mock with a collection-name-aware factory
            const { createServerClient } = require('@/firebase/server-client');

            const oldSnap = mkSnap([
                {
                    id: 'old_green_1',
                    data: {
                        name: 'Green Syracuse',
                        city: 'Syracuse',
                        state: 'NY',
                        source: 'auto',
                        lastUpdated: { toDate: () => new Date('2024-06-01') },
                    },
                },
            ]);

            // The NEW system (tenants collection) also has the same competitor
            const newSnap = mkSnap([
                {
                    id: 'new_green_1',
                    data: {
                        name: 'Green Syracuse',
                        city: 'Syracuse',
                        state: 'NY',
                        active: true,
                        updatedAt: { toDate: () => new Date('2024-06-01') },
                    },
                },
                {
                    id: 'new_distinct_1',
                    data: {
                        name: 'Purple Haze',
                        city: 'Albany',
                        state: 'NY',
                        active: true,
                        updatedAt: { toDate: () => new Date('2024-06-01') },
                    },
                },
            ]);

            (createServerClient as jest.Mock).mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockImplementation((col: string) => {
                        if (col === 'organizations') {
                            return {
                                doc: jest.fn().mockReturnValue({
                                    get: jest.fn().mockResolvedValue({
                                        data: () => ({ plan: 'empire', marketState: 'NY' }),
                                    }),
                                    collection: jest.fn().mockReturnValue(mkCollectionQuery(oldSnap)),
                                }),
                            };
                        }
                        if (col === 'tenants') {
                            return {
                                doc: jest.fn().mockReturnValue({
                                    collection: jest.fn().mockReturnValue(mkCollectionQuery(newSnap)),
                                }),
                            };
                        }
                        return { doc: jest.fn() };
                    }),
                    batch: jest.fn().mockReturnValue({ set: jest.fn(), commit: jest.fn() }),
                },
            });
        });

        it('deduplicates competitors with the same name+city+state from both Firestore collections', async () => {
            const result = await getCompetitors('org_thrive_syracuse');

            // "Green Syracuse" exists in both old + new collections — should appear exactly once
            const greenSyracuse = result.competitors.filter(c => c.name === 'Green Syracuse');
            expect(greenSyracuse).toHaveLength(1);
        });

        it('keeps distinct competitors from both collections', async () => {
            const result = await getCompetitors('org_thrive_syracuse');

            // "Purple Haze" only exists in the new (tenants) collection
            const purpleHaze = result.competitors.filter(c => c.name === 'Purple Haze');
            expect(purpleHaze).toHaveLength(1);
        });

        it('total count reflects deduplicated list (2 unique, not 3 raw entries)', async () => {
            const result = await getCompetitors('org_thrive_syracuse');

            // old: [Green Syracuse], new: [Green Syracuse, Purple Haze] → unique: 2
            expect(result.competitors).toHaveLength(2);
        });

        it('preserves first-seen entry when deduplicating (old collection wins)', async () => {
            const result = await getCompetitors('org_thrive_syracuse');
            const green = result.competitors.find(c => c.name === 'Green Syracuse');

            // The old-collection entry has id 'old_green_1'
            expect(green?.id).toBe('old_green_1');
        });

        it('is case-insensitive when deduplicating', async () => {
            // Rebuild with mixed-case duplicate
            const { createServerClient } = require('@/firebase/server-client');
            const oldSnap2 = mkSnap([
                {
                    id: 'o1',
                    data: {
                        name: 'green syracuse',
                        city: 'SYRACUSE',
                        state: 'ny',
                        source: 'auto',
                        lastUpdated: { toDate: () => new Date() },
                    },
                },
            ]);
            const newSnap2 = mkSnap([
                {
                    id: 'n1',
                    data: {
                        name: 'Green Syracuse',
                        city: 'Syracuse',
                        state: 'NY',
                        active: true,
                        updatedAt: { toDate: () => new Date() },
                    },
                },
            ]);
            (createServerClient as jest.Mock).mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockImplementation((col: string) => {
                        if (col === 'organizations') {
                            return {
                                doc: jest.fn().mockReturnValue({
                                    get: jest.fn().mockResolvedValue({ data: () => ({ plan: 'free' }) }),
                                    collection: jest.fn().mockReturnValue(mkCollectionQuery(oldSnap2)),
                                }),
                            };
                        }
                        return {
                            doc: jest.fn().mockReturnValue({
                                collection: jest.fn().mockReturnValue(mkCollectionQuery(newSnap2)),
                            }),
                        };
                    }),
                    batch: jest.fn(),
                },
            });

            const result = await getCompetitors('org_test');
            expect(result.competitors).toHaveLength(1);
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
