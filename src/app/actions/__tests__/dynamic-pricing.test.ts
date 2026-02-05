import { createPricingRule, getPricingRules } from '../dynamic-pricing';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-123')
}));

describe('Dynamic Pricing Actions', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn()
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('createPricingRule', () => {
        it('creates a pricing rule with required fields', async () => {
            const result = await createPricingRule({
                name: 'Weekend Flash Sale',
                orgId: 'org_thrive_syracuse',
                strategy: 'clearance',
                priceAdjustment: {
                    type: 'percentage',
                    value: 0.20
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.name).toBe('Weekend Flash Sale');
            expect(result.data?.orgId).toBe('org_thrive_syracuse');
            expect(result.data?.id).toBe('mock-uuid-123');
            expect(mockFirestore.set).toHaveBeenCalled();
        });

        it('applies default values for optional fields', async () => {
            const result = await createPricingRule({
                name: 'Basic Rule',
                orgId: 'test_org'
            });

            expect(result.success).toBe(true);
            expect(result.data?.strategy).toBe('dynamic');
            expect(result.data?.priority).toBe(50);
            expect(result.data?.active).toBe(true);
            expect(result.data?.priceAdjustment.type).toBe('percentage');
            expect(result.data?.priceAdjustment.value).toBe(0.15);
        });

        it('returns error when name is missing', async () => {
            const result = await createPricingRule({
                orgId: 'test_org'
            } as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });

        it('returns error when orgId is missing', async () => {
            const result = await createPricingRule({
                name: 'Test Rule'
            } as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });

        it('accepts custom priority and strategy', async () => {
            const result = await createPricingRule({
                name: 'High Priority Rule',
                orgId: 'test_org',
                priority: 90,
                strategy: 'competitive'
            });

            expect(result.success).toBe(true);
            expect(result.data?.priority).toBe(90);
            expect(result.data?.strategy).toBe('competitive');
        });

        it('accepts inventory age conditions', async () => {
            const result = await createPricingRule({
                name: 'Clear Old Stock',
                orgId: 'test_org',
                strategy: 'clearance',
                conditions: {
                    inventoryAge: { min: 30 }
                },
                priceAdjustment: {
                    type: 'percentage',
                    value: 0.25,
                    minPrice: 5.00
                }
            });

            expect(result.success).toBe(true);
            expect(result.data?.conditions.inventoryAge?.min).toBe(30);
            expect(result.data?.priceAdjustment.minPrice).toBe(5.00);
        });
    });

    describe('getPricingRules', () => {
        it('retrieves pricing rules for an organization', async () => {
            const mockRules = [
                {
                    id: 'rule1',
                    name: 'Rule 1',
                    orgId: 'test_org',
                    priority: 100,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'rule2',
                    name: 'Rule 2',
                    orgId: 'test_org',
                    priority: 50,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            mockFirestore.get.mockResolvedValue({
                docs: mockRules.map(rule => ({
                    id: rule.id,
                    data: () => rule
                }))
            });

            const result = await getPricingRules('test_org');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(mockFirestore.where).toHaveBeenCalledWith('orgId', '==', 'test_org');
            expect(mockFirestore.orderBy).toHaveBeenCalledWith('priority', 'desc');
        });

        it('returns error when orgId is missing', async () => {
            const result = await getPricingRules('');

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });

        it('handles empty result set', async () => {
            mockFirestore.get.mockResolvedValue({
                docs: []
            });

            const result = await getPricingRules('test_org');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });
    });
});
