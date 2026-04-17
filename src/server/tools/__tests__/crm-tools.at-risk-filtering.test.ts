import { getAtRiskCustomers } from '../crm-tools';
import { calculateSegment } from '@/types/customers';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  withCache: async (_prefix: unknown, _key: unknown, fn: () => Promise<unknown>) => fn(),
  CachePrefix: {
    CRM_AT_RISK: 'crm_at_risk',
  },
  CacheTTL: {
    CRM_AT_RISK: 0,
  },
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
  ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
  posCache: { get: jest.fn(), set: jest.fn() },
  cacheKeys: {
    orders: (id: string) => `orders:${id}`,
    customers: (id: string) => `customers:${id}`,
  },
}));

jest.mock('@/lib/pricing/customer-tier-mapper', () => ({
  mapSegmentToTier: jest.fn(),
}));

jest.mock('@/server/agents/tools/domain/crm', () => ({
  getTopCustomers: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/types/customers', () => ({
  calculateSegment: jest.fn(),
  getSegmentInfo: jest.fn((segment: string) => ({
    label: segment,
    color: 'gray',
    description: '',
  })),
}));

const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockCollection = jest.fn().mockReturnValue({
  where: mockWhere,
  get: mockGet,
});

const { getAdminFirestore } = require('@/firebase/admin');
(getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });

function makeCustomerDoc(id: string, overrides: Record<string, unknown> = {}) {
  const data = {
    orgId: 'org_test',
    displayName: 'Real Shopper',
    email: 'real@example.com',
    firstName: 'Real',
    lastName: 'Shopper',
    totalSpent: 400,
    orderCount: 4,
    lastOrderDate: {
      toDate: () => new Date('2026-01-01T00:00:00.000Z'),
    },
    ...overrides,
  };

  return {
    id,
    data: () => data,
  };
}

function makeSnap(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    docs,
  };
}

describe('getAtRiskCustomers filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });
    (calculateSegment as jest.Mock).mockImplementation((profile: { daysSinceLastOrder?: number }) =>
      (profile.daysSinceLastOrder ?? 0) >= 60 ? 'at_risk' : 'loyal',
    );
  });

  it('excludes test accounts and customers without a trustworthy last order date', async () => {
    mockGet.mockResolvedValue(
      makeSnap([
        makeCustomerDoc('test-account', {
          displayName: 'Jack BakedBot',
          email: 'jack@bakedbot.ai',
          isTestAccount: true,
          totalSpent: 900,
          orderCount: 9,
          lastOrderDate: {
            toDate: () => new Date('2025-10-01T00:00:00.000Z'),
          },
        }),
        makeCustomerDoc('missing-last-order', {
          displayName: 'Mystery Customer',
          email: 'mystery@example.com',
          orderCount: 7,
          lastOrderDate: null,
        }),
        makeCustomerDoc('real-at-risk', {
          displayName: 'Real Shopper',
          email: 'real@example.com',
          totalSpent: 400,
          orderCount: 4,
          lastOrderDate: {
            toDate: () => new Date('2025-10-01T00:00:00.000Z'),
          },
        }),
      ]),
    );

    const result = await getAtRiskCustomers('org_test', 20, false);

    expect(result.customers).toHaveLength(1);
    expect(result.summary).toContain('Real Shopper');
    expect(result.summary).not.toContain('Jack BakedBot');
    expect((result.customers[0] as Record<string, unknown>).name).toBe('Real Shopper');
  });
});
