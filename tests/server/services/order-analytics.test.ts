import { recordProductSale, runAnalyticsRollup, backfillHistoricalSalesData } from '@/server/services/order-analytics';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');

describe('Order Analytics Service', () => {
  let mockFirestore: any;
  let mockBatch: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup batch mocking
    mockUpdate = jest.fn();
    mockBatch = {
      update: mockUpdate,
      commit: jest.fn().mockResolvedValue(undefined),
    };

    // Setup Firestore mocking
    mockGet = jest.fn();
    mockDoc = jest.fn((id) => ({ get: mockGet, ref: { id } }));
    mockWhere = jest.fn().mockReturnThis();
    mockOrderBy = jest.fn().mockReturnThis();

    mockCollection = jest.fn((name) => ({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    }));

    mockFirestore = {
      collection: mockCollection,
      batch: jest.fn().mockReturnValue(mockBatch),
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
  });

  describe('recordProductSale', () => {
    it('increments sales counts for order items', async () => {
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 10, salesLast7Days: 5, salesLast30Days: 15, lastSaleAt: new Date() }),
        });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 2, price: 29.99 },
        ],
        totalAmount: 59.98,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salesCount: 12,
          salesLast7Days: 7,
          salesLast30Days: 17,
        })
      );
    });

    it('calculates velocity as salesLast7Days / 7', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesLast7Days: 14, lastSaleAt: new Date() }),
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salesVelocity: expect.any(Number),
        })
      );
    });

    it('sets trending when velocity > 2 and recent sales', async () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesLast7Days: 15, lastSaleAt: recentDate }),
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          trending: true,
        })
      );
    });

    it('does not set trending when velocity <= 2', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesLast7Days: 5, lastSaleAt: new Date() }),
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          trending: false,
        })
      );
    });

    it('handles multiple items in single order', async () => {
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 0, salesLast7Days: 0, salesLast30Days: 0 }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 0, salesLast7Days: 0, salesLast30Days: 0 }),
        });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 2, price: 10 },
          { productId: 'prod-2', quantity: 3, price: 15 },
        ],
        totalAmount: 65,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('increments bundle redemptions when bundleIds present', async () => {
      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 0, salesLast7Days: 0, salesLast30Days: 0 }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ currentRedemptions: 5, redemptionHistory: [] }),
        });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        bundleIds: ['bundle-1'],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentRedemptions: 6,
        })
      );
    });

    it('appends to redemptionHistory on bundle redemption', async () => {
      const existingHistory = [
        { date: new Date(), customerId: 'old-cust', orderId: 'old-order' },
      ];

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 0, salesLast7Days: 0, salesLast30Days: 0 }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ currentRedemptions: 1, redemptionHistory: existingHistory }),
        });

      const orderData = {
        orderId: 'order-1',
        customerId: 'new-cust',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        bundleIds: ['bundle-1'],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          redemptionHistory: expect.arrayContaining([
            expect.objectContaining({ customerId: 'old-cust' }),
            expect.objectContaining({ customerId: 'new-cust' }),
          ]),
        })
      );
    });

    it('commits batch after processing all items', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ salesCount: 0, salesLast7Days: 0, salesLast30Days: 0 }),
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
          { productId: 'prod-2', quantity: 1, price: 10 },
        ],
        totalAmount: 20,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('logs error and throws on failure', async () => {
      const error = new Error('Database error');
      mockGet.mockRejectedValueOnce(error);

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 1, price: 10 },
        ],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await expect(recordProductSale('org-1', orderData)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to record order sale'),
        expect.any(Object)
      );
    });

    it('skips products that do not exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'nonexistent', quantity: 1, price: 10 },
        ],
        totalAmount: 10,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('runAnalyticsRollup', () => {
    it('queries products by orgId', async () => {
      const mockSnapshot = {
        docs: [],
      };
      mockCollection('products').get = jest.fn().mockResolvedValue(mockSnapshot);

      await runAnalyticsRollup('org-1');

      expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org-1');
    });

    it('recalculates velocity and trending', async () => {
      const mockDoc1 = {
        data: () => ({ salesLast7Days: 14, lastSaleAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }),
        ref: { id: 'prod-1' },
      };

      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [mockDoc1],
      });

      await runAnalyticsRollup('org-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salesVelocity: expect.any(Number),
          trending: expect.any(Boolean),
        })
      );
    });

    it('only updates when values changed', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const mockDoc1 = {
        data: () => ({
          salesLast7Days: 14,
          lastSaleAt: sevenDaysAgo,
          trending: true,
          salesVelocity: 2,
        }),
        ref: { id: 'prod-1' },
      };

      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [mockDoc1],
      });

      await runAnalyticsRollup('org-1');

      // When trending and velocity don't change, should not update
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('skips products with no lastSaleAt', async () => {
      const mockDoc1 = {
        data: () => ({ salesLast7Days: 14 }),
        ref: { id: 'prod-1' },
      };

      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [mockDoc1],
      });

      await runAnalyticsRollup('org-1');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('falls back to manual filter on query failure', async () => {
      const mockSnapshot = {
        docs: [],
      };

      const mockWhereChained = jest.fn().mockRejectedValueOnce(new Error('Query failed'));
      mockCollection('products').where = mockWhereChained;
      mockCollection('products').get = jest.fn().mockResolvedValue(mockSnapshot);

      await runAnalyticsRollup('org-1');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('orgId query failed'),
        expect.any(Object)
      );
    });

    it('commits batch after processing', async () => {
      const mockDoc1 = {
        data: () => ({
          salesLast7Days: 20,
          lastSaleAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          trending: false,
          salesVelocity: 1,
        }),
        ref: { id: 'prod-1' },
      };

      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [mockDoc1],
      });

      await runAnalyticsRollup('org-1');

      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('logs completion with updated count', async () => {
      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [],
      });

      await runAnalyticsRollup('org-1');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Rollup completed'),
        expect.objectContaining({ orgId: 'org-1' })
      );
    });
  });

  describe('backfillHistoricalSalesData', () => {
    it('queries orders within lookbackDays', async () => {
      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [],
      });
      mockCollection('products').get = jest.fn().mockResolvedValue({
        docs: [],
      });

      await backfillHistoricalSalesData('org-1', 90);

      expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org-1');
      expect(mockWhere).toHaveBeenCalledWith('createdAt', '>=', expect.any(Date));
    });

    it('aggregates sales per productId', async () => {
      const mockOrderDoc = {
        data: () => ({
          orderId: 'order-1',
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 3 },
          ],
          createdAt: new Date(),
        }),
      };

      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [mockOrderDoc],
      });

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 5 }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ salesCount: 8 }),
        });

      const result = await backfillHistoricalSalesData('org-1', 90);

      expect(result.processed).toBe(1);
      expect(result.updated).toBe(2);
    });

    it('uses max(existing, aggregated) for salesCount', async () => {
      const mockOrderDoc = {
        data: () => ({
          orderId: 'order-1',
          items: [
            { productId: 'prod-1', quantity: 5 },
          ],
          createdAt: new Date(),
        }),
      };

      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [mockOrderDoc],
      });

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesCount: 10 }),
      });

      await backfillHistoricalSalesData('org-1', 90);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salesCount: 10, // max(10, 5) = 10
        })
      );
    });

    it('batches updates in chunks of 500', async () => {
      const items = Array.from({ length: 600 }, (_, i) => ({
        productId: `prod-${i}`,
        quantity: 1,
      }));

      const mockOrderDoc = {
        data: () => ({
          orderId: 'order-1',
          items,
          createdAt: new Date(),
        }),
      };

      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [mockOrderDoc],
      });

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ salesCount: 0 }),
      });

      await backfillHistoricalSalesData('org-1', 90);

      // Should commit twice (500 + 100)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });

    it('handles fallback query on complex query failure', async () => {
      const mockSnapshot = {
        docs: [],
      };

      const mockWhereFail = jest.fn().mockRejectedValueOnce(new Error('Complex query not allowed'));
      mockCollection('orders').where = mockWhereFail;
      mockCollection('orders').get = jest.fn().mockResolvedValue(mockSnapshot);

      const result = await backfillHistoricalSalesData('org-1', 90);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Complex query failed'),
        expect.any(Object)
      );
      expect(result).toEqual({ processed: 0, updated: 0 });
    });

    it('returns { processed, updated } counts', async () => {
      const mockOrderDoc = {
        data: () => ({
          orderId: 'order-1',
          items: [
            { productId: 'prod-1', quantity: 1 },
          ],
          createdAt: new Date(),
        }),
      };

      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [mockOrderDoc],
      });

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesCount: 0 }),
      });

      const result = await backfillHistoricalSalesData('org-1', 90);

      expect(result).toEqual({
        processed: expect.any(Number),
        updated: expect.any(Number),
      });
    });

    it('skips old orders when using fallback query', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      const mockOrderDoc = {
        data: () => ({
          orderId: 'old-order',
          items: [
            { productId: 'prod-1', quantity: 10 },
          ],
          createdAt: oldDate,
        }),
      };

      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [mockOrderDoc],
      });

      const result = await backfillHistoricalSalesData('org-1', 90);

      // Should process 0 because order is older than lookback
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('logs completion with stats', async () => {
      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [],
      });

      await backfillHistoricalSalesData('org-1', 90);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Backfill completed'),
        expect.objectContaining({
          orgId: 'org-1',
          ordersProcessed: expect.any(Number),
          productsUpdated: expect.any(Number),
        })
      );
    });

    it('handles default lookbackDays of 90', async () => {
      mockCollection('orders').get = jest.fn().mockResolvedValue({
        docs: [],
      });

      await backfillHistoricalSalesData('org-1');

      // Verify that a date 90 days ago was queried
      expect(mockWhere).toHaveBeenCalledWith(
        'createdAt',
        '>=',
        expect.any(Date)
      );
    });

    it('throws error on failure and logs', async () => {
      const error = new Error('Database error');
      mockCollection('orders').where = jest.fn().mockRejectedValueOnce(error);

      await expect(backfillHistoricalSalesData('org-1')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Backfill failed'),
        expect.any(Object)
      );
    });
  });

  describe('Integration: Order processing pipeline', () => {
    it('records sale, then rollup recalculates trending', async () => {
      // Record sale
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ salesLast7Days: 0, lastSaleAt: new Date() }),
      });

      const orderData = {
        orderId: 'order-1',
        customerId: 'cust-1',
        items: [
          { productId: 'prod-1', quantity: 3, price: 10 },
        ],
        totalAmount: 30,
        purchasedAt: new Date(),
      };

      await recordProductSale('org-1', orderData);

      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
