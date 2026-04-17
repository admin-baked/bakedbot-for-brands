import type { InsightCard } from '@/types/insight-cards';
import { CustomerInsightsGenerator } from '../customer-insights-generator';

const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockInsightsDoc = jest.fn();

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn().mockImplementation(() => ({
    batch: () => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
    collection: (name: string) => {
      if (name !== 'tenants') {
        throw new Error(`Unexpected collection ${name}`);
      }

      return {
        doc: () => ({
          collection: (childName: string) => {
            if (childName !== 'insights') {
              throw new Error(`Unexpected child collection ${childName}`);
            }

            return {
              doc: mockInsightsDoc,
            };
          },
        }),
      };
    },
  })),
}));

jest.mock('@/server/tools/crm-tools', () => ({
  getSegmentSummary: jest.fn(),
  getAtRiskCustomers: jest.fn(),
  getTodayCheckins: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CustomerInsightsGenerator deterministic cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsightsDoc.mockImplementation((id: string) => ({
      id,
      path: `tenants/org_test/insights/${id}`,
    }));
  });

  it('deletes retired deterministic cards that are no longer emitted', async () => {
    const generator = new CustomerInsightsGenerator('org_test');
    const makeInsight = (title: string): InsightCard => ({
      id: '',
      category: 'customer',
      agentId: 'smokey',
      agentName: 'Smokey',
      title,
      headline: `${title} headline`,
      severity: 'info',
      actionable: true,
      lastUpdated: new Date('2026-04-17T12:00:00.000Z'),
      dataSource: 'test',
    });

    await (
      generator as unknown as {
        deleteRetiredDeterministicInsights: (insights: InsightCard[]) => Promise<void>;
      }
    ).deleteRetiredDeterministicInsights([
      makeInsight('CUSTOMER MIX'),
      makeInsight('LOYALTY PERFORMANCE'),
    ]);

    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).toHaveBeenCalledWith({
      id: 'org_test:customer:churn_risk_alert',
      path: 'tenants/org_test/insights/org_test:customer:churn_risk_alert',
    });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
