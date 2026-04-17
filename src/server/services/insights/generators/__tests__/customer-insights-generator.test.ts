import { CustomerInsightsGenerator } from '../customer-insights-generator';
import {
  getAtRiskCustomers,
  getSegmentSummary,
  getTodayCheckins,
} from '@/server/tools/crm-tools';

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

type MockSegment = {
  count?: number;
  totalSpent?: number;
  avgSpend?: number;
  recentActiveCount?: number;
};

const makeSegmentSummary = (segments: Record<string, MockSegment>) => ({
  segments,
});

describe('CustomerInsightsGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getTodayCheckins as jest.Mock).mockResolvedValue(0);
  });

  it('uses a 30-day active CRM base for customer mix instead of lifetime counts', async () => {
    (getSegmentSummary as jest.Mock).mockResolvedValue(
      makeSegmentSummary({
        new: { count: 12, recentActiveCount: 2 },
        vip: { count: 10, recentActiveCount: 1 },
        loyal: { count: 8, recentActiveCount: 2 },
        frequent: { count: 7, recentActiveCount: 1 },
        high_value: { count: 5, recentActiveCount: 1 },
        regular: { count: 6, recentActiveCount: 1 },
      }),
    );
    (getAtRiskCustomers as jest.Mock).mockResolvedValue({ customers: [] });

    const generator = new CustomerInsightsGenerator('org_test');
    jest
      .spyOn(generator as unknown as { saveInsights: () => Promise<void> }, 'saveInsights')
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        generator as unknown as { deleteRetiredDeterministicInsights: () => Promise<void> },
        'deleteRetiredDeterministicInsights',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(generator as unknown as { getTodayNewVsReturning: () => Promise<{ newCustomers: number; returningCustomers: number }> }, 'getTodayNewVsReturning')
      .mockResolvedValue({ newCustomers: 0, returningCustomers: 0 });

    const insights = await generator.generate();
    const customerMixInsight = insights.find((insight) => insight.title === 'CUSTOMER MIX');

    expect(customerMixInsight).toEqual(
      expect.objectContaining({
        headline: '75% returning customers',
        trendValue: '75% of 30-day active CRM base',
        tooltipText: 'Returning: repeat customers active in the last 30 days. New: first-ever visitors or first-time buyers in that same 30-day window. Updates every hour with live check-in and order data.',
      }),
    );
    expect(customerMixInsight?.subtext).toContain('30-day active CRM base: 2 new | 6 returning | 8 total');
    expect(customerMixInsight?.subtext).toContain('Tracked CRM base: 48 segmented customers');
    expect(customerMixInsight?.metadata).toEqual(
      expect.objectContaining({
        activeNewCount: 2,
        activeReturningCount: 6,
        activeThirtyDayBase: 8,
        lifetimeTrackedBase: 48,
        baseWindow: '30_day_active',
        returningPercent: 75,
      }),
    );
  });

  it('requests churn risk from 60+ day customers only', async () => {
    (getSegmentSummary as jest.Mock).mockResolvedValue(
      makeSegmentSummary({
        new: { count: 1, recentActiveCount: 1 },
        loyal: { count: 2, recentActiveCount: 1 },
      }),
    );
    (getAtRiskCustomers as jest.Mock).mockResolvedValue({ customers: [] });

    const generator = new CustomerInsightsGenerator('org_test');
    jest
      .spyOn(generator as unknown as { saveInsights: () => Promise<void> }, 'saveInsights')
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        generator as unknown as { deleteRetiredDeterministicInsights: () => Promise<void> },
        'deleteRetiredDeterministicInsights',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(generator as unknown as { getTodayNewVsReturning: () => Promise<{ newCustomers: number; returningCustomers: number }> }, 'getTodayNewVsReturning')
      .mockResolvedValue({ newCustomers: 0, returningCustomers: 0 });

    await generator.generate();

    expect(getAtRiskCustomers).toHaveBeenCalledWith('org_test', 100, false);
  });

  it('labels loyalty concentration as tracked LTV, not revenue', async () => {
    (getSegmentSummary as jest.Mock).mockResolvedValue(
      makeSegmentSummary({
        vip: { count: 2, totalSpent: 18000, avgSpend: 9000, recentActiveCount: 2 },
        loyal: { count: 1, totalSpent: 3000, avgSpend: 3000, recentActiveCount: 1 },
        at_risk: { count: 2, totalSpent: 2000, avgSpend: 1000, recentActiveCount: 0 },
      }),
    );
    (getAtRiskCustomers as jest.Mock).mockResolvedValue({ customers: [] });

    const generator = new CustomerInsightsGenerator('org_test');
    jest
      .spyOn(generator as unknown as { saveInsights: () => Promise<void> }, 'saveInsights')
      .mockResolvedValue(undefined);
    jest
      .spyOn(
        generator as unknown as { deleteRetiredDeterministicInsights: () => Promise<void> },
        'deleteRetiredDeterministicInsights',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(generator as unknown as { getTodayNewVsReturning: () => Promise<{ newCustomers: number; returningCustomers: number }> }, 'getTodayNewVsReturning')
      .mockResolvedValue({ newCustomers: 0, returningCustomers: 0 });

    const insights = await generator.generate();
    const loyaltyInsight = insights.find((insight) => insight.title === 'LOYALTY PERFORMANCE');

    expect(loyaltyInsight).toEqual(
      expect.objectContaining({
        headline: '2 VIP customers hold 78% of tracked LTV',
        severity: 'warning',
        ctaLabel: 'Reduce Concentration Risk',
        dataSource: 'Customer segments (CRM lifetime spend)',
        tooltipText: 'LTV is based on lifetime spend. Concentration alerts occur when top VIPs account for most revenue, creating risk if they churn.',
      }),
    );
    expect(loyaltyInsight?.subtext).toContain('CRM LTV basis');
    expect(loyaltyInsight?.subtext).toContain('2 active in last 30d');
    expect(loyaltyInsight?.subtext).toContain('1 Loyal');
    expect(loyaltyInsight?.threadPrompt).toContain('tracked lifetime value');
  });
});
