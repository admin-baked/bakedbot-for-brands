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
      severity: 'success',
      actionable: true,
      ctaLabel: 'View Customers',
      threadType: 'customer_health',
      threadPrompt: 'Help me understand retention.',
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
      threadType: 'customer_health',
      threadPrompt: 'Help me understand retention.',
      dataSource: 'customers-collection',
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
});
