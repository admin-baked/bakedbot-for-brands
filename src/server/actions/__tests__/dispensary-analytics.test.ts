import {
  getMenuAnalytics,
  getOrdersAnalytics,
  getProductsAnalytics,
} from '../dispensary-analytics';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getMarketBenchmarks } from '@/server/services/market-benchmarks';
import { getOrdersFromAlleaves } from '@/app/dashboard/orders/actions';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/market-benchmarks', () => ({
  getMarketBenchmarks: jest.fn(),
}));

jest.mock('@/app/dashboard/orders/actions', () => ({
  getOrdersFromAlleaves: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

type MockDocInput = {
  id: string;
  data: Record<string, unknown>;
};

function makeDoc({ id, data }: MockDocInput) {
  return {
    id,
    exists: true,
    data: () => data,
  };
}

function makeFirestoreMock({
  tenantProducts = [],
  orgProducts = [],
  dispensaryProducts = [],
  brandProducts = [],
  retailerOrders = [],
  brandOrders = [],
  orgOrders = [],
}: {
  tenantProducts?: MockDocInput[];
  orgProducts?: MockDocInput[];
  dispensaryProducts?: MockDocInput[];
  brandProducts?: MockDocInput[];
  retailerOrders?: MockDocInput[];
  brandOrders?: MockDocInput[];
  orgOrders?: MockDocInput[];
}) {
  const tenantItemsCollection = {
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: tenantProducts.map(makeDoc),
    }),
  };
  const productsDoc = {
    collection: jest.fn().mockReturnValue(tenantItemsCollection),
  };
  const publicViewsCollection = {
    doc: jest.fn().mockReturnValue(productsDoc),
  };
  const tenantDoc = {
    get: jest.fn().mockResolvedValue({
      exists: false,
      data: () => undefined,
    }),
    collection: jest.fn().mockReturnValue(publicViewsCollection),
  };
  const tenantsCollection = {
    doc: jest.fn().mockReturnValue(tenantDoc),
    where: jest.fn(() => ({
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  };

  const brandsCollection = {
    doc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        exists: false,
        data: () => undefined,
      }),
    })),
    where: jest.fn(() => ({
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  };

  const orgProductsQuery = {
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: orgProducts.map(makeDoc),
    }),
  };
  const dispensaryProductsQuery = {
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: dispensaryProducts.map(makeDoc),
    }),
  };
  const brandProductsQuery = {
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: brandProducts.map(makeDoc),
    }),
  };
  const productsCollection = {
    where: jest.fn((field: string) => {
      if (field === 'orgId') return orgProductsQuery;
      if (field === 'dispensaryId') return dispensaryProductsQuery;
      if (field === 'brandId') return brandProductsQuery;
      throw new Error(`Unexpected products field: ${field}`);
    }),
  };

  const makeOrdersScope = (docs: MockDocInput[]) => {
    const limitedQuery = {
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: docs.map(makeDoc),
      }),
    };

    return {
      where: jest.fn().mockReturnValue(limitedQuery),
      limit: limitedQuery.limit,
      get: limitedQuery.get,
    };
  };

  const retailerOrdersScope = makeOrdersScope(retailerOrders);
  const brandOrdersScope = makeOrdersScope(brandOrders);
  const orgOrdersScope = makeOrdersScope(orgOrders);
  const ordersCollection = {
    where: jest.fn((field: string) => {
      if (field === 'retailerId') return retailerOrdersScope;
      if (field === 'brandId') return brandOrdersScope;
      if (field === 'orgId') return orgOrdersScope;
      throw new Error(`Unexpected orders field: ${field}`);
    }),
  };

  return {
    collection: jest.fn((name: string) => {
      if (name === 'tenants') return tenantsCollection;
      if (name === 'brands') return brandsCollection;
      if (name === 'products') return productsCollection;
      if (name === 'orders') return ordersCollection;
      throw new Error(`Unexpected collection: ${name}`);
    }),
  };
}

