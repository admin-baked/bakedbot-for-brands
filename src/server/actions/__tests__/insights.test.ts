import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockGetActiveCustomerCount = jest.fn();
const mockGetOrderStats = jest.fn();
const mockMonitorInventoryAge = jest.fn();
const mockGetExpiringInventory = jest.fn();
const mockGetLatestWeeklyReport = jest.fn();

jest.mock('@/server/auth/auth', () => ({
  requireUser: mockRequireUser,
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: mockGetAdminFirestore,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/server/services/insights/customer-metrics', () => ({
  getActiveCustomerCount: mockGetActiveCustomerCount,
}));

jest.mock('@/server/actions/order-actions', () => ({
  getOrderStats: mockGetOrderStats,
}));

jest.mock('@/server/services/alleaves/inventory-intelligence', () => ({
  monitorInventoryAge: mockMonitorInventoryAge,
  getExpiringInventory: mockGetExpiringInventory,
}));

jest.mock('@/server/services/ezal/weekly-intel-report', () => ({
  getLatestWeeklyReport: mockGetLatestWeeklyReport,
}));

let getInsightsForOrg: typeof import('../insights').getInsightsForOrg;
let getInsights: typeof import('../insights').getInsights;

let requestedTenantOrgId: string | null = null;
let tenantInsightsSnapshot: { empty: boolean; docs: Array<{ id: string; data: () => Record<string, unknown> }> };

function createInsightsDb() {
  return {
    collection: jest.fn((name: string) => {
      if (name !== 'tenants') {
        throw new Error(`Unexpected collection: ${name}`);
      }

      return {
        doc: jest.fn((orgId: string) => {
          requestedTenantOrgId = orgId;

          return {
            collection: jest.fn((subcollection: string) => {
              if (subcollection !== 'insights') {
                throw new Error(`Unexpected subcollection: ${subcollection}`);
              }

              return {
                where: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue(
                      subcollection === 'insights'
                        ? tenantInsightsSnapshot
                        : { empty: true, docs: [] }
                    ),
                  })),
                })),
              };
            }),
            get: jest.fn().mockResolvedValue({
              data: () => ({}),
            }),
          };
        }),
      };
    }),
  };
}

describe('insights actions', () => {
  beforeAll(async () => {
    const mod = await import('../insights');
    getInsightsForOrg = mod.getInsightsForOrg;
    getInsights = mod.getInsights;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    requestedTenantOrgId = null;
    tenantInsightsSnapshot = { empty: true, docs: [] };

    mockGetAdminFirestore.mockReturnValue(createInsightsDb());
    mockGetActiveCustomerCount.mockResolvedValue(11);
    mockGetOrderStats.mockResolvedValue({ pending: 3, ready: 2 });
    mockGetExpiringInventory.mockResolvedValue([]);
    mockMonitorInventoryAge.mockResolvedValue({ slowMoving: 0 });
    mockGetLatestWeeklyReport.mockResolvedValue(null);
  });

  it('normalizes proactive insight docs before returning them to the client boundary', async () => {
    const generatedAt = new Date('2026-03-10T13:00:00.000Z');

    tenantInsightsSnapshot = {
      empty: false,
      docs: [
        {
          id: 'insight_customer_1',
          data: () => ({
            category: 'customer',
            agentId: 'mrs_parker',
            agentName: 'Mrs. Parker',
            title: 'Customer Love',
            headline: '11 enrolled customers',
            severity: 'success',
            actionable: true,
            threadType: 'customer_health',
            threadPrompt: 'Help me understand retention.',
            dataSource: 'customers-collection',
            generatedAt: { toDate: () => generatedAt },
            expiresAt: { toDate: () => new Date('2026-03-11T13:00:00.000Z') },
          }),
        },
      ],
    };

    const result = await getInsightsForOrg('org-thrive', 5);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0]).toMatchObject({
        id: 'insight_customer_1',
        category: 'customer',
        agentId: 'mrs_parker',
        agentName: 'Mrs. Parker',
        title: 'Customer Love',
        headline: '11 enrolled customers',
        severity: 'success',
        actionable: true,
        threadType: 'customer_health',
        threadPrompt: 'Help me understand retention.',
        dataSource: 'customers-collection',
      });
      expect(result.insights[0].lastUpdated).toEqual(generatedAt);
      expect(result.insights[0]).not.toHaveProperty('generatedAt');
      expect(result.insights[0]).not.toHaveProperty('expiresAt');
    }

    expect(requestedTenantOrgId).toBe('org-thrive');
  });

  it('prefers currentOrgId over locationId for dispensary briefing fetches', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
      locationId: 'loc-legacy',
    });

    const result = await getInsights();

    expect(result.success).toBe(true);
    expect(requestedTenantOrgId).toBe('org-current');
    expect(mockGetExpiringInventory).toHaveBeenCalledWith('org-current', 14);
    expect(mockMonitorInventoryAge).toHaveBeenCalledWith('org-current');
    expect(mockGetOrderStats).toHaveBeenCalledWith('org-current');
    expect(mockGetActiveCustomerCount).toHaveBeenCalledWith('org-current');
  });
});
