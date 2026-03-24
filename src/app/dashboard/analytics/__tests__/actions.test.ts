import { getAnalyticsData } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Alleaves client used inside getOrdersFromAlleaves
jest.mock('@/lib/pos/adapters/alleaves', () => ({
  ALLeavesClient: jest.fn().mockImplementation(() => ({
    getAllOrders: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
  posCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
  cacheKeys: {
    orders: (orgId: string) => `orders:${orgId}`,
    customers: (orgId: string) => `customers:${orgId}`,
  },
}));

const orderDate = new Date('2026-01-15T12:00:00Z');

function makeOrderDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alleaves_1001',
    brandId: 'org-thrive',
    retailerId: 'loc-thrive',
    userId: 'cust-1',
    status: 'completed',
    customer: { email: 'customer@example.com', name: 'Alice', phone: '' },
    items: [
      { productId: 'prod-1', name: 'Blue Dream', price: 42, qty: 1, category: 'Flower' },
    ],
    totals: { subtotal: 42, tax: 4, discount: 0, total: 46 },
    mode: 'live',
    source: 'alleaves',
    createdAt: {
      toMillis: () => orderDate.getTime(),
      toDate: () => orderDate,
    },
    updatedAt: {
      toMillis: () => orderDate.getTime(),
      toDate: () => orderDate,
    },
    ...overrides,
  };
}

function createSnapshot<T>(docs: T[]) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((data) => ({
      data: () => data,
    })),
    forEach: (callback: (doc: { data: () => T }) => void) => {
      docs.forEach((data) => callback({ data: () => data }));
    },
  };
}

/** Build a mock Firestore that tracks all where-clauses applied per query */
function buildFirestore(opts: {
  /** Return docs for the first query whose filters satisfy this predicate */
  returnDocsWhen: (filters: Array<{ field: string; op: string; value: unknown }>) => boolean;
  docs?: unknown[];
  locationsDocs?: unknown[];
}) {
  const { returnDocsWhen, docs = [makeOrderDoc()], locationsDocs = [] } = opts;

  return {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'orders') {
        const filters: Array<{ field: string; op: string; value: unknown }> = [];
        return {
          where: jest.fn(function (field: string, op: string, value: unknown) {
            filters.push({ field, op, value });
            return this;
          }),
          withConverter: jest.fn(function () { return this; }),
          get: jest.fn(async () => {
            if (returnDocsWhen(filters)) return createSnapshot(docs);
            return createSnapshot([]);
          }),
        };
      }

      if (collectionName === 'locations') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(createSnapshot(locationsDocs)),
        };
      }

      if (collectionName === 'organizations') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue(createSnapshot([])),
            })),
          })),
        };
      }

      return {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(createSnapshot([])),
      };
    }),
  };
}

describe('getAnalyticsData — dispensary role', () => {
  beforeEach(() => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-thrive',
      orgId: 'org-thrive',
      locationId: 'loc-thrive',
    });
  });

  it('returns revenue from orders found by retailerId', async () => {
    const firestore = buildFirestore({
      returnDocsWhen: (f) =>
        f.some((x) => x.field === 'retailerId' && x.value === 'loc-thrive'),
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');

    expect(result.totalOrders).toBe(1);
    expect(result.totalRevenue).toBe(46);
    expect(result.averageOrderValue).toBe(46);
  });

  it('falls back to brandId query when retailerId returns nothing', async () => {
    const firestore = buildFirestore({
      returnDocsWhen: (f) =>
        f.some((x) => x.field === 'brandId' && x.value === 'org-thrive'),
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');

    expect(result.totalOrders).toBe(1);
    expect(result.totalRevenue).toBe(46);
  });

  it('falls back to orgId query when retailerId + brandId return nothing', async () => {
    const firestore = buildFirestore({
      returnDocsWhen: (f) =>
        f.some((x) => x.field === 'orgId' && x.value === 'org-thrive'),
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');

    expect(result.totalOrders).toBe(1);
    expect(result.totalRevenue).toBe(46);
  });

  it('returns empty analytics when no Firestore data and no Alleaves POS config', async () => {
    const firestore = buildFirestore({ returnDocsWhen: () => false });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');

    expect(result.totalOrders).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });

  it('handles Firestore query error and uses fallback without status filter', async () => {
    const orders = [makeOrderDoc({ status: 'completed' })];
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'orders') {
          const appliedFilters: Array<{ field: string; op: string; value: unknown }> = [];
          return {
            where: jest.fn(function (field: string, op: string, value: unknown) {
              appliedFilters.push({ field, op, value });
              return this;
            }),
            withConverter: jest.fn(function () { return this; }),
            get: jest.fn(async () => {
              // Throw when the status `in` filter is present (composite index required)
              const hasStatusFilter = appliedFilters.some((f) => f.field === 'status' && f.op === 'in');
              if (hasStatusFilter) throw new Error('FAILED_PRECONDITION: index missing');
              return createSnapshot(orders);
            }),
          };
        }
        if (name === 'locations') {
          return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue(createSnapshot([])) };
        }
        if (name === 'organizations') {
          return { doc: jest.fn(() => ({ collection: jest.fn(() => ({ where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue(createSnapshot([])) })) })) };
        }
        return { where: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn().mockResolvedValue(createSnapshot([])) };
      }),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');
    expect(result.totalOrders).toBe(1);
  });
});

