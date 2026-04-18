export type SlowMoverMetricId = 'retail_value' | 'cost_basis' | 'unit_count';

export type SlowMoverMetricFormat = 'currency' | 'count';

export interface SlowMoverMetricCoverage {
  includedSkus: number;
  totalSkus: number;
  missingSkus: number;
  note: string;
}

export interface SlowMoverMetricSnapshot {
  id: SlowMoverMetricId;
  label: string;
  shortLabel: string;
  description: string;
  value: number;
  format: SlowMoverMetricFormat;
  coverage?: SlowMoverMetricCoverage;
}

export interface SlowMoverMetricBundle {
  defaultMetricId: SlowMoverMetricId;
  metrics: SlowMoverMetricSnapshot[];
  totalSkus: number;
  totalUnits: number;
  excludedNonInventoryCount: number;
  summaryLine: string;
}

export interface SlowMoverMetricItemLike {
  stockLevel: number;
  estimatedAtRisk: number;
  estimatedCostBasis?: number | null;
}

const GIFT_CARD_PATTERN = /\bgift\s*cards?\b/i;

export function isGiftCardProductLike(product: {
  name?: string | null;
  category?: string | null;
}): boolean {
  return GIFT_CARD_PATTERN.test(product.name ?? '')
    || GIFT_CARD_PATTERN.test(product.category ?? '');
}

export function formatSlowMoverMetricValue(metric: SlowMoverMetricSnapshot): string {
  if (metric.format === 'currency') {
    return `$${Math.round(metric.value).toLocaleString()}`;
  }

  return `${Math.round(metric.value).toLocaleString()} units`;
}

export function getSlowMoverMetric(
  bundle: SlowMoverMetricBundle | null | undefined,
  metricId?: string | null,
): SlowMoverMetricSnapshot | null {
  if (!bundle) {
    return null;
  }

  const requested = typeof metricId === 'string'
    ? bundle.metrics.find((metric) => metric.id === metricId)
    : null;

  if (requested) {
    return requested;
  }

  return bundle.metrics.find((metric) => metric.id === bundle.defaultMetricId)
    ?? bundle.metrics[0]
    ?? null;
}

export function buildSlowMoverMetricBundle(
  items: SlowMoverMetricItemLike[],
  options?: {
    defaultMetricId?: SlowMoverMetricId;
    excludedNonInventoryCount?: number;
  },
): SlowMoverMetricBundle {
  const totalSkus = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.stockLevel, 0);
  const excludedNonInventoryCount = Math.max(options?.excludedNonInventoryCount ?? 0, 0);

  const retailValue = items.reduce((sum, item) => sum + item.estimatedAtRisk, 0);
  const costedItems = items.filter((item) => typeof item.estimatedCostBasis === 'number');
  const costBasis = costedItems.reduce((sum, item) => sum + (item.estimatedCostBasis ?? 0), 0);
  const missingCostSkus = Math.max(totalSkus - costedItems.length, 0);

  const metrics: SlowMoverMetricSnapshot[] = [
    {
      id: 'retail_value',
      label: 'Retail Value',
      shortLabel: 'Retail',
      description: 'Selling-price value of slow-moving inventory using current menu price times units on hand.',
      value: retailValue,
      format: 'currency',
    },
    {
      id: 'cost_basis',
      label: 'Cost Basis',
      shortLabel: 'Cost',
      description: 'Capital tied up in slow-moving inventory using synced cost or wholesale fields times units on hand.',
      value: costBasis,
      format: 'currency',
      ...(missingCostSkus > 0
        ? {
            coverage: {
              includedSkus: costedItems.length,
              totalSkus,
              missingSkus: missingCostSkus,
              note: `Cost data is synced for ${costedItems.length}/${totalSkus} slow-moving SKUs. ${missingCostSkus} SKU${missingCostSkus === 1 ? '' : 's'} are excluded from this cost total.`,
            },
          }
        : {}),
    },
    {
      id: 'unit_count',
      label: 'Units On Hand',
      shortLabel: 'Units',
      description: 'Physical units sitting in slow-moving SKUs. Useful for shelf-space and liquidation planning.',
      value: totalUnits,
      format: 'count',
    },
  ];

  const summaryBits = [
    `${totalSkus.toLocaleString()} SKU${totalSkus === 1 ? '' : 's'}`,
    `${totalUnits.toLocaleString()} units`,
  ];

  if (excludedNonInventoryCount > 0) {
    summaryBits.push(
      `${excludedNonInventoryCount.toLocaleString()} gift card${excludedNonInventoryCount === 1 ? '' : 's'} excluded`,
    );
  }

  return {
    defaultMetricId: options?.defaultMetricId ?? 'retail_value',
    metrics,
    totalSkus,
    totalUnits,
    excludedNonInventoryCount,
    summaryLine: summaryBits.join(' | '),
  };
}

