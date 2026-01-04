import { getBrandDashboardData } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import * as leafly from '@/server/services/leafly-connector';
import * as productRepo from '@/server/repos/productRepo';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'user1' })
}));
jest.mock('@/server/services/leafly-connector', () => ({
    getLocalCompetition: jest.fn()
}));
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn()
}));
jest.mock('@/app/dashboard/dispensaries/actions', () => ({
    getBrandDispensaries: jest.fn()
}));

import * as dispensaryActions from '@/app/dashboard/dispensaries/actions';

const mockFirestore = {
    collection: jest.fn(),
};

describe('getBrandDashboardData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('returns formatted dashboard data with live inputs', async () => {
        // Mock Organizations Collection (1st collection call - for org doc)
        const mockOrgDoc = {
            exists: true,
            data: () => ({ state: 'IL', city: 'Chicago', name: 'Test Brand' })
        };
        const mockCompetitorsCount = jest.fn().mockResolvedValue({ data: () => ({ count: 5 }) });
        
        mockFirestore.collection.mockImplementation((collectionName: string) => {
            if (collectionName === 'organizations') {
                return {
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(mockOrgDoc),
                        collection: jest.fn().mockReturnValue({
                            count: jest.fn().mockReturnValue({ get: mockCompetitorsCount })
                        })
                    })
                };
            }
            if (collectionName === 'campaigns') {
                return {
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ size: 5 })
                };
            }
            return {
                doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false, data: () => null }) }),
                where: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ size: 0 })
            };
        });

        // Mock Leafly
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({
            competitors: [1, 2, 3],
            pricingByCategory: [{ avg: 50 }],
            activeDeals: 12,
            dataFreshness: new Date(),
        });

        // Mock Products
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([
                { price: 60, retailerIds: ['r1', 'r2'] },
                { price: 40, retailerIds: ['r1'] }
            ])
        });

        // Mock Dispensaries (coverage count)
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

        const result = await getBrandDashboardData('brand1');

        expect(result).not.toBeNull();
        // Coverage: r1, r2 -> 2
        expect(result?.coverage.value).toBe(2);

        // Competitors: 3
        expect(result?.competitiveIntel.competitorsTracked).toBe(3);

        // Price Index calculation:
        // Avg Price = 50. Market Avg = 50. Delta = 0%.
        expect(result?.priceIndex.value).toContain('0%');
    });

    it('handles missing data gracefully', async () => {
        // Mock empty brand
        mockFirestore.collection.mockReturnValue({
            doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => null }) }),
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ size: 0 })
        });

        // Mock empty leafly
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({
            competitors: [],
            pricingByCategory: [],
            activeDeals: 0,
            dataFreshness: null,
        });

        // Mock empty products
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([])
        });

        // Mock empty dispensaries
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([]);

        const result = await getBrandDashboardData('brand1');

        expect(result?.coverage.value).toBe(0);
        expect(result?.competitiveIntel.competitorsTracked).toBe(0);
        expect(result?.priceIndex.value).toBe('0%');
    });
});

// ============================================================================
// getNextBestActions Tests
// ============================================================================

import { getNextBestActions } from '../actions';

describe('getNextBestActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('returns "Add Products" action when no products exist', async () => {
        // Mock empty products
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([])
        });
        
        // Mock dispensaries exist
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([{ id: 'd1' }]);
        
        // Mock Firestore for competitors and playbooks
        mockFirestore.collection.mockImplementation((collectionName: string) => {
            if (collectionName === 'organizations') {
                return {
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ state: 'IL' }) }),
                        collection: jest.fn().mockImplementation((subCollectionName: string) => {
                            if (subCollectionName === 'competitors') {
                                return { count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) }) }) };
                            }
                            if (subCollectionName === 'playbooks') {
                                return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: false }) };
                            }
                            return {};
                        })
                    })
                };
            }
            return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: true }) };
        });
        
        // Mock Leafly (no promo gap)
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({ activeDeals: 0 });
        
        const actions = await getNextBestActions('brand1');
        
        expect(actions.some(a => a.id === 'add-products')).toBe(true);
    });

    it('returns "Connect Retailers" action when no dispensaries exist', async () => {
        // Mock products exist
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([{ id: 'p1', price: 50 }])
        });
        
        // Mock no dispensaries
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([]);
        
        mockFirestore.collection.mockImplementation(() => ({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ state: 'IL' }) }),
                collection: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) }) }),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ empty: false })
                })
            }),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true })
        }));
        
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({ activeDeals: 0 });
        
        const actions = await getNextBestActions('brand1');
        
        expect(actions.some(a => a.id === 'connect-retailers')).toBe(true);
    });

    it('returns empty array when all setup is complete', async () => {
        // Mock products exist
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([{ id: 'p1', price: 50 }])
        });
        
        // Mock dispensaries exist
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([{ id: 'd1' }]);
        
        // Mock everything is set up
        mockFirestore.collection.mockImplementation((collectionName: string) => {
            if (collectionName === 'organizations') {
                return {
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ state: 'IL' }) }),
                        collection: jest.fn().mockImplementation((subCollectionName: string) => {
                            if (subCollectionName === 'competitors') {
                                return { count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 5 }) }) }) };
                            }
                            if (subCollectionName === 'playbooks') {
                                return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: false }) };
                            }
                            return {};
                        })
                    })
                };
            }
            if (collectionName === 'campaigns') {
                return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: false }) };
            }
            return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: true }) };
        });
        
        // Mock no promo gap
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({ activeDeals: 0 });
        
        const actions = await getNextBestActions('brand1');
        
        expect(actions).toHaveLength(0);
    });

    it('returns actions sorted by priority (high first)', async () => {
        // Mock empty products (high priority)
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([])
        });
        
        // Mock no dispensaries (high priority)
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([]);
        
        // Mock no competitors (medium priority)
        mockFirestore.collection.mockImplementation(() => ({
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ state: 'IL' }) }),
                collection: jest.fn().mockReturnValue({
                    count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) }),
                    where: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ empty: true })
                })
            }),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true })
        }));
        
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({ activeDeals: 0 });
        
        const actions = await getNextBestActions('brand1');
        
        // High priority actions should come first
        expect(actions.length).toBeGreaterThan(0);
        expect(actions[0].priority).toBe('high');
    });

    it('returns max 5 actions', async () => {
        // Mock all gaps
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([])
        });
        (dispensaryActions.getBrandDispensaries as jest.Mock).mockResolvedValue([]);
        
        mockFirestore.collection.mockImplementation((collectionName: string) => {
            if (collectionName === 'organizations') {
                return {
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ state: 'IL' }) }),
                        collection: jest.fn().mockReturnValue({
                            count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) }),
                            where: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            get: jest.fn().mockResolvedValue({ empty: true })
                        })
                    })
                };
            }
            if (collectionName === 'campaigns') {
                return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: true }) };
            }
            return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue({ empty: true }) };
        });
        
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({ activeDeals: 5 });
        
        const actions = await getNextBestActions('brand1');
        
        expect(actions.length).toBeLessThanOrEqual(5);
    });
});

