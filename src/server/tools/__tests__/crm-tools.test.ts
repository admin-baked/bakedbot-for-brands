/**
 * Unit Tests for CRM Tools
 *
 * Tests the agent tools for customer lookup, segment analysis,
 * at-risk identification, upcoming birthdays, and communication history.
 */

import {
  lookupCustomer,
  getSegmentSummary,
  getAtRiskCustomers,
  getUpcomingBirthdays,
  getCustomerComms,
  crmToolDefs,
  craigCrmToolDefs,
  mrsParkerCrmToolDefs,
  smokeyCrmToolDefs,
  moneyMikeCrmToolDefs,
} from '../crm-tools';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/pos/adapters/alleaves', () => ({
  ALLeavesClient: jest.fn(),
}));

jest.mock('@/lib/cache/pos-cache', () => ({
  posCache: { get: jest.fn(), set: jest.fn() },
  cacheKeys: { orders: (id: string) => `orders:${id}` },
}));

jest.mock('@/types/customers', () => ({
  calculateSegment: jest.fn().mockReturnValue('loyal'),
  getSegmentInfo: jest.fn().mockImplementation((seg: string) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace('_', ' '),
    color: 'gray',
  })),
}));

jest.mock('@/lib/pricing/customer-tier-mapper', () => ({
  mapSegmentToTier: jest.fn().mockReturnValue('gold'),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockDocGet = jest.fn();

const mockCollection = jest.fn().mockReturnValue({
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  get: mockGet,
  doc: jest.fn().mockReturnValue({ get: mockDocGet }),
});

const { getAdminFirestore } = require('@/firebase/admin');
(getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeCustomerDoc(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    orgId: 'org_test',
    displayName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+15551234567',
    firstName: 'Jane',
    lastName: 'Doe',
    totalSpent: 5000,
    orderCount: 25,
    avgOrderValue: 200,
    lastOrderDate: {
      toDate: () => new Date('2026-01-15'),
    },
    points: 5000,
    preferredCategories: ['flower', 'edibles'],
    preferredProducts: [],
    priceRange: 'mid',
    customTags: ['vip-event'],
    notes: null,
    birthDate: null,
    source: 'pos',
  };

  const data = { ...defaults, ...overrides };

  return {
    id,
    exists: true,
    data: () => data,
  };
}

function makeSnap(docs: ReturnType<typeof makeCustomerDoc>[]) {
  return {
    empty: docs.length === 0,
    docs,
  };
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  (getAdminFirestore as jest.Mock).mockReturnValue({ collection: mockCollection });
  // Re-wire chaining after clearAllMocks
  mockWhere.mockReturnThis();
  mockOrderBy.mockReturnThis();
  mockLimit.mockReturnThis();
  mockCollection.mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGet,
    doc: jest.fn().mockReturnValue({ get: mockDocGet }),
  });
});

// ===========================================================================
// Tool definition exports
// ===========================================================================

describe('CRM tool definition exports', () => {
  it('crmToolDefs has 6 tools', () => {
    expect(crmToolDefs).toHaveLength(6);
  });

  it('craigCrmToolDefs has 4 tools', () => {
    expect(craigCrmToolDefs).toHaveLength(4);
  });

  it('mrsParkerCrmToolDefs has 4 tools', () => {
    expect(mrsParkerCrmToolDefs).toHaveLength(4);
  });

  it('smokeyCrmToolDefs has 2 tools', () => {
    expect(smokeyCrmToolDefs).toHaveLength(2);
  });

  it('moneyMikeCrmToolDefs has 3 tools', () => {
    expect(moneyMikeCrmToolDefs).toHaveLength(3);
  });
});

// ===========================================================================
// lookupCustomer
// ===========================================================================

