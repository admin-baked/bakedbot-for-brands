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

describe('getAnalyticsData', () => {
  it('falls back to retailerId for dispensary overview analytics', async () => {
    const queryHistory: Array<Array<{ field: string; op: string; value: unknown }>> = [];
    const orderDate = new Date('2026-03-20T12:00:00Z');
    const orderDoc = {
      createdAt: {
        toMillis: () => orderDate.getTime(),
        toDate: () => orderDate,
      },
      customer: { email: 'customer@example.com' },
      totals: { total: 42 },
      items: [
        {
          productId: 'prod-1',
          name: 'Blue Dream',
          price: 42,
          qty: 1,
          category: 'Flower',
        },
      ],
      status: 'completed',
    };

    const firestore = {
      collection: jest.fn((collectionName: string) => {
        if (collectionName === 'orders') {
          const filters: Array<{ field: string; op: string; value: unknown }> = [];
          queryHistory.push(filters);
          return {
            where: jest.fn(function where(field: string, op: string, value: unknown) {
              filters.push({ field, op, value });
              return this;
            }),
            withConverter: jest.fn(function withConverter() {
              return this;
            }),
            get: jest.fn(async function get() {
              const scopeFilter = filters.find((filter) => filter.op === '==' && filter.field !== 'status');
              if (scopeFilter?.field === 'retailerId' && scopeFilter.value === 'loc-thrive') {
                return createSnapshot([orderDoc]);
              }
              return createSnapshot([]);
            }),
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

        throw new Error(`Unexpected collection: ${collectionName}`);
      }),
    };

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-thrive',
      orgId: 'org-thrive',
      locationId: 'loc-thrive',
    });
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getAnalyticsData('org-thrive');

    expect(result.totalOrders).toBe(1);
    expect(result.totalRevenue).toBe(42);
    expect(result.averageOrderValue).toBe(42);
    expect(result.salesByProduct).toEqual([
      { productName: 'Blue Dream', revenue: 42 },
    ]);
    expect(result.salesByCategory).toEqual([
      { category: 'Flower', revenue: 42 },
    ]);
    expect(result.dailyStats).toHaveLength(30);
    expect(queryHistory.some((filters) =>
      filters.some((filter) => filter.field === 'retailerId' && filter.value === 'loc-thrive')
    )).toBe(true);
  });
});
