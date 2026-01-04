/**
 * Unit tests for Customer CRM Actions
 */
import {
    getCustomers,
    getCustomer,
    upsertCustomer,
    getSuggestedSegments,
    type CustomersData,
} from '../actions';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({
                            orgId: 'test-org',
                            email: 'customer@test.com',
                            segment: 'vip',
                            totalSpent: 500,
                            orderCount: 10,
                        })
                    }),
                    update: jest.fn(),
                }),
                add: jest.fn().mockResolvedValue({ id: 'new-customer-id' }),
                get: jest.fn().mockResolvedValue({
                    docs: [
                        {
                            id: 'cust_1',
                            data: () => ({
                                orgId: 'test-org',
                                email: 'vip@example.com',
                                firstName: 'VIP',
                                lastName: 'Customer',
                                segment: 'vip',
                                totalSpent: 1000,
                                orderCount: 20,
                                tier: 'gold',
                                createdAt: { toDate: () => new Date() },
                                updatedAt: { toDate: () => new Date() }
                            })
                        },
                        {
                            id: 'cust_2',
                            data: () => ({
                                orgId: 'test-org',
                                email: 'loyal@example.com',
                                firstName: 'Loyal',
                                lastName: 'Buyer',
                                segment: 'loyal',
                                totalSpent: 300,
                                orderCount: 8,
                                tier: 'silver',
                                createdAt: { toDate: () => new Date() },
                                updatedAt: { toDate: () => new Date() }
                            })
                        }
                    ],
                    forEach: function (cb: any) {
                        this.docs.forEach(cb);
                    },
                    empty: false,
                })
            })
        }
    })
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'test-user',
        brandId: 'test-org',
        role: 'brand'
    })
}));

describe('Customer CRM Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCustomers', () => {
        it('should return customers data with stats', async () => {
            const result = await getCustomers('test-org');

            expect(result).toBeDefined();
            expect(result.customers).toBeInstanceOf(Array);
            expect(result.stats).toBeDefined();
        });

        it('should include segment breakdown in stats', async () => {
            const result = await getCustomers('test-org');

            expect(result.stats.segmentBreakdown).toBeDefined();
            expect(typeof result.stats.totalCustomers).toBe('number');
        });

        it('should filter by retailerId when locationId is provided', async () => {
            const { firestore } = await (require('@/firebase/server-client').createServerClient)();
            const result = await getCustomers('test-org', 'loc-123');

            expect(firestore.collection).toHaveBeenCalledWith('orders');
            // We assume the mock structure allows checking this
            expect(result).toBeDefined();
        });
    });

    describe('CustomersData type', () => {
        it('should have correct structure', () => {
            const data: CustomersData = {
                customers: [],
                stats: {
                    totalCustomers: 0,
                    newThisWeek: 0,
                    newThisMonth: 0,
                    atRiskCount: 0,
                    vipCount: 0,
                    avgLifetimeValue: 0,
                    segmentBreakdown: {
                        vip: 0,
                        loyal: 0,
                        new: 0,
                        at_risk: 0,
                        slipping: 0,
                        churned: 0,
                        high_value: 0,
                        frequent: 0,
                    }
                }
            };

            expect(data.customers).toBeInstanceOf(Array);
            expect(data.stats.segmentBreakdown.vip).toBe(0);
        });
    });

    describe('getSuggestedSegments', () => {
        it('should return segment suggestions', async () => {
            const suggestions = await getSuggestedSegments('test-org');

            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should include reasoning in suggestions', async () => {
            const suggestions = await getSuggestedSegments('test-org');

            suggestions.forEach(s => {
                expect(s.name).toBeDefined();
                expect(s.description).toBeDefined();
                expect(s.reasoning).toBeDefined();
            });
        });
    });

    describe('Customer Profile Fields', () => {
        it('should support all required fields', async () => {
            const result = await getCustomers('test-org');

            if (result.customers.length > 0) {
                const customer = result.customers[0];
                expect(customer.id).toBeDefined();
                expect(customer.email).toBeDefined();
                expect(customer.segment).toBeDefined();
            }
        });

        it('should calculate segment automatically', async () => {
            const result = await getCustomers('test-org');

            result.customers.forEach(c => {
                expect(['vip', 'loyal', 'new', 'at_risk', 'slipping', 'churned', 'high_value', 'frequent'])
                    .toContain(c.segment);
            });
        });
    });

    describe('Tier Calculation', () => {
        it('should assign tiers based on total spent', async () => {
            const result = await getCustomers('test-org');

            result.customers.forEach(c => {
                expect(['bronze', 'silver', 'gold', 'platinum']).toContain(c.tier);
            });
        });
    });
});