describe('lookupCustomer', () => {
  it('returns customer data when found by doc ID', async () => {
    const doc = makeCustomerDoc('alleaves_100');
    mockDocGet.mockResolvedValue(doc);

    const result = await lookupCustomer('alleaves_100', 'org_test');

    expect(result.customer).not.toBeNull();
    expect(result.customer!.id).toBe('alleaves_100');
    expect(result.customer!.displayName).toBe('Jane Doe');
    expect(result.customer!.totalSpent).toBe(5000);
  });

  it('returns customer data when found by email (includes @)', async () => {
    // Doc lookup should miss (identifier has '@', but also starts without 'alleaves_'
    // so direct doc get may fire — make it miss)
    mockDocGet.mockResolvedValue({ exists: false });

    const emailDoc = makeCustomerDoc('cust_1', { email: 'jane@example.com' });
    // The email branch uses collection().where().where().limit().get()
    mockGet.mockResolvedValue(makeSnap([emailDoc]));

    const result = await lookupCustomer('jane@example.com', 'org_test');

    expect(result.customer).not.toBeNull();
    expect(result.customer!.email).toBe('jane@example.com');
  });

  it('returns "No customer found" when not found', async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    mockGet.mockResolvedValue(makeSnap([]));

    const { posCache } = require('@/lib/cache/pos-cache');
    (posCache.get as jest.Mock).mockReturnValue(null);

    const result = await lookupCustomer('nobody@example.com', 'org_test');

    expect(result.customer).toBeNull();
    expect(result.summary).toContain('No customer found');
  });

  it('summary includes :::crm:customer: marker', async () => {
    const doc = makeCustomerDoc('alleaves_200');
    mockDocGet.mockResolvedValue(doc);

    const result = await lookupCustomer('alleaves_200', 'org_test');

    expect(result.summary).toContain(':::crm:customer:');
  });

  it('summary includes displayName, LTV, and order count', async () => {
    const doc = makeCustomerDoc('alleaves_300', {
      displayName: 'Bob Smith',
      totalSpent: 12000,
      orderCount: 40,
    });
    mockDocGet.mockResolvedValue(doc);

    const result = await lookupCustomer('alleaves_300', 'org_test');

    expect(result.summary).toContain('Bob Smith');
    expect(result.summary).toContain('12,000');
    expect(result.summary).toContain('Orders: 40');
  });
});

// ===========================================================================
// getSegmentSummary
// ===========================================================================

