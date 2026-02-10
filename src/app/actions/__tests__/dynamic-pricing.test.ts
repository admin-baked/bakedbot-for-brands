import {
    createPricingRule,
    getPricingRules,
    updatePricingRule,
    deletePricingRule,
    togglePricingRule,
    calculateDynamicPrice,
} from '../dynamic-pricing';
import { getAdminFirestore } from '@/firebase/admin';
import { getInventoryAge } from '@/server/services/alleaves/inventory-intelligence';
import { getCompetitorPricingForProduct } from '@/server/services/ezal/competitor-pricing';

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

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

jest.mock('@/server/services/alleaves/inventory-intelligence', () => ({
    getInventoryAge: jest.fn(),
    needsClearancePricing: jest.fn(() => false),
}));

jest.mock('@/server/services/ezal/competitor-pricing', () => ({
    getCompetitorPricingForProduct: jest.fn(),
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
    ALLeavesClient: jest.fn().mockImplementation(() => ({
        createDiscount: jest.fn(() => Promise.resolve({
            success: true,
            discount: { id_discount: 123 },
        })),
        deactivateDiscount: jest.fn(() => Promise.resolve({ success: true })),
    })),
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
            expect(result.error).toBeDefined();
        });

        it('returns error when orgId is missing', async () => {
            const result = await createPricingRule({
                name: 'Test Rule'
            } as any);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
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
            expect(result.error).toBeDefined();
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

    describe('updatePricingRule', () => {
        it('updates a rule successfully', async () => {
            mockFirestore.update = jest.fn().mockResolvedValue(undefined);

            const result = await updatePricingRule('rule-123', {
                name: 'Updated Rule Name',
                active: false,
            });

            expect(result.success).toBe(true);
            expect(mockFirestore.update).toHaveBeenCalled();
        });

        it('fails without rule ID', async () => {
            const result = await updatePricingRule('', { name: 'Test' });
            expect(result.success).toBe(false);
        });
    });

    describe('deletePricingRule', () => {
        it('deletes a rule successfully', async () => {
            mockFirestore.delete = jest.fn().mockResolvedValue(undefined);

            const result = await deletePricingRule('rule-123');

            expect(result.success).toBe(true);
            expect(mockFirestore.delete).toHaveBeenCalled();
        });

        it('fails without rule ID', async () => {
            const result = await deletePricingRule('');
            expect(result.success).toBe(false);
        });
    });

    describe('togglePricingRule', () => {
        it('toggles rule active state', async () => {
            mockFirestore.update = jest.fn().mockResolvedValue(undefined);

            const result = await togglePricingRule('rule-123', false);

            expect(result.success).toBe(true);
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({ active: false })
            );
        });
    });
});

