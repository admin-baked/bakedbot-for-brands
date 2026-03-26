import {
  buildInboxOwnerBriefingSummary,
  selectLatestOwnerBriefingArtifact,
} from '../inbox-owner-briefing';
import type { InboxArtifact } from '@/types/inbox';
import type { ProactiveCommitmentRecord } from '@/types/proactive';

describe('inbox owner briefing summary', () => {
  it('prefers the most recent briefing artifact regardless of pulse type', () => {
    const middayArtifact = {
      id: 'artifact_midday',
      threadId: 'thread_1',
      orgId: 'org_test',
      type: 'analytics_briefing',
      status: 'approved',
      data: {
        date: '2026-03-22',
        dayOfWeek: 'Sunday',
        metrics: [],
        newsItems: [],
        urgencyLevel: 'warning',
        marketContext: 'NY Limited License',
        pulseType: 'midday',
      },
      createdBy: 'system',
      createdAt: new Date('2026-03-22T18:00:00.000Z'),
      updatedAt: new Date('2026-03-22T18:00:00.000Z'),
    } as unknown as InboxArtifact;

    const morningArtifact = {
      id: 'artifact_morning',
      threadId: 'thread_1',
      orgId: 'org_test',
      type: 'analytics_briefing',
      status: 'approved',
      data: {
        date: '2026-03-22',
        dayOfWeek: 'Sunday',
        metrics: [],
        newsItems: [],
        urgencyLevel: 'warning',
        marketContext: 'NY Limited License',
        pulseType: 'morning',
      },
      createdBy: 'system',
      createdAt: new Date('2026-03-22T13:00:00.000Z'),
      updatedAt: new Date('2026-03-22T13:00:00.000Z'),
    } as unknown as InboxArtifact;

    expect(selectLatestOwnerBriefingArtifact([middayArtifact, morningArtifact])?.id).toBe('artifact_midday');
  });

  it('builds owner-friendly yesterday and today summaries', () => {
    const commitments: ProactiveCommitmentRecord[] = [
      {
        id: 'commitment_1',
        tenantId: 'org_test',
        organizationId: 'org_test',
        taskId: 'task_1',
        commitmentType: 'follow_up',
        title: 'Review Sunday daily health briefing',
        state: 'open',
        payload: {},
        createdAt: new Date('2026-03-22T13:00:00.000Z'),
        updatedAt: new Date('2026-03-22T13:00:00.000Z'),
      },
    ];

    const summary = buildInboxOwnerBriefingSummary({
      briefing: {
        date: '2026-03-22',
        dayOfWeek: 'Sunday',
        metrics: [
          {
            title: 'Net Sales Yesterday',
            value: '$8,420',
            trend: 'down',
            vsLabel: 'vs. 7-day avg',
            status: 'warning',
            actionable: 'Review peak hour performance',
          },
          {
            title: 'Inventory At Risk',
            value: '$5,200 (18 SKUs)',
            trend: 'down',
            vsLabel: '60+ days no sale',
            status: 'warning',
            actionable: 'Consider markdown or liquidation',
          },
        ],
        newsItems: [],
        urgencyLevel: 'warning',
        marketContext: 'NY Limited License',
        topAlert: 'Discount rate is above target.',
        pulseType: 'morning',
      },
      commitments,
    });

    expect(summary.happenedYesterday).toBe('Yesterday closed at $8,420.');
    expect(summary.happenedYesterdayDetail).toContain('vs. 7-day avg');
    expect(summary.happenedYesterdayDetail).toContain('Discount rate is above target.');
    expect(summary.workOnToday).toContain('Focus on these priorities today.');
    expect(summary.priorities).toEqual([
      'Net Sales Yesterday: Review peak hour performance',
      'Inventory At Risk: Consider markdown or liquidation',
      'Review Sunday daily health briefing',
    ]);
    expect(summary.openCommitments).toBe(1);
  });

  it('turns unavailable sales data into owner-friendly loading copy', () => {
    const summary = buildInboxOwnerBriefingSummary({
      briefing: {
        date: '2026-03-26',
        dayOfWeek: 'Thursday',
        metrics: [
          {
            title: 'Net Sales Yesterday',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: 'recent sales history is not backfilled yet',
            status: 'warning',
            actionable: 'Verify Firestore order sync or run the sales backfill before reading revenue trends',
          },
          {
            title: 'Discount Rate (7-day avg)',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: 'need order totals to compare against the 18% market target',
            status: 'warning',
            actionable: 'Backfill recent orders before auditing discount performance',
          },
        ],
        newsItems: [],
        urgencyLevel: 'warning',
        marketContext: 'NY Limited License',
        pulseType: 'morning',
      },
    });

    expect(summary.happenedYesterday).toBe("Yesterday's sales total is still loading.");
    expect(summary.happenedYesterdayDetail).toContain('Recent order history is still loading');
    expect(summary.priorities).toEqual([
      'Sales reporting: Recheck revenue trends after recent order history finishes loading',
    ]);
    expect(summary.workOnToday).toContain('Focus on this priority today.');
  });
});
