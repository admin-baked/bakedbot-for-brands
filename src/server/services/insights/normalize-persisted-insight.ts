import type { InboxThreadType } from '@/types/inbox';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import type {
  InsightCard,
  InsightCategory,
  InsightSeverity,
  InsightTrend,
} from '@/types/insight-cards';

const INSIGHT_CATEGORIES = new Set<InsightCategory>([
  'velocity',
  'efficiency',
  'customer',
  'compliance',
  'market',
  'performance',
  'campaign',
  'distribution',
  'content',
  'competitive',
  'platform',
  'growth',
  'deployment',
  'support',
  'intelligence',
]);

const INSIGHT_SEVERITIES = new Set<InsightSeverity>([
  'critical',
  'warning',
  'info',
  'success',
]);

const INSIGHT_TRENDS = new Set<InsightTrend>(['up', 'down', 'stable']);


function toInsightCategory(value: unknown): InsightCategory {
  return typeof value === 'string' && INSIGHT_CATEGORIES.has(value as InsightCategory)
    ? (value as InsightCategory)
    : 'velocity';
}

function toInsightSeverity(value: unknown): InsightSeverity {
  return typeof value === 'string' && INSIGHT_SEVERITIES.has(value as InsightSeverity)
    ? (value as InsightSeverity)
    : 'info';
}

function toInsightTrend(value: unknown): InsightTrend | undefined {
  return typeof value === 'string' && INSIGHT_TRENDS.has(value as InsightTrend)
    ? (value as InsightTrend)
    : undefined;
}

function rewriteLegacyLoyaltyCopy(normalized: InsightCard): InsightCard {
  if (
    normalized.category !== 'customer' ||
    normalized.title !== 'LOYALTY PERFORMANCE'
  ) {
    return normalized;
  }

  const legacyMatch = normalized.headline.match(
    /^(\d+)\s+VIP customers generating (\d+)% of revenue$/i
  );

  if (!legacyMatch) {
    return normalized;
  }

  const vipCount = Number(legacyMatch[1]);
  const share = Number(legacyMatch[2]);
  const hasConcentrationRisk = vipCount > 0 && vipCount <= 3 && share >= 50;

  return {
    ...normalized,
    headline: `${vipCount} VIP customers hold ${share}% of tracked LTV`,
    subtext: normalized.subtext
      ? `${normalized.subtext} | CRM lifetime spend basis`
      : 'CRM lifetime spend basis, not yesterday sales',
    severity: hasConcentrationRisk ? 'warning' : normalized.severity,
    ctaLabel: hasConcentrationRisk ? 'Reduce Concentration Risk' : normalized.ctaLabel,
    threadPrompt: normalized.threadPrompt
      ? normalized.threadPrompt.replace(`${share}% of revenue`, `${share}% of tracked lifetime value`)
      : normalized.threadPrompt,
    dataSource:
      normalized.dataSource === 'insights' || normalized.dataSource === 'Customer segments (CRM)'
        ? 'Customer segments (CRM lifetime spend)'
        : normalized.dataSource,
  };
}

export function normalizePersistedInsightCard(
  docId: string,
  data: Record<string, unknown>
): InsightCard {
  const normalized: InsightCard = {
    id: docId,
    category: toInsightCategory(data.category),
    agentId: typeof data.agentId === 'string' && data.agentId ? data.agentId : 'auto',
    agentName:
      typeof data.agentName === 'string' && data.agentName ? data.agentName : 'Assistant',
    title: typeof data.title === 'string' && data.title ? data.title : 'Insight',
    headline:
      typeof data.headline === 'string' && data.headline
        ? data.headline
        : 'No summary available',
    severity: toInsightSeverity(data.severity),
    actionable: Boolean(data.actionable),
    lastUpdated: firestoreTimestampToDate(data.lastUpdated) ?? firestoreTimestampToDate(data.generatedAt) ?? new Date(),
    dataSource:
      typeof data.dataSource === 'string' && data.dataSource ? data.dataSource : 'insights',
  };

  if (typeof data.subtext === 'string' && data.subtext) {
    normalized.subtext = data.subtext;
  }

  if (typeof data.value === 'number' || typeof data.value === 'string') {
    normalized.value = data.value;
  }

  if (typeof data.unit === 'string' && data.unit) {
    normalized.unit = data.unit;
  }

  const trend = toInsightTrend(data.trend);
  if (trend) {
    normalized.trend = trend;
  }

  if (typeof data.trendValue === 'string' && data.trendValue) {
    normalized.trendValue = data.trendValue;
  }

  if (typeof data.ctaLabel === 'string' && data.ctaLabel) {
    normalized.ctaLabel = data.ctaLabel;
  }

  if (typeof data.threadType === 'string' && data.threadType) {
    normalized.threadType = data.threadType as InboxThreadType;
  }

  if (typeof data.threadPrompt === 'string' && data.threadPrompt) {
    normalized.threadPrompt = data.threadPrompt;
  }

  return rewriteLegacyLoyaltyCopy(normalized);
}