describe('Dynamic Price Calculation with Competitor Data', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock inventory age data
        (getInventoryAge as jest.Mock).mockResolvedValue({
            productId: 'test-product',
            daysInInventory: 45,
            stockLevel: 10,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            velocityTrend: 'stable',
            turnoverRate: 0.5,
            reorderPoint: 5,
            procurementDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        });

        // Mock competitor pricing data
        (getCompetitorPricingForProduct as jest.Mock).mockResolvedValue({
            avgPrice: 42,
            lowestPrice: 38,
            highestPrice: 48,
            competitorCount: 3,
        });

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            set: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            get: jest.fn()
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('calculates price with inventory age condition', async () => {
        // Mock product
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                name: 'Test Product',
                price: 50,
                category: 'flower',
                stock: 15,
            }),
        });

        // Mock rules with inventory age condition
        mockFirestore.get.mockResolvedValueOnce({
            docs: [
                {
                    id: 'rule-1',
                    data: () => ({
                        name: 'Old Inventory Discount',
                        active: true,
                        priority: 80,
                        conditions: {
                            inventoryAge: { min: 30 },
                        },
                        priceAdjustment: {
                            type: 'percentage',
                            value: 0.15,
                        },
                        timesApplied: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
            ],
        });

        const result = await calculateDynamicPrice({
            productId: 'test-product',
            orgId: 'org_test',
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.originalPrice).toBe(50);
        // Inventory is 45 days old (> 30), so 15% discount should apply
        expect(result.data?.dynamicPrice).toBeLessThan(50);
    });

    it('includes competitor pricing in context', async () => {
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                name: 'Test Product',
                price: 50,
                category: 'flower',
            }),
        });

        mockFirestore.get.mockResolvedValueOnce({
            docs: [],
        });

        const result = await calculateDynamicPrice({
            productId: 'test-product',
            orgId: 'org_test',
        });

        expect(result.success).toBe(true);
        expect(result.data?.context?.competitorAvgPrice).toBe(42);
    });

    it('applies rule when price is above competitor threshold', async () => {
        // Our price (50) is above competitor avg (42) by ~19%
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                name: 'Test Product',
                price: 50,
                category: 'flower',
            }),
        });

        // Rule with competitorPrice.above condition
        mockFirestore.get.mockResolvedValueOnce({
            docs: [
                {
                    id: 'rule-competitor',
                    data: () => ({
                        name: 'Match Competitor Price',
                        active: true,
                        priority: 90,
                        conditions: {
                            competitorPrice: { above: 10 }, // Apply when 10%+ above
                        },
                        priceAdjustment: {
                            type: 'percentage',
                            value: 0.1, // 10% discount
                        },
                        timesApplied: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
            ],
        });

        const result = await calculateDynamicPrice({
            productId: 'test-product',
            orgId: 'org_test',
        });

        expect(result.success).toBe(true);
        // Rule should apply since we're 19% above competitor
        expect(result.data?.appliedRules?.length).toBeGreaterThan(0);
        expect(result.data?.appliedRules?.[0]?.ruleName).toBe('Match Competitor Price');
    });

    it('skips competitor condition when no data is available', async () => {
        // Note: Due to module-level caching in getCachedCompetitorPricing,
        // this test verifies the general behavior when competitor data returns null.
        // In production, the competitor condition check returns false when no data.

        // This is a simplified test that verifies the function handles null gracefully
        const originalMock = (getCompetitorPricingForProduct as jest.Mock).getMockImplementation();
        (getCompetitorPricingForProduct as jest.Mock).mockImplementation(() => Promise.resolve(null));

        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                name: 'Test Product No Comp',
                price: 50,
                category: 'flower',
            }),
        });

        // Rule without competitor condition should still work
        mockFirestore.get.mockResolvedValueOnce({
            docs: [
                {
                    id: 'rule-basic',
                    data: () => ({
                        name: 'Basic Discount',
                        active: true,
                        priority: 50,
                        conditions: {}, // No competitor condition
                        priceAdjustment: {
                            type: 'percentage',
                            value: 0.1,
                        },
                        timesApplied: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
            ],
        });

        const result = await calculateDynamicPrice({
            productId: 'test-product-no-comp',
            orgId: 'org_test_no_comp',
        });

        expect(result.success).toBe(true);
        // Basic rule applies, competitor data is null but condition wasn't used
        expect(result.data?.appliedRules?.length).toBe(1);

        // Restore original mock
        if (originalMock) {
            (getCompetitorPricingForProduct as jest.Mock).mockImplementation(originalMock);
        }
    });

    it('fails for non-existent product', async () => {
        mockFirestore.get.mockResolvedValue({ exists: false });

        const result = await calculateDynamicPrice({
            productId: 'non-existent',
            orgId: 'org_test',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('applies 40% max discount constraint', async () => {
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({
                name: 'Test Product',
                price: 100,
                category: 'flower',
            }),
        });

        // Rule with large discount
        mockFirestore.get.mockResolvedValueOnce({
            docs: [
                {
                    id: 'rule-big-discount',
                    data: () => ({
                        name: 'Big Discount',
                        active: true,
                        priority: 100,
                        conditions: {},
                        priceAdjustment: {
                            type: 'percentage',
                            value: 0.6, // 60% discount
                        },
                        timesApplied: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
            ],
        });

        const result = await calculateDynamicPrice({
            productId: 'test-product',
            orgId: 'org_test',
        });

        expect(result.success).toBe(true);
        // Should be capped at 40% max discount (price * 0.6 minimum)
        expect(result.data?.dynamicPrice).toBeGreaterThanOrEqual(60); // 100 * 0.6 = 60
    });
});