describe('dispensary analytics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T00:00:00Z').getTime());
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-1',
    });
    (getMarketBenchmarks as jest.Mock).mockRejectedValue(new Error('no benchmarks'));
    (getOrdersFromAlleaves as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('merges tenant catalog products with root sales rollups and keeps velocity deterministic', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({
      tenantProducts: [
        {
          id: 'catalog-1',
          data: {
            name: 'Blue Dream',
            category: 'flower',
            price: '35',
            stock: '12',
            externalId: 'ext-1',
          },
        },
      ],
      orgProducts: [
        {
          id: 'prod-1',
          data: {
            name: 'Blue Dream',
            category: 'flower',
            price: 35,
            cost: 18,
            salesLast7Days: 14,
            salesLast30Days: 40,
            salesVelocity: 2,
            externalId: 'ext-1',
          },
        },
      ],
    }));

    const first = await getProductsAnalytics('org-1');
    const second = await getProductsAnalytics('org-1');

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !first.data || !second.success || !second.data) {
      throw new Error('Expected products analytics data');
    }

    expect(first.data.categoryMix[0]?.revenue).toBe(1400);
    expect(first.data.velocityData).toEqual(second.data.velocityData);
  });

  it('normalizes numeric strings so menu analytics never emits NaN values', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({
      tenantProducts: [
        {
          id: 'catalog-2',
          data: {
            name: 'Mystery Item',
            category: 'other',
            price: '$30',
            stock: '4',
            externalId: 'ext-2',
          },
        },
      ],
      orgProducts: [
        {
          id: 'prod-2',
          data: {
            name: 'Mystery Item',
            category: 'other',
            cost: '10',
            salesLast7Days: '1',
            salesLast30Days: '2',
            externalId: 'ext-2',
          },
        },
      ],
    }));

    const result = await getMenuAnalytics('org-1');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error('Expected menu analytics data');
    }

    const otherCategory = result.data.categoryPerformance.find((row) => row.category === 'Other');
    expect(otherCategory).toBeDefined();
    expect(otherCategory?.revenue).toBe(60);
    expect(Number.isNaN(otherCategory?.revenue ?? Number.NaN)).toBe(false);
    expect(result.data.priceTierDistribution.every((row) => Number.isFinite(row.revenuePct))).toBe(true);
  });

  it('falls back to orgId orders and reads nested totals for order analytics', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({
      orgOrders: [
        {
          id: 'order-1',
          data: {
            createdAt: { toDate: () => new Date() },
            totals: {
              total: 75,
              discount: 15,
            },
            items: [
              { quantity: '3', price: '25' },
            ],
            source: 'online',
            status: 'completed',
          },
        },
      ],
    }));

    const result = await getOrdersAnalytics('org-1');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error('Expected orders analytics data');
    }

    expect(result.data.basketSizeTrend.some((row) => row.avgBasket === 75)).toBe(true);
    expect(result.data.discountRateTrend.some((row) => row.discountRate === 0.2)).toBe(true);
    expect(result.data.onlineVsInStoreSplit.find((row) => row.name === 'Online')?.value).toBe(1);
  });

  it('allows dispensary staff and uses retailerId orders when location-scoped docs exist', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'staff-1',
      role: 'dispensary_staff',
      currentOrgId: 'org-1',
      locationId: 'loc-1',
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({
      retailerOrders: [
        {
          id: 'order-retailer-1',
          data: {
            createdAt: { toDate: () => new Date() },
            totals: {
              total: 88,
              discount: 8,
            },
            items: [
              { quantity: 4, price: 22 },
            ],
            source: 'online',
            status: 'completed',
          },
        },
      ],
    }));

    const result = await getOrdersAnalytics('org-1');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error('Expected retailer-scoped order analytics data');
    }

    expect(result.data.basketSizeTrend.some((row) => row.avgBasket === 88)).toBe(true);
    expect(result.data.discountRateTrend.some((row) => row.discountRate === 0.091)).toBe(true);
    expect(result.data.onlineVsInStoreSplit.find((row) => row.name === 'Online')?.value).toBe(1);
  });

  it('falls back to live Alleaves orders when Firestore has no analytics orders', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({}));
    (getOrdersFromAlleaves as jest.Mock).mockResolvedValue([
      {
        id: 'live-order-1',
        createdAt: { toDate: () => new Date() },
        totals: {
          total: 54,
          discount: 4,
        },
        items: [
          { qty: 2, price: 27 },
        ],
        source: 'online',
        status: 'completed',
      },
    ]);

    const result = await getOrdersAnalytics('org-1');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error('Expected live Alleaves order analytics data');
    }

    expect(getOrdersFromAlleaves).toHaveBeenCalledWith('org-1', expect.anything());
    expect(result.data.basketSizeTrend.some((row) => row.avgBasket === 54)).toBe(true);
    expect(result.data.onlineVsInStoreSplit.find((row) => row.name === 'Online')?.value).toBe(1);
  });

  it('uses benchmark-aligned slow-mover thresholds and ignores missing sale history', async () => {
    (getMarketBenchmarks as jest.Mock).mockResolvedValue({
      operations: {
        skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock({
      orgProducts: [
        {
          id: 'prod-old',
          data: {
            name: 'Old Stock',
            category: 'flower',
            price: 30,
            stock: 8,
            salesLast7Days: 0,
            salesLast30Days: 0,
            salesVelocity: 0,
            lastSaleAt: new Date('2026-01-20T00:00:00Z'),
          },
        },
        {
          id: 'prod-liquidate',
          data: {
            name: 'Very Old Stock',
            category: 'edibles',
            price: 50,
            stock: 4,
            salesLast7Days: 0,
            salesLast30Days: 0,
            salesVelocity: 0,
            lastSaleAt: new Date('2025-12-31T00:00:00Z'),
          },
        },
        {
          id: 'prod-too-fresh',
          data: {
            name: 'Recent Stock',
            category: 'vapes',
            price: 25,
            stock: 10,
            salesLast7Days: 0,
            salesLast30Days: 0,
            salesVelocity: 0,
            lastSaleAt: new Date('2026-03-25T00:00:00Z'),
          },
        },
        {
          id: 'prod-unknown',
          data: {
            name: 'Unknown History',
            category: 'other',
            price: 40,
            stock: 6,
            salesLast7Days: 0,
            salesLast30Days: 0,
            salesVelocity: 0,
          },
        },
      ],
    }));

    const result = await getMenuAnalytics('org-1');

    expect(result.success).toBe(true);
    if (!result.success || !result.data) {
      throw new Error('Expected menu analytics data');
    }

    expect(result.data.skuRationalizationFlags).toHaveLength(2);
    expect(result.data.skuRationalizationFlags.map((item) => item.productId)).toEqual([
      'prod-old',
      'prod-liquidate',
    ]);
    expect(result.data.skuRationalizationFlags[0]).toMatchObject({
      action: 'markdown',
      estimatedAtRisk: 240,
      daysSinceLastSale: 86,
    });
    expect(result.data.skuRationalizationFlags[1]).toMatchObject({
      action: 'liquidate',
      estimatedAtRisk: 200,
    });
  });
});
