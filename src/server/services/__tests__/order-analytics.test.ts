import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { backfillHistoricalSalesData, recordProductSale } from '../order-analytics';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../pos-product-doc-id', () => ({
  buildTenantPosProductDocId: jest.fn(() => 'tenant-product-doc'),
}));

function makeTimestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
  };
}

function makeSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: !!data,
    data: () => data ?? undefined,
  };
}

function createFirestoreMock(options?: {
  ordersByField?: Partial<Record<'brandId' | 'orgId' | 'retailerId', Array<Record<string, unknown>>>>;
  tenantProduct?: Record<string, unknown> | null;
  legacyProduct?: Record<string, unknown> | null;
}) {
  const batchSet = jest.fn();
  const batchCommit = jest.fn().mockResolvedValue(undefined);

  const tenantProductRef = {
    path: 'tenants/org_thrive_syracuse/publicViews/products/items/tenant-product-doc',
    get: jest.fn().mockResolvedValue(makeSnapshot(options?.tenantProduct ?? null)),
  };
  const tenantCatalogDoc = {
    id: 'tenant-product-doc',
    ref: tenantProductRef,
    get: jest.fn((field: string) => (field === 'externalId' ? 'ext-1' : undefined)),
  };

  const legacyProductRef = {
    path: 'products/ext-1',
    get: jest.fn().mockResolvedValue(makeSnapshot(options?.legacyProduct ?? null)),
  };

  const ordersCollection = {
    where: jest.fn((field: 'brandId' | 'orgId' | 'retailerId') => ({
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          docs: (options?.ordersByField?.[field] ?? []).map((order) => ({
            data: () => order,
          })),
        }),
      })),
      get: jest.fn().mockResolvedValue({
        docs: (options?.ordersByField?.[field] ?? []).map((order) => ({
          data: () => order,
        })),
      }),
    })),
    doc: jest.fn(() => legacyProductRef),
  };

  const db = {
    batch: jest.fn(() => ({
      set: batchSet,
      update: jest.fn(),
      commit: batchCommit,
    })),
    collection: jest.fn((name: string) => {
      if (name === 'orders') {
        return ordersCollection;
      }

      if (name === 'products') {
        return {
          doc: jest.fn(() => legacyProductRef),
          where: jest.fn(),
          get: jest.fn(),
        };
      }

      if (name === 'tenants') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({
                collection: jest.fn(() => ({
                  doc: jest.fn(() => tenantProductRef),
                  limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({
                      docs: options?.tenantProduct ? [tenantCatalogDoc] : [],
                    }),
                  })),
                })),
              })),
            })),
          })),
        };
      }

      if (name === 'bundles') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(makeSnapshot(null)),
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return {
    db,
    batchSet,
    batchCommit,
    tenantProductRef,
    legacyProductRef,
    ordersCollection,
  };
}

describe('order-analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('backfills brand-scoped orders into tenant catalog product docs', async () => {
    const { db, batchSet, batchCommit, tenantProductRef, ordersCollection } = createFirestoreMock({
      ordersByField: {
        brandId: [{
          createdAt: makeTimestamp('2026-04-15T12:00:00.000Z'),
          items: [{
            productId: 'ext-1',
            qty: 3,
          }],
        }],
      },
      tenantProduct: {
        salesCount: 1,
        salesLast7Days: 0,
        salesLast30Days: 0,
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await backfillHistoricalSalesData('org_thrive_syracuse', 365);

    expect(result).toEqual({ processed: 1, updated: 1 });
    expect(ordersCollection.where).toHaveBeenCalledWith('brandId', '==', 'org_thrive_syracuse');
    expect(batchSet).toHaveBeenCalledWith(
      tenantProductRef,
      expect.objectContaining({
        salesCount: 3,
        salesLast7Days: 3,
        salesLast30Days: 3,
        salesVelocity: 3 / 7,
        trending: false,
      }),
      { merge: true },
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('records live sales against tenant catalog docs even when no legacy product doc exists', async () => {
    const purchasedAt = new Date('2026-04-16T10:00:00.000Z');
    const { db, batchSet, batchCommit, tenantProductRef } = createFirestoreMock({
      tenantProduct: {
        salesCount: 2,
        salesLast7Days: 1,
        salesLast30Days: 4,
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    await recordProductSale('org_thrive_syracuse', {
      customerId: 'cust_1',
      orderId: 'order_1',
      items: [{
        productId: 'ext-1',
        quantity: 2,
        price: 18,
      }],
      totalAmount: 36,
      purchasedAt,
    });

    expect(batchSet).toHaveBeenCalledWith(
      tenantProductRef,
      expect.objectContaining({
        salesCount: 4,
        salesLast7Days: 3,
        salesLast30Days: 6,
        salesVelocity: 3 / 7,
        lastSaleAt: purchasedAt,
      }),
      { merge: true },
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('No analytics product target found for sale'),
      expect.anything(),
    );
  });
});
