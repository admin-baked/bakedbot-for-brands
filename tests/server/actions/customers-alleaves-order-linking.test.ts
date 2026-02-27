import { getCustomers } from '@/app/dashboard/customers/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
  ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
  posCache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
  cacheKeys: {
    customers: jest.fn((orgId: string) => `customers:${orgId}`),
    orders: jest.fn((orgId: string) => `orders:${orgId}`),
  },
}));

jest.mock('@/lib/analytics/customer-preferences', () => ({
  inferPreferencesFromAlleaves: jest.fn(() => ({
    preferredCategories: [],
    preferredProducts: [],
    priceRange: 'mid',
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type SnapRow = { id: string; data: Record<string, any> };

function makeSnapshot(rows: SnapRow[]) {
  const docs = rows.map((row) => ({
    id: row.id,
    data: () => row.data,
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb: (doc: { id: string; data: () => Record<string, any> }) => void) => docs.forEach(cb),
  };
}

describe('getCustomers Alleaves order linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
      orgId: 'org_test',
      currentOrgId: 'org_test',
      locationId: 'loc_test',
      email: 'owner@test.com',
    });

    (posCache.get as jest.Mock).mockReturnValue(null);
    (cacheKeys.customers as jest.Mock).mockImplementation((orgId: string) => `customers:${orgId}`);

    (ALLeavesClient as jest.Mock).mockImplementation(() => ({
      getAllCustomersPaginated: jest.fn().mockResolvedValue([
        {
          id_customer: '42',
          name_first: 'Jane',
          name_last: 'Doe',
        },
      ]),
    }));
  });

  it('matches placeholder-email orders by Alleaves userId only for Alleaves order sources', async () => {
    const spendingSnap = makeSnapshot([
      {
        id: 'cid_42',
        data: {
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: { toDate: () => new Date(0) },
          firstOrderDate: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
        },
      },
    ]);

    const locationsSnap = makeSnapshot([
      {
        id: 'location_1',
        data: {
          posConfig: {
            provider: 'alleaves',
            status: 'active',
            apiKey: 'test-key',
            storeId: 'store_1',
            locationId: 'loc_test',
          },
        },
      },
    ]);

    const ordersSnap = makeSnapshot([
      {
        id: 'order_alleaves',
        data: {
          source: 'alleaves',
          userId: 42,
          customer: { email: 'no-email@alleaves.local', name: 'Jane Doe' },
          totals: { total: 100 },
          createdAt: { toDate: () => new Date('2026-02-26T12:00:00.000Z') },
        },
      },
      {
        id: 'order_non_alleaves',
        data: {
          source: 'web',
          userId: '42',
          customer: { email: 'no-email@alleaves.local', name: 'Jane Doe' },
          totals: { total: 200 },
          createdAt: { toDate: () => new Date('2026-02-26T13:00:00.000Z') },
        },
      },
    ]);

    const emptySnap = makeSnapshot([]);

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'locations') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(locationsSnap),
              })),
            })),
          };
        }

        if (name === 'tenants') {
          return {
            doc: jest.fn(() => ({
              collection: jest.fn((subName: string) => {
                if (subName === 'customer_spending') {
                  return {
                    limit: jest.fn(() => ({
                      get: jest.fn().mockResolvedValue(spendingSnap),
                    })),
                  };
                }

                throw new Error(`Unexpected tenants sub-collection: ${subName}`);
              }),
            })),
          };
        }

        if (name === 'orders') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(ordersSnap),
            })),
          };
        }

        if (name === 'customers') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(emptySnap),
            })),
          };
        }

        throw new Error(`Unexpected collection: ${name}`);
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getCustomers({ orgId: 'org_test' });
    const target = result.customers.find((c) => c.id === 'alleaves_42');

    expect(target).toBeDefined();
    expect(target?.orderCount).toBe(1);
    expect(target?.totalSpent).toBe(100);
  });

  it('treats @alleaves.local.com emails as real emails and links by normalized email', async () => {
    (ALLeavesClient as jest.Mock).mockImplementationOnce(() => ({
      getAllCustomersPaginated: jest.fn().mockResolvedValue([
        {
          id_customer: '42',
          name_first: 'Jane',
          name_last: 'Doe',
          email: ' Customer_42@Alleaves.Local.com ',
        },
      ]),
    }));

    const spendingSnap = makeSnapshot([
      {
        id: 'customer_42@alleaves.local.com',
        data: {
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: { toDate: () => new Date(0) },
          firstOrderDate: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
        },
      },
    ]);

    const locationsSnap = makeSnapshot([
      {
        id: 'location_1',
        data: {
          posConfig: {
            provider: 'alleaves',
            status: 'active',
            apiKey: 'test-key',
            storeId: 'store_1',
            locationId: 'loc_test',
          },
        },
      },
    ]);

    const ordersSnap = makeSnapshot([
      {
        id: 'order_web_real_email',
        data: {
          source: 'web',
          userId: 'web_1',
          customer: { email: 'customer_42@alleaves.local.com', name: 'Jane Doe' },
          totals: { total: 125 },
          createdAt: { toDate: () => new Date('2026-02-26T13:00:00.000Z') },
        },
      },
    ]);

    const emptySnap = makeSnapshot([]);

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'locations') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(locationsSnap),
              })),
            })),
          };
        }

        if (name === 'tenants') {
          return {
            doc: jest.fn(() => ({
              collection: jest.fn((subName: string) => {
                if (subName === 'customer_spending') {
                  return {
                    limit: jest.fn(() => ({
                      get: jest.fn().mockResolvedValue(spendingSnap),
                    })),
                  };
                }

                throw new Error(`Unexpected tenants sub-collection: ${subName}`);
              }),
            })),
          };
        }

        if (name === 'orders') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(ordersSnap),
            })),
          };
        }

        if (name === 'customers') {
          return {
            where: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(emptySnap),
            })),
          };
        }

        throw new Error(`Unexpected collection: ${name}`);
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getCustomers({ orgId: 'org_test' });
    const target = result.customers.find((c) => c.id === 'alleaves_42');

    expect(target).toBeDefined();
    expect(target?.orderCount).toBe(1);
    expect(target?.totalSpent).toBe(125);
  });
});