function isMetricFormat(value: unknown): value is SlowMoverMetricFormat {
  return value === 'currency' || value === 'count';
}

function isMetricId(value: unknown): value is SlowMoverMetricId {
  return value === 'retail_value' || value === 'cost_basis' || value === 'unit_count';
}

export function parseSlowMoverMetricBundle(value: unknown): SlowMoverMetricBundle | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const bundle = value as Record<string, unknown>;
  const metrics = Array.isArray(bundle.metrics)
    ? bundle.metrics.flatMap((metric): SlowMoverMetricSnapshot[] => {
        if (!metric || typeof metric !== 'object') {
          return [];
        }

        const candidate = metric as Record<string, unknown>;
        if (!isMetricId(candidate.id) || !isMetricFormat(candidate.format)) {
          return [];
        }

        const normalized: SlowMoverMetricSnapshot = {
          id: candidate.id,
          label: typeof candidate.label === 'string' ? candidate.label : candidate.id,
          shortLabel: typeof candidate.shortLabel === 'string' ? candidate.shortLabel : candidate.id,
          description: typeof candidate.description === 'string' ? candidate.description : '',
          value: typeof candidate.value === 'number' ? candidate.value : 0,
          format: candidate.format,
        };

        if (candidate.coverage && typeof candidate.coverage === 'object') {
          const coverage = candidate.coverage as Record<string, unknown>;
          normalized.coverage = {
            includedSkus: typeof coverage.includedSkus === 'number' ? coverage.includedSkus : 0,
            totalSkus: typeof coverage.totalSkus === 'number' ? coverage.totalSkus : 0,
            missingSkus: typeof coverage.missingSkus === 'number' ? coverage.missingSkus : 0,
            note: typeof coverage.note === 'string' ? coverage.note : '',
          };
        }

        return [normalized];
      })
    : [];

  if (metrics.length === 0) {
    return null;
  }

  const totalSkus = typeof bundle.totalSkus === 'number' ? bundle.totalSkus : 0;
  const totalUnits = typeof bundle.totalUnits === 'number' ? bundle.totalUnits : 0;
  const excludedNonInventoryCount =
    typeof bundle.excludedNonInventoryCount === 'number' ? bundle.excludedNonInventoryCount : 0;

  return {
    defaultMetricId: isMetricId(bundle.defaultMetricId) ? bundle.defaultMetricId : metrics[0].id,
    metrics,
    totalSkus,
    totalUnits,
    excludedNonInventoryCount,
    summaryLine: typeof bundle.summaryLine === 'string'
      ? bundle.summaryLine
      : [
          `${totalSkus.toLocaleString()} SKU${totalSkus === 1 ? '' : 's'}`,
          `${totalUnits.toLocaleString()} units`,
          ...(excludedNonInventoryCount > 0
            ? [`${excludedNonInventoryCount.toLocaleString()} gift card${excludedNonInventoryCount === 1 ? '' : 's'} excluded`]
            : []),
        ].join(' | '),
  };
}
