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

type HistoricalOrderField = 'brandId' | 'orgId' | 'retailerId' | 'dispensaryId';

type MockDoc = {
  id: string;
  data: Record<string, unknown>;
};

type MockTenant = {
  data?: Record<string, unknown> | null;
  products?: MockDoc[];
};

function makeTimestamp(value: string) {
  const date = new Date(value);
  return {
    toDate: () => date,
  };
}

function makeSnapshot(data: Record<string, unknown> | null | undefined) {
  return {
    exists: !!data,
    data: () => data ?? undefined,
  };
}

function createFirestoreMock(options?: {
  ordersByField?: Partial<Record<HistoricalOrderField, Record<string, MockDoc[]>>>;
  tenantDocs?: Record<string, MockTenant>;
  tenantAliasDocs?: MockDoc[];
  brandDocs?: Record<string, Record<string, unknown>>;
  brandByOrgDocs?: MockDoc[];
  rootProducts?: MockDoc[];
}) {
  const batchSet = jest.fn();
  const batchCommit = jest.fn().mockResolvedValue(undefined);
  const refCache = new Map<string, FirebaseFirestore.DocumentReference>();

  const getTenantProduct = (tenantId: string, docId: string) =>
    options?.tenantDocs?.[tenantId]?.products?.find((product) => product.id === docId) ?? null;

  const getRootProduct = (docId: string) =>
    options?.rootProducts?.find((product) => product.id === docId) ?? null;

  const createRef = (
    path: string,
    resolver: () => Record<string, unknown> | null | undefined,
  ) => {
    if (!refCache.has(path)) {
      refCache.set(path, {
        path,
        get: jest.fn(async () => makeSnapshot(resolver())),
      } as unknown as FirebaseFirestore.DocumentReference);
    }

    return refCache.get(path)!;
  };

  const makeQueryDoc = (path: string, doc: MockDoc) => ({
    id: doc.id,
    ref: createRef(path, () => doc.data),
    data: () => doc.data,
    get: (field: string) => doc.data[field],
  });

  const ordersCollection = {
    where: jest.fn((field: HistoricalOrderField, _operator: string, candidateId: string) => {
      const docs = (options?.ordersByField?.[field]?.[candidateId] ?? []).map((doc) =>
        makeQueryDoc(`orders/${doc.id}`, doc),
      );

      return {
        where: jest.fn((_createdAtField: string, _createdAtOperator: string, _lookbackDate: Date) => ({
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({ docs })),
          })),
          get: jest.fn(async () => ({ docs })),
        })),
        limit: jest.fn(() => ({
          get: jest.fn(async () => ({ docs })),
        })),
        get: jest.fn(async () => ({ docs })),
      };
    }),
    doc: jest.fn((orderId: string) => createRef(`orders/${orderId}`, () => null)),
  };

  const productsCollection = {
    doc: jest.fn((productId: string) =>
      createRef(`products/${productId}`, () => getRootProduct(productId)?.data ?? null),
    ),
    where: jest.fn((field: 'orgId' | 'dispensaryId' | 'brandId', _operator: string, candidateId: string) => ({
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: (options?.rootProducts ?? [])
            .filter((product) => product.data[field] === candidateId)
            .map((product) => makeQueryDoc(`products/${product.id}`, product)),
        })),
      })),
    })),
    get: jest.fn(),
  };

  const brandsCollection = {
    doc: jest.fn((brandId: string) => ({
      get: jest.fn(async () => makeSnapshot(options?.brandDocs?.[brandId] ?? null)),
    })),
    where: jest.fn((field: 'orgId', _operator: string, candidateId: string) => ({
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: (options?.brandByOrgDocs ?? [])
            .filter((doc) => doc.data[field] === candidateId)
            .map((doc) => makeQueryDoc(`brands/${doc.id}`, doc)),
        })),
      })),
    })),
  };

  const tenantsCollection = {
    doc: jest.fn((tenantId: string) => ({
      get: jest.fn(async () => makeSnapshot(options?.tenantDocs?.[tenantId]?.data ?? null)),
      collection: jest.fn((collectionName: string) => {
        if (collectionName !== 'publicViews') {
          throw new Error(`Unexpected tenant collection: ${collectionName}`);
        }

        return {
          doc: jest.fn((docId: string) => {
            if (docId !== 'products') {
              throw new Error(`Unexpected tenant doc: ${docId}`);
            }

            return {
              collection: jest.fn((innerCollectionName: string) => {
                if (innerCollectionName !== 'items') {
                  throw new Error(`Unexpected tenant inner collection: ${innerCollectionName}`);
                }

                return {
                  doc: jest.fn((itemId: string) =>
                    createRef(
                      `tenants/${tenantId}/publicViews/products/items/${itemId}`,
                      () => getTenantProduct(tenantId, itemId)?.data ?? null,
                    ),
                  ),
                  limit: jest.fn(() => ({
                    get: jest.fn(async () => ({
                      docs: (options?.tenantDocs?.[tenantId]?.products ?? [])
                        .map((product) =>
                          makeQueryDoc(
                            `tenants/${tenantId}/publicViews/products/items/${product.id}`,
                            product,
                          ),
                        ),
                    })),
                  })),
                };
              }),
            };
          }),
        };
      }),
    })),
    where: jest.fn((field: 'orgId', _operator: string, candidateId: string) => ({
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: (options?.tenantAliasDocs ?? [])
            .filter((doc) => doc.data[field] === candidateId)
            .map((doc) => makeQueryDoc(`tenants/${doc.id}`, doc)),
        })),
      })),
    })),
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
        return productsCollection;
      }

      if (name === 'tenants') {
        return tenantsCollection;
      }

      if (name === 'brands') {
        return brandsCollection;
      }

      if (name === 'bundles') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn(async () => makeSnapshot(null)),
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
    ordersCollection,
    getTenantProductRef: (tenantId: string, productId: string) =>
      createRef(`tenants/${tenantId}/publicViews/products/items/${productId}`, () => getTenantProduct(tenantId, productId)?.data ?? null),
    getRootProductRef: (productId: string) =>
      createRef(`products/${productId}`, () => getRootProduct(productId)?.data ?? null),
  };
}

