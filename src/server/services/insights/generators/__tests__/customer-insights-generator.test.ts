import { CustomerInsightsGenerator } from '../customer-insights-generator';
import { getSegmentSummary, getAtRiskCustomers } from '@/server/tools/crm-tools';

jest.mock('@/server/tools/crm-tools', () => ({
  getSegmentSummary: jest.fn(),
  getAtRiskCustomers: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CustomerInsightsGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels loyalty concentration as tracked LTV, not revenue', async () => {
    (getSegmentSummary as jest.Mock).mockResolvedValue({
      segments: {
        vip: { count: 2, totalSpent: 18000, avgSpend: 9000, recentActiveCount: 2 },
        loyal: { count: 1, totalSpent: 3000, avgSpend: 3000, recentActiveCount: 1 },
        at_risk: { count: 2, totalSpent: 2000, avgSpend: 1000, recentActiveCount: 0 },
      },
    });
    (getAtRiskCustomers as jest.Mock).mockResolvedValue({ customers: [] });

    const generator = new CustomerInsightsGenerator('org_test');
    jest
      .spyOn(generator as unknown as { saveInsights: () => Promise<void> }, 'saveInsights')
      .mockResolvedValue(undefined);

    const insights = await generator.generate();
    const loyaltyInsight = insights.find((insight) => insight.title === 'LOYALTY PERFORMANCE');

    expect(loyaltyInsight).toEqual(
      expect.objectContaining({
        headline: '2 VIP customers hold 78% of tracked LTV',
        severity: 'warning',
        ctaLabel: 'Reduce Concentration Risk',
        dataSource: 'Customer segments (CRM lifetime spend)',
      })
    );
    expect(loyaltyInsight?.subtext).toContain('CRM LTV basis');
    expect(loyaltyInsight?.subtext).toContain('2 active in last 30d');
    expect(loyaltyInsight?.subtext).toContain('1 Loyal');
    expect(loyaltyInsight?.threadPrompt).toContain('tracked lifetime value');
  });
});