describe('getSegmentSummary', () => {
  it('returns "No customers found" when empty', async () => {
    mockGet.mockResolvedValue(makeSnap([]));

    const result = await getSegmentSummary('org_empty');

    expect(result.summary).toContain('No customers found');
    expect(result.segments).toEqual({});
  });

  it('returns segment breakdown with correct counts', async () => {
    const customers = [
      makeCustomerDoc('c1', { segment: 'vip', totalSpent: 10000, orderCount: 50 }),
      makeCustomerDoc('c2', { segment: 'vip', totalSpent: 8000, orderCount: 30 }),
      makeCustomerDoc('c3', { segment: 'loyal', totalSpent: 3000, orderCount: 15 }),
      makeCustomerDoc('c4', { segment: 'at_risk', totalSpent: 2000, orderCount: 10 }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getSegmentSummary('org_test');

    const segs = result.segments as Record<string, { count: number; totalSpent: number }>;
    expect(segs.vip.count).toBe(2);
    expect(segs.vip.totalSpent).toBe(18000);
    expect(segs.loyal.count).toBe(1);
    expect(segs.at_risk.count).toBe(1);
  });

  it('summary includes segment table with % breakdown', async () => {
    const customers = [
      makeCustomerDoc('c1', { segment: 'vip', totalSpent: 10000, orderCount: 50 }),
      makeCustomerDoc('c2', { segment: 'loyal', totalSpent: 3000, orderCount: 15 }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getSegmentSummary('org_test');

    // Table header
    expect(result.summary).toContain('| Segment | Count | % |');
    // Percentage values
    expect(result.summary).toContain('50.0%');
  });

  it('summary includes at-risk revenue insight', async () => {
    const customers = [
      makeCustomerDoc('c1', { segment: 'at_risk', totalSpent: 5000, orderCount: 20 }),
      makeCustomerDoc('c2', { segment: 'slipping', totalSpent: 3000, orderCount: 10 }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getSegmentSummary('org_test');

    expect(result.summary).toContain('At-risk revenue');
    expect(result.summary).toContain('8,000');
    expect(result.summary).toContain('2 customers');
  });
});

// ===========================================================================
// getAtRiskCustomers
// ===========================================================================

describe('getAtRiskCustomers', () => {
  it('returns empty when no at-risk customers', async () => {
    const customers = [
      makeCustomerDoc('c1', { segment: 'vip', totalSpent: 10000, orderCount: 50 }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getAtRiskCustomers('org_test');

    expect(result.customers).toHaveLength(0);
    expect(result.summary).toContain('No at-risk customers found');
  });

  it('returns at-risk and slipping customers sorted by LTV', async () => {
    const customers = [
      makeCustomerDoc('c1', {
        segment: 'at_risk',
        displayName: 'Low Spender',
        totalSpent: 1000,
        orderCount: 5,
        lastOrderDate: { toDate: () => new Date('2025-11-01') },
      }),
      makeCustomerDoc('c2', {
        segment: 'slipping',
        displayName: 'High Spender',
        totalSpent: 8000,
        orderCount: 30,
        lastOrderDate: { toDate: () => new Date('2025-12-15') },
      }),
      makeCustomerDoc('c3', {
        segment: 'churned',
        displayName: 'Mid Spender',
        totalSpent: 3000,
        orderCount: 10,
        lastOrderDate: { toDate: () => new Date('2025-09-01') },
      }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getAtRiskCustomers('org_test', 20, true);

    expect(result.customers).toHaveLength(3);
    // Sorted by LTV descending
    expect((result.customers[0] as Record<string, unknown>).name).toBe('High Spender');
    expect((result.customers[1] as Record<string, unknown>).name).toBe('Mid Spender');
    expect((result.customers[2] as Record<string, unknown>).name).toBe('Low Spender');
  });

  it('excludes slipping when includeSlipping is false', async () => {
    const customers = [
      makeCustomerDoc('c1', {
        segment: 'at_risk',
        displayName: 'At Risk',
        totalSpent: 5000,
        orderCount: 20,
        lastOrderDate: { toDate: () => new Date('2025-10-01') },
      }),
      makeCustomerDoc('c2', {
        segment: 'slipping',
        displayName: 'Slipping',
        totalSpent: 3000,
        orderCount: 15,
        lastOrderDate: { toDate: () => new Date('2025-12-01') },
      }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getAtRiskCustomers('org_test', 20, false);

    expect(result.customers).toHaveLength(1);
    expect((result.customers[0] as Record<string, unknown>).name).toBe('At Risk');
  });

  it('limits results', async () => {
    const customers = Array.from({ length: 10 }, (_, i) =>
      makeCustomerDoc(`c${i}`, {
        segment: 'at_risk',
        displayName: `Customer ${i}`,
        totalSpent: 1000 * (10 - i),
        orderCount: 5,
        lastOrderDate: { toDate: () => new Date('2025-10-01') },
      }),
    );
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getAtRiskCustomers('org_test', 3, true);

    expect(result.customers).toHaveLength(3);
  });
});

// ===========================================================================
// getUpcomingBirthdays
// ===========================================================================

describe('getUpcomingBirthdays', () => {
  it('returns empty when no birthdays in range', async () => {
    const customers = [
      makeCustomerDoc('c1', { birthDate: null }),
      makeCustomerDoc('c2', { birthDate: '1990-06-15' }), // Far away from any test date
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getUpcomingBirthdays('org_test', 1);

    expect(result.customers).toHaveLength(0);
    expect(result.summary).toContain('No customer birthdays found');
  });

  it('returns customers with birthdays within daysAhead', async () => {
    // Use birthdays 2 and 3 days from now so the test is time-of-day independent.
    const now = new Date();
    const twoDaysOut = new Date(now);
    twoDaysOut.setDate(twoDaysOut.getDate() + 2);
    const threeDaysOut = new Date(now);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const birthday2 = `1990-${String(twoDaysOut.getMonth() + 1).padStart(2, '0')}-${String(twoDaysOut.getDate()).padStart(2, '0')}`;
    const birthday3 = `1992-${String(threeDaysOut.getMonth() + 1).padStart(2, '0')}-${String(threeDaysOut.getDate()).padStart(2, '0')}`;

    const customers = [
      makeCustomerDoc('c1', {
        displayName: 'Soon Birthday',
        birthDate: birthday2,
        totalSpent: 1000,
        segment: 'loyal',
      }),
      makeCustomerDoc('c2', {
        displayName: 'Also Soon Birthday',
        birthDate: birthday3,
        totalSpent: 2000,
        segment: 'vip',
      }),
    ];
    mockGet.mockResolvedValue(makeSnap(customers));

    const result = await getUpcomingBirthdays('org_test', 7);

    expect(result.customers).toHaveLength(2);
    expect(result.summary).toContain('Upcoming Birthdays');
  });
});

// ===========================================================================
// getCustomerComms
// ===========================================================================

describe('getCustomerComms', () => {
  it('returns empty when no communications', async () => {
    mockGet.mockResolvedValue(makeSnap([]));

    const result = await getCustomerComms('nobody@test.com', 'org_test');

    expect(result.communications).toHaveLength(0);
    expect(result.summary).toContain('No communications found');
  });

  it('returns communication list with open/click rates', async () => {
    const comms = [
      {
        id: 'comm1',
        exists: true,
        data: () => ({
          channel: 'email',
          type: 'campaign',
          subject: 'Weekly Deals',
          preview: 'Check out this week...',
          status: 'delivered',
          sentAt: { toDate: () => new Date('2026-01-10') },
          openedAt: { toDate: () => new Date('2026-01-10T12:00:00Z') },
          clickedAt: { toDate: () => new Date('2026-01-10T12:30:00Z') },
          agentName: 'Craig',
          campaignId: 'camp_1',
        }),
      },
      {
        id: 'comm2',
        exists: true,
        data: () => ({
          channel: 'email',
          type: 'campaign',
          subject: 'Flash Sale',
          preview: 'Flash sale today...',
          status: 'delivered',
          sentAt: { toDate: () => new Date('2026-01-12') },
          openedAt: { toDate: () => new Date('2026-01-12T10:00:00Z') },
          clickedAt: null,
          agentName: 'Craig',
          campaignId: 'camp_2',
        }),
      },
      {
        id: 'comm3',
        exists: true,
        data: () => ({
          channel: 'sms',
          type: 'transactional',
          subject: 'Order Confirmation',
          preview: 'Your order is ready...',
          status: 'delivered',
          sentAt: { toDate: () => new Date('2026-01-14') },
          openedAt: null,
          clickedAt: null,
          agentName: null,
          campaignId: null,
        }),
      },
    ];
    mockGet.mockResolvedValue({ empty: false, docs: comms });

    const result = await getCustomerComms('jane@example.com', 'org_test');

    expect(result.communications).toHaveLength(3);
    // 2 of 3 opened = 66.7%
    expect(result.summary).toContain('66.7%');
    // 1 of 3 clicked = 33.3%
    expect(result.summary).toContain('33.3%');
    expect(result.summary).toContain('Communication History');
  });

  it('filters by channel when specified', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });

    await getCustomerComms('jane@example.com', 'org_test', 20, 'sms');

    // Should have called where with channel filter
    expect(mockWhere).toHaveBeenCalledWith('channel', '==', 'sms');
  });
});
