import { normalizePersistedInsightCard } from '../normalize-persisted-insight';

describe('normalizePersistedInsightCard', () => {
  it('returns a plain insight card without Firestore-only timestamp fields', () => {
    const lastUpdated = new Date('2026-03-10T14:30:00.000Z');
    const generatedAt = new Date('2026-03-10T13:00:00.000Z');

    const result = normalizePersistedInsightCard('insight_customer_1', {
      category: 'customer',
      agentId: 'mrs_parker',
      agentName: 'Mrs. Parker',
      title: 'Customer Love',
      headline: '11 enrolled customers',
      subtext: 'Ask Mrs. Parker for retention insights',
      tooltipText: 'Customer loyalty snapshot',
      severity: 'success',
      actionable: true,
      ctaLabel: 'View Customers',
      threadType: 'customer_health',
      threadPrompt: 'Help me understand retention.',
      metadata: {
        foo: 'bar',
      },
      dataSource: 'customers-collection',
      lastUpdated: { toDate: () => lastUpdated },
      generatedAt: { toDate: () => generatedAt },
      expiresAt: { toDate: () => new Date('2026-03-11T14:30:00.000Z') },
    });

    expect(result).toMatchObject({
      id: 'insight_customer_1',
      category: 'customer',
      agentId: 'mrs_parker',
      agentName: 'Mrs. Parker',
      title: 'Customer Love',
      headline: '11 enrolled customers',
      subtext: 'Ask Mrs. Parker for retention insights',
      severity: 'success',
      actionable: true,
      ctaLabel: 'View Customers',
      tooltipText: 'Customer loyalty snapshot',
      threadType: 'customer_health',
      threadPrompt: 'Help me understand retention.',
      dataSource: 'customers-collection',
      metadata: {
        foo: 'bar',
      },
    });
    expect(result.lastUpdated).toEqual(lastUpdated);
    expect(result).not.toHaveProperty('generatedAt');
    expect(result).not.toHaveProperty('expiresAt');
  });

  it('falls back to generatedAt and safe defaults when persisted fields are incomplete', () => {
    const generatedAt = new Date('2026-03-10T12:00:00.000Z');

    const result = normalizePersistedInsightCard('insight_unknown', {
      generatedAt: { toDate: () => generatedAt },
      expiresAt: { toDate: () => new Date('2026-03-11T12:00:00.000Z') },
    });

    expect(result).toMatchObject({
      id: 'insight_unknown',
      category: 'velocity',
      agentId: 'auto',
      agentName: 'Assistant',
      title: 'Insight',
      headline: 'No summary available',
      severity: 'info',
      actionable: false,
      dataSource: 'insights',
    });
    expect(result.lastUpdated).toEqual(generatedAt);
  });

  it('rewrites legacy loyalty revenue copy to tracked LTV context', () => {
    const result = normalizePersistedInsightCard('insight_loyalty_1', {
      category: 'customer',
      agentId: 'smokey',
      agentName: 'Smokey',
      title: 'LOYALTY PERFORMANCE',
      headline: '2 VIP customers generating 65% of revenue',
      subtext: '$1,086 avg LTV | 1 Loyal (34% combined)',
      severity: 'success',
      actionable: true,
      ctaLabel: 'VIP Rewards Program',
      threadPrompt: 'Create a VIP program for our 2 best customers (65% of revenue).',
      dataSource: 'insights',
      generatedAt: { toDate: () => new Date('2026-03-22T12:00:00.000Z') },
    });

    expect(result.headline).toBe('2 VIP customers hold 65% of tracked LTV');
    expect(result.subtext).toContain('CRM lifetime spend basis');
    expect(result.severity).toBe('warning');
    expect(result.ctaLabel).toBe('Reduce Concentration Risk');
    expect(result.threadPrompt).toContain('65% of tracked lifetime value');
  });
});
