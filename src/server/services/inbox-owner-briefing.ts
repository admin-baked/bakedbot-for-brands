import type { InboxArtifact, AnalyticsBriefing, BriefingMetric, InboxOwnerBriefingSummary } from '@/types/inbox';
import type { ProactiveCommitmentRecord } from '@/types/proactive';

const UNAVAILABLE_METRIC_VALUE = 'unavailable';
const SALES_SYNC_PRIORITY = 'Sales reporting: Recheck revenue trends after recent order history finishes loading';

function getArtifactTimestamp(artifact: InboxArtifact): number {
  const updatedAt = artifact.updatedAt instanceof Date ? artifact.updatedAt : new Date(artifact.updatedAt);
  if (!Number.isNaN(updatedAt.getTime())) {
    return updatedAt.getTime();
  }

  const createdAt = artifact.createdAt instanceof Date ? artifact.createdAt : new Date(artifact.createdAt);
  if (!Number.isNaN(createdAt.getTime())) {
    return createdAt.getTime();
  }

  return 0;
}

function getPrimaryYesterdayMetric(briefing: AnalyticsBriefing) {
  return briefing.metrics.find((metric) => metric.title === 'Net Sales Yesterday') ?? briefing.metrics[0];
}

function isUnavailableMetric(metric: BriefingMetric | undefined): boolean {
  return typeof metric?.value === 'string'
    && metric.value.trim().toLowerCase() === UNAVAILABLE_METRIC_VALUE;
}

function buildOwnerFriendlySyncPriority(briefing: AnalyticsBriefing): string | null {
  const hasUnavailableSalesMetric = briefing.metrics.some((metric) =>
    metric.title === 'Net Sales Yesterday' && isUnavailableMetric(metric)
  );

  if (hasUnavailableSalesMetric) {
    return SALES_SYNC_PRIORITY;
  }

  const hasUnavailableMetrics = briefing.metrics.some((metric) => isUnavailableMetric(metric));
  return hasUnavailableMetrics
    ? 'Data reporting: Recheck this briefing after the latest store metrics finish loading'
    : null;
}

function buildYesterdaySummary(briefing: AnalyticsBriefing): {
  happenedYesterday: string;
  happenedYesterdayDetail?: string;
} {
  const primaryMetric = getPrimaryYesterdayMetric(briefing);
  if (!primaryMetric) {
    return {
      happenedYesterday: `${briefing.dayOfWeek}'s daily briefing ran, but there were no tracked metrics yet.`,
    };
  }

  if (primaryMetric.title === 'Net Sales Yesterday' && isUnavailableMetric(primaryMetric)) {
    const detailParts = [
      'Recent order history is still loading, so revenue comparisons will appear automatically once the latest sales data arrives.',
    ];

    if (briefing.topAlert) {
      detailParts.push(briefing.topAlert);
    }

    return {
      happenedYesterday: "Yesterday's sales total is still loading.",
      happenedYesterdayDetail: detailParts.join(' '),
    };
  }

  const happenedYesterday = primaryMetric.title === 'Net Sales Yesterday'
    ? `Yesterday closed at ${primaryMetric.value}.`
    : `${primaryMetric.title}: ${primaryMetric.value}.`;

  const detailParts = [primaryMetric.vsLabel];
  if (briefing.topAlert) {
    detailParts.push(briefing.topAlert);
  }

  return {
    happenedYesterday,
    happenedYesterdayDetail: detailParts.filter(Boolean).join(' '),
  };
}

function buildTodayPriorities(
  briefing: AnalyticsBriefing,
  commitments: ProactiveCommitmentRecord[]
): string[] {
  const metricPriorities = briefing.metrics
    .filter((metric) => metric.status !== 'good' && !isUnavailableMetric(metric))
    .map((metric) =>
      metric.actionable
        ? `${metric.title}: ${metric.actionable}`
        : `${metric.title}: ${metric.value}`
    );
  const syncPriority = metricPriorities.length === 0
    ? buildOwnerFriendlySyncPriority(briefing)
    : null;

  const commitmentPriorities = commitments.map((commitment) => commitment.title);
  const seen = new Set<string>();

  return [
    ...metricPriorities,
    ...(syncPriority ? [syncPriority] : []),
    ...commitmentPriorities,
  ].filter((priority) => {
    if (!priority || seen.has(priority)) {
      return false;
    }
    seen.add(priority);
    return true;
  }).slice(0, 4);
}

export function selectLatestOwnerBriefingArtifact(
  artifacts: InboxArtifact[]
): InboxArtifact | null {
  const briefingArtifacts = artifacts.filter((artifact) => artifact.type === 'analytics_briefing');
  if (briefingArtifacts.length === 0) {
    return null;
  }

  briefingArtifacts.sort((left, right) => getArtifactTimestamp(right) - getArtifactTimestamp(left));
  return briefingArtifacts[0] ?? null;
}

export function buildInboxOwnerBriefingSummary(input: {
  briefing: AnalyticsBriefing;
  commitments?: ProactiveCommitmentRecord[];
}): InboxOwnerBriefingSummary {
  const commitments = input.commitments ?? [];
  const priorities = buildTodayPriorities(input.briefing, commitments);
  const todayMessage = priorities.length > 0
    ? `Focus on ${priorities.length === 1 ? 'this priority' : 'these priorities'} today.`
    : 'No urgent blockers right now. Review the briefing and keep today moving.';
  const yesterday = buildYesterdaySummary(input.briefing);

  return {
    date: input.briefing.date,
    urgencyLevel: input.briefing.urgencyLevel,
    happenedYesterday: yesterday.happenedYesterday,
    ...(yesterday.happenedYesterdayDetail
      ? { happenedYesterdayDetail: yesterday.happenedYesterdayDetail }
      : {}),
    workOnToday: todayMessage,
    priorities,
    ...(input.briefing.topAlert ? { topAlert: input.briefing.topAlert } : {}),
    openCommitments: commitments.length,
  };
}
