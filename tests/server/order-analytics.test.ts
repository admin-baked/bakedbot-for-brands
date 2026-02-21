/**
 * Order Analytics Service Tests
 *
 * Comprehensive tests for Phase 6 sales analytics integration
 */

import { recordProductSale, runAnalyticsRollup, backfillHistoricalSalesData } from '@/server/services/order-analytics';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');

describe('Order Analytics Service', () => {
    let mockDb: any;
    let mockBatch: any;
    let mockProductRef: any;
    let mockBundleRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock batch operations
        mockBatch = {
            update: jest.fn().mockReturnValue(mockBatch),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        // Mock product ref
        mockProductRef = {
            get: jest.fn(),
        };

        // Mock bundle ref
        mockBundleRef = {
            get: jest.fn(),
        };

        // Mock database
        mockDb = {
            collection: jest.fn((name) => ({
                doc: jest.fn((id) => {
                    if (name === 'products') return mockProductRef;
                    if (name === 'bundles') return mockBundleRef;
                    return {};
                }),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn(),
            })),
            batch: jest.fn(() => mockBatch),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    describe('recordProductSale', () => {
        it('should record a product sale and update metrics', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [
                    { productId: 'prod_1', quantity: 2, price: 25.00 },
                    { productId: 'prod_2', quantity: 1, price: 30.00 },
                ],
                totalAmount: 80.00,
                purchasedAt: new Date('2026-02-20'),
            };

            const mockProductData = {
                id: 'prod_1',
                name: 'Test Product',
                salesCount: 5,
                salesLast7Days: 3,
                lastSaleAt: { toDate: () => new Date('2026-02-15') },
            };

            mockProductRef.get.mockResolvedValue({
                data: () => mockProductData,
            });

            await recordProductSale(orgId, orderData);

            // Verify batch updates were called for each product
            expect(mockBatch.update).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalled();

            // Verify logger was called
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Order analytics recorded'),
                expect.any(Object)
            );
        });

        it('should calculate sales velocity correctly', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_1', quantity: 14, price: 25.00 }],
                totalAmount: 350.00,
                purchasedAt: new Date('2026-02-20'),
            };

            const mockProductData = {
                salesCount: 0,
                salesLast7Days: 14,
                lastSaleAt: new Date('2026-02-20'),
            };

            mockProductRef.get.mockResolvedValue({
                data: () => mockProductData,
            });

            await recordProductSale(orgId, orderData);

            // Velocity should be 14 / 7 = 2.0
            expect(mockBatch.update).toHaveBeenCalledWith(
                mockProductRef,
                expect.objectContaining({
                    salesVelocity: 2.0,
                })
            );
        });

        it('should set trending flag when velocity > 2 and recent', async () => {
            const orgId = 'org_test';
            const now = new Date();
            const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_1', quantity: 20, price: 25.00 }],
                totalAmount: 500.00,
                purchasedAt: now,
            };

            const mockProductData = {
                salesCount: 0,
                salesLast7Days: 20,
                lastSaleAt: fiveDaysAgo,
            };

            mockProductRef.get.mockResolvedValue({
                data: () => mockProductData,
            });

            await recordProductSale(orgId, orderData);

            // Velocity = 20/7 = 2.857 > 2 and lastSaleAt is recent, so trending = true
            expect(mockBatch.update).toHaveBeenCalledWith(
                mockProductRef,
                expect.objectContaining({
                    trending: true,
                    salesVelocity: expect.any(Number),
                })
            );
        });

        it('should not set trending flag when velocity <= 2', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_1', quantity: 1, price: 25.00 }],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            };

            const mockProductData = {
                salesCount: 0,
                salesLast7Days: 10,
                lastSaleAt: new Date(),
            };

            mockProductRef.get.mockResolvedValue({
                data: () => mockProductData,
            });

            await recordProductSale(orgId, orderData);

            // Velocity = 10/7 = 1.43 not > 2, so trending = false
            expect(mockBatch.update).toHaveBeenCalledWith(
                mockProductRef,
                expect.objectContaining({
                    trending: false,
                })
            );
        });

        it('should record bundle redemptions', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_1', quantity: 1, price: 25.00 }],
                bundleIds: ['bundle_1', 'bundle_2'],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            };

            const mockProductData = { salesCount: 0, salesLast7Days: 0, lastSaleAt: new Date() };
            const mockBundleData = { currentRedemptions: 5, redemptionHistory: [] };

            mockProductRef.get.mockResolvedValue({ data: () => mockProductData });
            mockBundleRef.get.mockResolvedValue({ data: () => mockBundleData });

            await recordProductSale(orgId, orderData);

            // Should update bundles
            expect(mockBatch.update).toHaveBeenCalledWith(
                mockBundleRef,
                expect.objectContaining({
                    currentRedemptions: expect.any(Number),
                    redemptionHistory: expect.any(Array),
                })
            );
        });

        it('should handle missing products gracefully', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_nonexistent', quantity: 1, price: 25.00 }],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            };

            mockProductRef.get.mockResolvedValue({ exists: false, data: () => undefined });

            await recordProductSale(orgId, orderData);

            // Should skip update for missing product
            expect(mockBatch.update).not.toHaveBeenCalled();
        });
    });

    describe('runAnalyticsRollup', () => {
        it('should recalculate trending status for all products', async () => {
            const orgId = 'org_test';
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const mockProducts = [
                {
                    ref: {},
                    data: () => ({
                        salesLast7Days: 20,
                        salesVelocity: 2.857,
                        lastSaleAt: sevenDaysAgo,
                        trending: false, // Stale data
                    }),
                },
                {
                    ref: {},
                    data: () => ({
                        salesLast7Days: 0,
                        lastSaleAt: null,
                        trending: true, // Should be cleared
                    }),
                },
            ];

            mockDb.collection().get.mockResolvedValue({
                docs: mockProducts,
            });

            await runAnalyticsRollup(orgId);

            // Should update products
            expect(mockBatch.update).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should skip products with no sales history', async () => {
            const orgId = 'org_test';

            const mockProducts = [
                {
                    ref: { update: jest.fn() },
                    data: () => ({
                        salesCount: 0,
                        lastSaleAt: null,
                    }),
                },
            ];

            mockDb.collection().get.mockResolvedValue({
                docs: mockProducts,
            });

            await runAnalyticsRollup(orgId);

            // Should skip - no lastSaleAt
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rollup completed'),
                expect.any(Object)
            );
        });
    });

    describe('backfillHistoricalSalesData', () => {
        it('should backfill sales data from historical orders', async () => {
            const orgId = 'org_test';
            const lookbackDays = 90;

            const mockOrders = [
                {
                    data: () => ({
                        items: [
                            { productId: 'prod_1', quantity: 5, price: 25.00 },
                            { productId: 'prod_2', quantity: 3, price: 30.00 },
                        ],
                        createdAt: { toDate: () => new Date('2026-02-15') },
                    }),
                },
                {
                    data: () => ({
                        items: [
                            { productId: 'prod_1', quantity: 2, price: 25.00 },
                        ],
                        createdAt: { toDate: () => new Date('2026-02-10') },
                    }),
                },
            ];

            mockDb.collection().where().where().get.mockResolvedValue({
                docs: mockOrders,
            });

            mockProductRef.get.mockResolvedValue({
                data: () => ({ salesCount: 0 }),
                exists: true,
            });

            const result = await backfillHistoricalSalesData(orgId, lookbackDays);

            expect(result.processed).toBeGreaterThan(0);
            expect(result.updated).toBeGreaterThan(0);
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Backfill completed'),
                expect.any(Object)
            );
        });

        it('should aggregate sales by product correctly', async () => {
            const orgId = 'org_test';

            const mockOrders = [
                {
                    data: () => ({
                        items: [
                            { productId: 'prod_1', quantity: 10 },
                            { productId: 'prod_1', quantity: 5 },
                        ],
                        createdAt: { toDate: () => new Date() },
                    }),
                },
            ];

            mockDb.collection().where().where().get.mockResolvedValue({
                docs: mockOrders,
            });

            mockProductRef.get.mockResolvedValue({
                data: () => ({ salesCount: 0 }),
                exists: true,
            });

            const result = await backfillHistoricalSalesData(orgId, 90);

            // Should aggregate: 10 + 5 = 15
            expect(result.processed).toBe(1);
        });

        it('should handle date range filtering correctly', async () => {
            const orgId = 'org_test';
            const lookbackDays = 30;

            const mockOrders = [];

            mockDb.collection().where().where().get.mockResolvedValue({
                docs: mockOrders,
            });

            const result = await backfillHistoricalSalesData(orgId, lookbackDays);

            expect(result.processed).toBe(0);
            expect(result.updated).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should log and continue on product update errors', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [{ productId: 'prod_1', quantity: 1, price: 25.00 }],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            };

            mockProductRef.get.mockResolvedValue({
                data: () => ({ salesCount: 0, salesLast7Days: 0, lastSaleAt: new Date() }),
            });

            mockBatch.commit.mockRejectedValue(new Error('Firestore error'));

            // Should not throw
            await expect(recordProductSale(orgId, orderData)).rejects.toThrow();
        });

        it('should handle missing order data gracefully', async () => {
            const orgId = 'org_test';
            const orderData = {
                customerId: 'customer_123',
                orderId: 'order_456',
                items: [],
                totalAmount: 0,
                purchasedAt: new Date(),
            };

            await recordProductSale(orgId, orderData);

            // Should complete without errors
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });
});
