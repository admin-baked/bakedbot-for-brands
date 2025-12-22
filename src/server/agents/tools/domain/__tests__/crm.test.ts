/**
 * Unit tests for CRM Agent Tools
 */
import {
    getCustomerCount,
    findCustomers,
    getTopCustomers,
    getAtRiskCustomers,
    getCustomerInsight,
    crmTools,
} from '../crm';

// Mock Firebase
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
                            email: 'test@example.com',
                            displayName: 'Test User',
                            segment: 'vip',
                            totalSpent: 500,
                            orderCount: 10,
                            avgOrderValue: 50,
                            tier: 'gold',
                            preferredCategories: ['flower', 'edibles'],
                        })
                    })
                }),
                count: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        data: () => ({ count: 42 })
                    })
                }),
                get: jest.fn().mockResolvedValue({
                    empty: false,
                    docs: [
                        {
                            id: 'cust-1',
                            data: () => ({
                                email: 'vip@example.com',
                                displayName: 'VIP Customer',
                                segment: 'vip',
                                totalSpent: 1000,
                                orderCount: 20,
                                tier: 'gold',
                            })
                        },
                        {
                            id: 'cust-2',
                            data: () => ({
                                email: 'loyal@example.com',
                                displayName: 'Loyal Customer',
                                segment: 'loyal',
                                totalSpent: 300,
                                orderCount: 8,
                                tier: 'silver',
                            })
                        }
                    ],
                    forEach: function (cb: any) {
                        this.docs.forEach(cb);
                    }
                })
            })
        }
    })
}));

describe('CRM Agent Tools', () => {
    describe('crmTools export', () => {
        it('should export all tools', () => {
            expect(crmTools['crm.getCustomerCount']).toBeDefined();
            expect(crmTools['crm.findCustomers']).toBeDefined();
            expect(crmTools['crm.getTopCustomers']).toBeDefined();
            expect(crmTools['crm.getAtRiskCustomers']).toBeDefined();
            expect(crmTools['crm.getCustomerInsight']).toBeDefined();
        });
    });

    describe('getCustomerCount', () => {
        it('should return count with message', async () => {
            const result = await getCustomerCount('test-org');
            expect(result.count).toBe(42);
            expect(result.message).toContain('42');
        });

        it('should filter by segment when provided', async () => {
            const result = await getCustomerCount('test-org', 'vip');
            expect(result.segment).toBe('vip');
        });
    });

    describe('findCustomers', () => {
        it('should return customer summaries', async () => {
            const result = await findCustomers('test-org', {});
            expect(result.customers.length).toBeGreaterThan(0);
            expect(result.customers[0].email).toBeDefined();
        });

        it('should respect limit', async () => {
            const result = await findCustomers('test-org', { limit: 5 });
            expect(result.customers.length).toBeLessThanOrEqual(5);
        });
    });

    describe('getTopCustomers', () => {
        it('should return top customers with insight', async () => {
            const result = await getTopCustomers('test-org');
            expect(result.customers).toBeDefined();
            expect(result.insight).toContain('top');
        });
    });

    describe('getAtRiskCustomers', () => {
        it('should return recommendation', async () => {
            const result = await getAtRiskCustomers('test-org');
            expect(result.recommendation).toBeDefined();
        });
    });

    describe('getCustomerInsight', () => {
        it('should return insight for existing customer', async () => {
            const result = await getCustomerInsight('test-org', 'test@example.com');
            expect(result.customer).not.toBeNull();
            expect(result.insight).toBeDefined();
            expect(result.suggestedAction).toBeDefined();
        });
    });
});