describe('order-analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('backfills brand-scoped orders into tenant catalog product docs', async () => {
    const { db, batchSet, batchCommit, ordersCollection, getTenantProductRef } = createFirestoreMock({
      ordersByField: {
        brandId: {
          org_thrive_syracuse: [{
            id: 'order-1',
            data: {
              createdAt: makeTimestamp('2026-04-15T12:00:00.000Z'),
              items: [{
                productId: 'ext-1',
                qty: 3,
              }],
            },
          }],
        },
      },
      tenantDocs: {
        org_thrive_syracuse: {
          data: { brandId: 'org_thrive_syracuse' },
          products: [{
            id: 'tenant-product-doc',
            data: {
              externalId: 'ext-1',
              salesCount: 1,
              salesLast7Days: 0,
              salesLast30Days: 0,
            },
          }],
        },
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await backfillHistoricalSalesData('org_thrive_syracuse', 365);

    expect(result).toEqual({ processed: 1, updated: 1 });
    expect(ordersCollection.where).toHaveBeenCalledWith('brandId', '==', 'org_thrive_syracuse');
    expect(batchSet).toHaveBeenCalledWith(
      getTenantProductRef('org_thrive_syracuse', 'tenant-product-doc'),
      expect.objectContaining({
        salesCount: 3,
        salesLast7Days: 0,
        salesLast30Days: 3,
        salesVelocity: 0,
        trending: false,
      }),
      { merge: true },
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('backfills alias-scoped brand orders into root catalog docs when tenant mirrors are absent', async () => {
    const { db, batchSet, getRootProductRef, ordersCollection } = createFirestoreMock({
      ordersByField: {
        retailerId: {
          brand_ecstatic_edibles: [{
            id: 'ship-1',
            data: {
              createdAt: makeTimestamp('2026-04-15T15:00:00.000Z'),
              items: [{
                productId: 'prod_cheesecake',
                qty: 2,
              }],
            },
          }],
        },
      },
      tenantDocs: {
        org_ecstatic_edibles: {
          data: { brandId: 'brand_ecstatic_edibles' },
          products: [],
        },
      },
      brandDocs: {
        brand_ecstatic_edibles: {
          orgId: 'org_ecstatic_edibles',
          slug: 'ecstaticedibles',
        },
      },
      rootProducts: [{
        id: 'prod_cheesecake',
        data: {
          brandId: 'brand_ecstatic_edibles',
          name: 'Cheesecake',
          stock: 4,
        },
      }],
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const result = await backfillHistoricalSalesData('org_ecstatic_edibles', 365);

    expect(result).toEqual({ processed: 1, updated: 1 });
    expect(ordersCollection.where).toHaveBeenCalledWith('retailerId', '==', 'brand_ecstatic_edibles');
    expect(batchSet).toHaveBeenCalledWith(
      getRootProductRef('prod_cheesecake'),
      expect.objectContaining({
        salesCount: 2,
        salesLast7Days: 0,
        salesLast30Days: 2,
        salesVelocity: 0,
      }),
      { merge: true },
    );
  });

  it('records live sales against tenant catalog docs even when no legacy product doc exists', async () => {
    const purchasedAt = new Date('2026-04-16T10:00:00.000Z');
    const { db, batchSet, batchCommit, getTenantProductRef } = createFirestoreMock({
      tenantDocs: {
        org_thrive_syracuse: {
          products: [{
            id: 'tenant-product-doc',
            data: {
              externalId: 'ext-1',
              salesCount: 2,
              salesLast7Days: 1,
              salesLast30Days: 4,
            },
          }],
        },
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
      getTenantProductRef('org_thrive_syracuse', 'tenant-product-doc'),
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
