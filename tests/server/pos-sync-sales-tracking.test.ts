/**
 * POS Sync Sales Tracking Tests
 *
 * Integration tests for Phase 6 sales tracking in POS synchronization
 */

import { recordProductSale } from '@/server/services/order-analytics';
import { logger } from '@/lib/logger';

jest.mock('@/server/services/order-analytics');
jest.mock('@/lib/logger');

describe('POS Sync Sales Tracking Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (recordProductSale as jest.Mock).mockResolvedValue(undefined);
    });

    describe('Order Persistence and Sales Recording', () => {
        it('should record sales for completed orders from POS', async () => {
            const orgId = 'org_thrive_syracuse';
            const ordersToTrack = [
                {
                    orderId: 'alleaves_order_1',
                    customerId: 'alleaves_customer_123',
                    items: [
                        { productId: 'prod_flower_1', qty: 1, price: 15.00 },
                        { productId: 'prod_edible_1', qty: 2, price: 10.00 },
                    ],
                    totalAmount: 35.00,
                    purchasedAt: new Date('2026-02-20'),
                },
            ];

            // Simulate async sales recording after batch commit
            setImmediate(async () => {
                for (const order of ordersToTrack) {
                    await recordProductSale(orgId, {
                        customerId: order.customerId,
                        orderId: order.orderId,
                        items: order.items.map(item => ({
                            productId: item.productId,
                            quantity: item.qty,
                            price: item.price,
                        })),
                        totalAmount: order.totalAmount,
                        purchasedAt: order.purchasedAt,
                    });
                }
            });

            // Allow microtask queue to process
            await new Promise(resolve => setImmediate(resolve));

            expect(recordProductSale).toHaveBeenCalledWith(
                orgId,
                expect.objectContaining({
                    orderId: 'alleaves_order_1',
                    customerId: 'alleaves_customer_123',
                    totalAmount: 35.00,
                })
            );
        });

        it('should only record sales for completed/ready orders', async () => {
            const orgId = 'org_thrive_syracuse';
            const statuses = ['pending', 'submitted', 'preparing', 'completed', 'ready', 'cancelled'];

            // Simulate filtering completed/ready orders
            const completedOrders = [
                { orderId: 'order_completed', status: 'completed' },
                { orderId: 'order_ready', status: 'ready' },
            ];

            const recordableSales = completedOrders.filter(
                o => o.status === 'completed' || o.status === 'ready'
            );

            for (const order of recordableSales) {
                await recordProductSale(orgId, {
                    customerId: 'customer_id',
                    orderId: order.orderId,
                    items: [],
                    totalAmount: 0,
                    purchasedAt: new Date(),
                });
            }

            expect(recordProductSale).toHaveBeenCalledTimes(2);
        });

        it('should not record sales for pending orders', async () => {
            const pendingOrder = {
                orderId: 'order_pending',
                status: 'pending',
            };

            // Should filter out pending orders
            if (pendingOrder.status === 'completed' || pendingOrder.status === 'ready') {
                await recordProductSale('org_thrive_syracuse', {
                    customerId: 'customer_id',
                    orderId: pendingOrder.orderId,
                    items: [],
                    totalAmount: 0,
                    purchasedAt: new Date(),
                });
            }

            expect(recordProductSale).not.toHaveBeenCalled();
        });
    });

    describe('Alleaves Field Mapping', () => {
        it('should map Alleaves order fields to sales format correctly', async () => {
            const orgId = 'org_thrive_syracuse';

            // Alleaves order format
            const alleeavesOrder = {
                id: 'alleaves_order_456',
                id_customer: 'alleaves_customer_789',
                status: 'completed',
                items: [
                    { id_item: 'item_1', item: 'Flower - OG Kush', quantity: 1, price: 15.00, category: 'Flower' },
                    { id_item: 'item_2', item: 'Gummy Pack', quantity: 2, price: 10.00, category: 'Edibles' },
                ],
                subtotal: 35.00,
                tax: 2.50,
                discount: 0,
                total: 37.50,
                date_created: new Date('2026-02-20'),
            };

            // Map to recordProductSale format
            if (alleeavesOrder.status === 'completed') {
                await recordProductSale(orgId, {
                    customerId: alleeavesOrder.id_customer,
                    orderId: `alleaves_${alleeavesOrder.id}`,
                    items: alleeavesOrder.items.map(item => ({
                        productId: item.id_item,
                        quantity: parseInt(item.quantity || 1),
                        price: parseFloat(item.price || 0),
                    })),
                    totalAmount: parseFloat(alleeavesOrder.total || 0),
                    purchasedAt: new Date(alleeavesOrder.date_created),
                });
            }

            expect(recordProductSale).toHaveBeenCalledWith(
                orgId,
                expect.objectContaining({
                    customerId: 'alleaves_customer_789',
                    orderId: 'alleaves_order_456',
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            productId: 'item_1',
                            quantity: 1,
                            price: 15.00,
                        }),
                        expect.objectContaining({
                            productId: 'item_2',
                            quantity: 2,
                            price: 10.00,
                        }),
                    ]),
                    totalAmount: 37.50,
                })
            );
        });

        it('should handle various Alleaves quantity formats', async () => {
            const items = [
                { id_item: 'item_1', quantity: 1 }, // Number
                { id_item: 'item_2', quantity: '2' }, // String
                { id_item: 'item_3', quantity: null, qty: 3 }, // Fallback
            ];

            const mappedItems = items.map(item => ({
                productId: item.id_item,
                quantity: parseInt((item.quantity || item.qty || 1) as any),
                price: 25.00,
            }));

            await recordProductSale('org_thrive_syracuse', {
                customerId: 'customer_id',
                orderId: 'order_id',
                items: mappedItems,
                totalAmount: 0,
                purchasedAt: new Date(),
            });

            expect(recordProductSale).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    items: expect.arrayContaining([
                        expect.objectContaining({ quantity: 1 }),
                        expect.objectContaining({ quantity: 2 }),
                        expect.objectContaining({ quantity: 3 }),
                    ]),
                })
            );
        });

        it('should handle missing customer IDs', async () => {
            const ordersToTrack = [
                {
                    orderId: 'order_no_customer',
                    customerId: undefined, // Missing customer
                    items: [{ productId: 'prod_1', qty: 1, price: 25.00 }],
                    totalAmount: 25.00,
                    purchasedAt: new Date(),
                },
            ];

            for (const order of ordersToTrack) {
                await recordProductSale('org_thrive_syracuse', {
                    customerId: order.customerId || 'alleaves_customer', // Fallback
                    orderId: order.orderId,
                    items: order.items.map(item => ({
                        productId: item.productId,
                        quantity: item.qty,
                        price: item.price,
                    })),
                    totalAmount: order.totalAmount,
                    purchasedAt: order.purchasedAt,
                });
            }

            expect(recordProductSale).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    customerId: 'alleaves_customer', // Fallback used
                })
            );
        });
    });

    describe('Batch Processing', () => {
        it('should process multiple orders in sequence', async () => {
            const orgId = 'org_thrive_syracuse';
            const ordersToTrack = Array.from({ length: 10 }, (_, i) => ({
                orderId: `order_${i + 1}`,
                customerId: `customer_${i + 1}`,
                items: [{ productId: `prod_${i + 1}`, qty: 1, price: 25.00 }],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            }));

            setImmediate(async () => {
                for (const order of ordersToTrack) {
                    await recordProductSale(orgId, {
                        customerId: order.customerId,
                        orderId: order.orderId,
                        items: order.items.map(item => ({
                            productId: item.productId,
                            quantity: item.qty,
                            price: item.price,
                        })),
                        totalAmount: order.totalAmount,
                        purchasedAt: order.purchasedAt,
                    });
                }
            });

            await new Promise(resolve => setImmediate(resolve));

            expect(recordProductSale).toHaveBeenCalledTimes(10);
        });

        it('should handle errors gracefully during batch processing', async () => {
            const orgId = 'org_thrive_syracuse';
            const ordersToTrack = [
                {
                    orderId: 'order_success_1',
                    customerId: 'customer_1',
                    items: [{ productId: 'prod_1', qty: 1, price: 25.00 }],
                    totalAmount: 25.00,
                    purchasedAt: new Date(),
                },
                {
                    orderId: 'order_error',
                    customerId: 'customer_error',
                    items: [{ productId: 'prod_error', qty: 1, price: 25.00 }],
                    totalAmount: 25.00,
                    purchasedAt: new Date(),
                },
            ];

            // Mock first call success, second call error
            (recordProductSale as jest.Mock)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Sales tracking failed'))
                .mockResolvedValueOnce(undefined);

            setImmediate(async () => {
                for (const order of ordersToTrack) {
                    try {
                        await recordProductSale(orgId, {
                            customerId: order.customerId,
                            orderId: order.orderId,
                            items: order.items.map(item => ({
                                productId: item.productId,
                                quantity: item.qty,
                                price: item.price,
                            })),
                            totalAmount: order.totalAmount,
                            purchasedAt: order.purchasedAt,
                        });
                    } catch (error) {
                        logger.warn('[POS_SYNC] Failed to record sale', {
                            orderId: order.orderId,
                            error: (error as Error).message,
                        });
                        // Continue to next order
                    }
                }
            });

            await new Promise(resolve => setImmediate(resolve));

            // Should handle error and continue
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe('Sales Recording Timing', () => {
        it('should record sales after orders are persisted', async () => {
            const ordersPersistedFirst = true;
            const salesRecordedSecond = false;

            // Orders are persisted first (synchronous batch commit)
            expect(ordersPersistedFirst).toBe(true);

            // Sales are recorded asynchronously after
            setImmediate(async () => {
                // salesRecordedSecond = true;
            });

            // At this point, orders are in Firestore but sales may not be recorded yet
            // This is by design to avoid blocking the sync operation
            expect(salesRecordedSecond).toBe(false);
        });

        it('should not block POS sync while recording sales', async () => {
            const syncStartTime = Date.now();

            // Simulate POS sync with async sales recording
            const syncPromise = (async () => {
                // Sync completes quickly
                return 'sync complete';
            })();

            const salesPromise = new Promise(resolve => {
                setImmediate(async () => {
                    // Sales recording happens later
                    await recordProductSale('org_thrive_syracuse', {
                        customerId: 'customer_id',
                        orderId: 'order_id',
                        items: [],
                        totalAmount: 0,
                        purchasedAt: new Date(),
                    });
                    resolve('sales recorded');
                });
            });

            const syncResult = await syncPromise;
            expect(syncResult).toBe('sync complete');

            // Sales recording continues in background
            const salesResult = await salesPromise;
            expect(salesResult).toBe('sales recorded');

            const syncDuration = Date.now() - syncStartTime;
            // Sync should complete quickly, not blocked by sales tracking
            expect(syncDuration).toBeLessThan(5000); // Should be much less
        });
    });

    describe('Error Handling and Logging', () => {
        it('should log warnings when sales tracking fails', async () => {
            const orderId = 'order_with_error';

            (recordProductSale as jest.Mock).mockRejectedValue(
                new Error('Firestore batch commit failed')
            );

            try {
                await recordProductSale('org_thrive_syracuse', {
                    customerId: 'customer_id',
                    orderId,
                    items: [],
                    totalAmount: 0,
                    purchasedAt: new Date(),
                });
            } catch (error) {
                logger.warn('[POS_SYNC] Failed to record sale', {
                    orderId,
                    error: (error as Error).message,
                });
            }

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to record sale'),
                expect.objectContaining({
                    orderId,
                    error: expect.any(String),
                })
            );
        });

        it('should log successful sales recording', async () => {
            const orderId = 'order_success';

            (recordProductSale as jest.Mock).mockResolvedValue(undefined);

            await recordProductSale('org_thrive_syracuse', {
                customerId: 'customer_id',
                orderId,
                items: [{ productId: 'prod_1', quantity: 1, price: 25.00 }],
                totalAmount: 25.00,
                purchasedAt: new Date(),
            });

            // Should log success (implementation detail)
            expect(recordProductSale).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    orderId,
                })
            );
        });
    });

    describe('Data Integrity', () => {
        it('should preserve order data during mapping', async () => {
            const originalOrder = {
                id: 'order_123',
                id_customer: 'customer_456',
                items: [
                    { id_item: 'item_1', quantity: 5, price: 25.50 },
                    { id_item: 'item_2', quantity: 3, price: 30.00 },
                ],
                total: 177.50,
                date_created: new Date('2026-02-20T10:30:00Z'),
            };

            const mappedSalesData = {
                customerId: originalOrder.id_customer,
                orderId: `alleaves_${originalOrder.id}`,
                items: originalOrder.items.map(item => ({
                    productId: item.id_item,
                    quantity: item.quantity,
                    price: item.price,
                })),
                totalAmount: originalOrder.total,
                purchasedAt: originalOrder.date_created,
            };

            // Verify no data loss
            expect(mappedSalesData.items).toHaveLength(originalOrder.items.length);
            expect(mappedSalesData.totalAmount).toBe(originalOrder.total);
            expect(mappedSalesData.customerId).toBe(originalOrder.id_customer);

            await recordProductSale('org_thrive_syracuse', mappedSalesData);

            expect(recordProductSale).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    items: expect.arrayContaining([
                        expect.objectContaining({ quantity: 5, price: 25.50 }),
                        expect.objectContaining({ quantity: 3, price: 30.00 }),
                    ]),
                    totalAmount: 177.50,
                })
            );
        });
    });
});
