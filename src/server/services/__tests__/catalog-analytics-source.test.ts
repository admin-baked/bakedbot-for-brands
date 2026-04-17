import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { resolveCatalogAnalyticsScope } from '../catalog-analytics-scope';
import { loadCatalogAnalyticsProducts } from '../catalog-analytics-source';

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

type DocRecord = Record<string, unknown>;
type QueryDoc = { id: string; data: DocRecord };
type QueryField = 'orgId' | 'dispensaryId' | 'brandId';

function makeDocSnapshot(id: string, data: DocRecord | null) {
  return {
    id,
    exists: !!data,
    data: () => data ?? undefined,
  };
}

function makeQuerySnapshot(docs: QueryDoc[]) {
  return {
    docs: docs.map((doc) => makeDocSnapshot(doc.id, doc.data)),
  };
}

function createFirestoreMock() {
  const tenantDocs = new Map<string, DocRecord>([
    ['org_ecstatic_edibles', { brandId: 'brand_ecstatic_edibles' }],
    ['ecstaticedibles', { orgId: 'org_ecstatic_edibles', brandId: 'brand_ecstatic_edibles' }],
  ]);

  const tenantAliasDocs = new Map<string, QueryDoc[]>([
    ['org_ecstatic_edibles', [{
      id: 'ecstaticedibles',
      data: {
        orgId: 'org_ecstatic_edibles',
        brandId: 'brand_ecstatic_edibles',
      },
    }]],
  ]);

  const brandDocs = new Map<string, DocRecord>([
    ['brand_ecstatic_edibles', {
      orgId: 'org_ecstatic_edibles',
      slug: 'ecstaticedibles',
    }],
  ]);

  const brandByOrgDocs = new Map<string, QueryDoc[]>([
    ['org_ecstatic_edibles', [{
      id: 'brand_ecstatic_edibles',
      data: {
        orgId: 'org_ecstatic_edibles',
        slug: 'ecstaticedibles',
      },
    }]],
  ]);

  const tenantCatalogDocs = new Map<string, QueryDoc[]>([
    ['org_ecstatic_edibles', []],
    ['ecstaticedibles', []],
    ['brand_ecstatic_edibles', []],
  ]);

  const productsByField = {
    orgId: new Map<string, QueryDoc[]>([['org_ecstatic_edibles', []]]),
    dispensaryId: new Map<string, QueryDoc[]>([['org_ecstatic_edibles', []]]),
    brandId: new Map<string, QueryDoc[]>([['brand_ecstatic_edibles', [{
      id: 'prod_1',
      data: {
        productName: 'Blue Raspberry Gummies',
        category: 'Edibles',
        price: 18,
        stock: 24,
        salesLast30Days: 0,
        salesVelocity: 0,
        lastSaleAt: '2026-02-01T00:00:00.000Z',
        brandId: 'brand_ecstatic_edibles',
      },
    }]]]),
  } satisfies Record<QueryField, Map<string, QueryDoc[]>>;

  const db = {
    collection: jest.fn((name: string) => {
      if (name === 'tenants') {
        return {
          doc: jest.fn((tenantId: string) => ({
            get: jest.fn().mockResolvedValue(
              makeDocSnapshot(tenantId, tenantDocs.get(tenantId) ?? null),
            ),
            collection: jest.fn((childCollection: string) => {
              if (childCollection !== 'publicViews') {
                throw new Error(`Unexpected tenant child collection: ${childCollection}`);
              }

              return {
                doc: jest.fn((docId: string) => {
                  if (docId !== 'products') {
                    throw new Error(`Unexpected tenant public view doc: ${docId}`);
                  }

                  return {
                    collection: jest.fn((grandChildCollection: string) => {
                      if (grandChildCollection !== 'items') {
                        throw new Error(`Unexpected tenant grandchild collection: ${grandChildCollection}`);
                      }

                      return {
                        limit: jest.fn(() => ({
                          get: jest.fn().mockResolvedValue(
                            makeQuerySnapshot(tenantCatalogDocs.get(tenantId) ?? []),
                          ),
                        })),
                      };
                    }),
                  };
                }),
              };
            }),
          })),
          where: jest.fn((field: string, _operator: string, value: string) => {
            if (field !== 'orgId') {
              throw new Error(`Unexpected tenant where field: ${field}`);
            }

            return {
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(
                  makeQuerySnapshot(tenantAliasDocs.get(value) ?? []),
                ),
              })),
            };
          }),
        };
      }

      if (name === 'brands') {
        return {
          doc: jest.fn((brandId: string) => ({
            get: jest.fn().mockResolvedValue(
              makeDocSnapshot(brandId, brandDocs.get(brandId) ?? null),
            ),
          })),
          where: jest.fn((field: string, _operator: string, value: string) => {
            if (field !== 'orgId') {
              throw new Error(`Unexpected brand where field: ${field}`);
            }

            return {
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(
                  makeQuerySnapshot(brandByOrgDocs.get(value) ?? []),
                ),
              })),
            };
          }),
        };
      }

      if (name === 'products') {
        return {
          where: jest.fn((field: QueryField, _operator: string, value: string) => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(
                makeQuerySnapshot(productsByField[field].get(value) ?? []),
              ),
            })),
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return { db };
}

describe('catalog-analytics-source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves Ecstatic tenant aliases into a shared catalog analytics scope', async () => {
    const { db } = createFirestoreMock();

    const scope = await resolveCatalogAnalyticsScope(
      db as unknown as FirebaseFirestore.Firestore,
      'org_ecstatic_edibles',
    );

    expect(scope.tenantIds).toEqual(expect.arrayContaining([
      'org_ecstatic_edibles',
      'ecstaticedibles',
      'brand_ecstatic_edibles',
    ]));
    expect(scope.rootProductQueryIds).toEqual({
      orgId: ['org_ecstatic_edibles'],
      dispensaryId: ['org_ecstatic_edibles'],
      brandId: ['brand_ecstatic_edibles'],
    });
  });

  it('loads Ecstatic products from root brandId catalog data when tenant catalog is empty', async () => {
    const { db } = createFirestoreMock();
    (getAdminFirestore as jest.Mock).mockReturnValue(db);

    const products = await loadCatalogAnalyticsProducts('org_ecstatic_edibles');

    expect(products).toEqual([{
      id: 'prod_1',
      name: 'Blue Raspberry Gummies',
      category: 'Edibles',
      price: 18,
      stock: 24,
      salesLast7Days: 0,
      salesLast30Days: 0,
      salesVelocity: 0,
      lastSaleAt: '2026-02-01T00:00:00.000Z',
      dynamicPricingApplied: false,
      dynamicPricingUpdatedAt: undefined,
      dynamicPricingReason: undefined,
      dynamicPricingBadge: undefined,
      source: undefined,
      externalId: undefined,
      skuId: undefined,
      originalPrice: undefined,
      cost: undefined,
    }]);
    expect(logger.info).toHaveBeenCalledWith(
      '[catalog-analytics-source] Loaded products for analytics',
      expect.objectContaining({
        orgId: 'org_ecstatic_edibles',
        rootBrandCount: 1,
        mergedCount: 1,
      }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