describe('getAnalyticsData — brand role', () => {
  beforeEach(() => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-2',
      role: 'brand_admin',
      brandId: 'brand-acme',
      orgId: 'brand-acme',
    });
  });

  it('returns revenue from orders found by brandId', async () => {
    const firestore = buildFirestore({
      returnDocsWhen: (f) =>
        f.some((x) => x.field === 'brandId' && x.value === 'brand-acme'),
      docs: [makeOrderDoc({ brandId: 'brand-acme', retailerId: 'loc-acme' })],
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('brand-acme');

    expect(result.totalOrders).toBe(1);
    expect(result.totalRevenue).toBe(46);
  });

  it('computes correct averageOrderValue across multiple orders', async () => {
    const docs = [
      makeOrderDoc({ totals: { subtotal: 30, tax: 3, discount: 0, total: 33 } }),
      makeOrderDoc({ id: 'alleaves_1002', totals: { subtotal: 60, tax: 6, discount: 0, total: 66 } }),
    ];
    const firestore = buildFirestore({
      returnDocsWhen: (f) => f.some((x) => x.field === 'brandId'),
      docs,
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('brand-acme');

    expect(result.totalOrders).toBe(2);
    expect(result.totalRevenue).toBe(99);
    expect(result.averageOrderValue).toBeCloseTo(49.5);
  });

  it('identifies repeat customers correctly', async () => {
    const docs = [
      makeOrderDoc({ id: 'o1' }),
      makeOrderDoc({ id: 'o2' }), // same email — repeat purchase
      makeOrderDoc({ id: 'o3', customer: { email: 'other@example.com', name: 'Bob', phone: '' } }),
    ];
    const firestore = buildFirestore({
      returnDocsWhen: (f) => f.some((x) => x.field === 'brandId'),
      docs,
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('brand-acme');

    // 2 unique customers, 1 repeat → rate = 0.5
    expect(result.repeatCustomerRate).toBeCloseTo(0.5);
  });

  it('groups salesByCategory correctly', async () => {
    const docs = [
      makeOrderDoc({ items: [
        { productId: 'p1', name: 'Blue Dream', price: 20, qty: 2, category: 'Flower' },
        { productId: 'p2', name: 'Gummy Bears', price: 10, qty: 1, category: 'Edibles' },
      ], totals: { subtotal: 50, tax: 5, discount: 0, total: 55 } }),
    ];
    const firestore = buildFirestore({
      returnDocsWhen: (f) => f.some((x) => x.field === 'brandId'),
      docs,
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('brand-acme');

    const categories = Object.fromEntries(result.salesByCategory.map((c) => [c.category, c.revenue]));
    expect(categories['Flower']).toBe(40);   // 20 * 2
    expect(categories['Edibles']).toBe(10);  // 10 * 1
  });
});

describe('getAnalyticsData — authorization', () => {
  it('throws Forbidden if user does not own the entityId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-3',
      role: 'brand',
      brandId: 'brand-other',
      orgId: 'brand-other',
    });
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: buildFirestore({ returnDocsWhen: () => false }),
    });

    await expect(getAnalyticsData('org-thrive')).rejects.toThrow('Forbidden');
  });

  it('super_user can access any orgId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'admin-1',
      role: 'super_user',
    });
    const firestore = buildFirestore({
      returnDocsWhen: (f) => f.some((x) => x.field === 'brandId' && x.value === 'org-thrive'),
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');
    expect(result.totalOrders).toBe(1);
  });
});
