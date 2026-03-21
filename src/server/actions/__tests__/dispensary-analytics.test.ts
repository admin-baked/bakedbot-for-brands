import {
  getMenuAnalytics,
  getOrdersAnalytics,
  getProductsAnalytics,
} from '../dispensary-analytics';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getMarketBenchmarks } from '@/server/services/market-benchmarks';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/market-benchmarks', () => ({
  getMarketBenchmarks: jest.fn(),
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
    data: () => data,
  };
}

function makeFirestoreMock({
  tenantProducts = [],
  orgProducts = [],
  dispensaryProducts = [],
  brandOrders = [],
  orgOrders = [],
}: {
  tenantProducts?: MockDocInput[];
  orgProducts?: MockDocInput[];
  dispensaryProducts?: MockDocInput[];
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
    collection: jest.fn().mockReturnValue(publicViewsCollection),
  };
  const tenantsCollection = {
    doc: jest.fn().mockReturnValue(tenantDoc),
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
  const productsCollection = {
    where: jest.fn((field: string) => {
      if (field === 'orgId') return orgProductsQuery;
      if (field === 'dispensaryId') return dispensaryProductsQuery;
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

  const brandOrdersScope = makeOrdersScope(brandOrders);
  const orgOrdersScope = makeOrdersScope(orgOrders);
  const ordersCollection = {
    where: jest.fn((field: string) => {
      if (field === 'brandId') return brandOrdersScope;
      if (field === 'orgId') return orgOrdersScope;
      throw new Error(`Unexpected orders field: ${field}`);
    }),
  };

  return {
    collection: jest.fn((name: string) => {
      if (name === 'tenants') return tenantsCollection;
      if (name === 'products') return productsCollection;
      if (name === 'orders') return ordersCollection;
      throw new Error(`Unexpected collection: ${name}`);
    }),
  };
}

describe('dispensary analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-1',
    });
    (getMarketBenchmarks as jest.Mock).mockRejectedValue(new Error('no benchmarks'));
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
});
