import type { MarketBenchmarks } from '@/types/market-benchmarks';
import { isGiftCardProductLike } from '@/lib/slow-mover-metrics';
import type { CatalogAnalyticsProduct } from './catalog-analytics-source';
import { toAnalyticsDate } from './catalog-analytics-source';

export interface SlowMoverAuditThresholds {
  watchDays: number;
  actionDays: number;
  liquidateDays: number;
  maxVelocityUnitsPerDay: number;
}

export interface SlowMoverAuditItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  cost?: number;
  stockLevel: number;
  daysSinceLastSale: number;
  salesVelocity: number;
  salesLast7Days: number;
  salesLast30Days: number;
  action: 'markdown' | 'liquidate';
  estimatedAtRisk: number;
  estimatedCostBasis?: number | null;
}

export interface SlowMoverAuditResult {
  items: SlowMoverAuditItem[];
  skippedMissingLastSale: number;
  skippedExcludedProducts: number;
  thresholds: SlowMoverAuditThresholds;
}

export function getSlowMoverThresholdsFromBenchmarks(
  benchmarks?: Pick<MarketBenchmarks, 'operations'> | null,
  overrides?: Partial<SlowMoverAuditThresholds>,
): SlowMoverAuditThresholds {
  const watchDays = benchmarks?.operations?.skuAgingActionDays?.watch ?? 30;
  const actionDays = benchmarks?.operations?.skuAgingActionDays?.action ?? 60;
  const liquidateDays = benchmarks?.operations?.skuAgingActionDays?.liquidate ?? 90;

  return {
    watchDays,
    actionDays,
    liquidateDays,
    maxVelocityUnitsPerDay: 0.1,
    ...overrides,
  };
}

export function buildSlowMoverAudit(
  products: CatalogAnalyticsProduct[],
  thresholds: SlowMoverAuditThresholds,
  options?: {
    limit?: number;
    now?: Date;
  },
): SlowMoverAuditResult {
  const now = options?.now ?? new Date();
  let skippedMissingLastSale = 0;
  let skippedExcludedProducts = 0;

  const items = products
    .flatMap((product) => {
      if ((product.stock ?? 0) <= 0) {
        return [];
      }

      if (isGiftCardProductLike(product)) {
        skippedExcludedProducts += 1;
        return [];
      }

      const lastSaleAt = toAnalyticsDate(product.lastSaleAt);
      if (!lastSaleAt) {
        skippedMissingLastSale += 1;
        return [];
      }

      const daysSinceLastSale = Math.max(
        0,
        Math.floor((now.getTime() - lastSaleAt.getTime()) / 86_400_000),
      );
      const salesVelocity = Number.isFinite(product.salesVelocity)
        ? product.salesVelocity
        : product.salesLast7Days > 0
          ? product.salesLast7Days / 7
          : product.salesLast30Days / 30;

      if (daysSinceLastSale < thresholds.actionDays) {
        return [];
      }

      if (salesVelocity >= thresholds.maxVelocityUnitsPerDay) {
        return [];
      }

      const estimatedAtRisk = Math.round(product.price * product.stock);
      const estimatedCostBasis = typeof product.cost === 'number'
        ? Math.round(product.cost * product.stock)
        : null;

      return [{
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        ...(typeof product.cost === 'number' ? { cost: product.cost } : {}),
        stockLevel: product.stock,
        daysSinceLastSale,
        salesVelocity,
        salesLast7Days: product.salesLast7Days,
        salesLast30Days: product.salesLast30Days,
        action: (daysSinceLastSale >= thresholds.liquidateDays ? 'liquidate' : 'markdown') as 'liquidate' | 'markdown',
        estimatedAtRisk,
        estimatedCostBasis,
      }];
    })
    .sort((a, b) => (
      b.estimatedAtRisk - a.estimatedAtRisk
      || b.daysSinceLastSale - a.daysSinceLastSale
      || a.name.localeCompare(b.name)
    ));

  return {
    items: typeof options?.limit === 'number' ? items.slice(0, options.limit) : items,
    skippedMissingLastSale,
    skippedExcludedProducts,
    thresholds,
  };
}
