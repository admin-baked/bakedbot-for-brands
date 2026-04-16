import { buildSlowMoverAudit, getSlowMoverThresholdsFromBenchmarks } from '../slow-mover-audit';

describe('slow-mover-audit', () => {
  const thresholds = getSlowMoverThresholdsFromBenchmarks({
    operations: {
      skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
    },
  } as any);

  it('flags only in-stock products past the action window with near-zero velocity', () => {
    const result = buildSlowMoverAudit([
      {
        id: 'keep',
        name: 'Fast Mover',
        category: 'Flower',
        price: 40,
        stock: 5,
        salesLast7Days: 7,
        salesLast30Days: 20,
        salesVelocity: 1,
        lastSaleAt: new Date('2026-04-10T00:00:00Z'),
        dynamicPricingApplied: false,
      },
      {
        id: 'flag',
        name: 'Dormant SKU',
        category: 'Edibles',
        price: 30,
        stock: 8,
        salesLast7Days: 0,
        salesLast30Days: 0,
        salesVelocity: 0,
        lastSaleAt: new Date('2026-01-15T00:00:00Z'),
        dynamicPricingApplied: false,
      },
    ], thresholds, {
      now: new Date('2026-04-16T00:00:00Z'),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      productId: 'flag',
      action: 'liquidate',
      estimatedAtRisk: 240,
      daysSinceLastSale: 91,
    });
  });

  it('skips products with missing last-sale telemetry to avoid inflated counts', () => {
    const result = buildSlowMoverAudit([
      {
        id: 'unknown',
        name: 'Unknown History',
        category: 'Vapes',
        price: 25,
        stock: 10,
        salesLast7Days: 0,
        salesLast30Days: 0,
        salesVelocity: 0,
        lastSaleAt: undefined,
        dynamicPricingApplied: false,
      },
    ], thresholds, {
      now: new Date('2026-04-16T00:00:00Z'),
    });

    expect(result.items).toEqual([]);
    expect(result.skippedMissingLastSale).toBe(1);
  });

  it('sorts by dollars at risk and respects the provided limit', () => {
    const result = buildSlowMoverAudit([
      {
        id: 'low',
        name: 'Low Risk',
        category: 'Flower',
        price: 10,
        stock: 3,
        salesLast7Days: 0,
        salesLast30Days: 0,
        salesVelocity: 0,
        lastSaleAt: new Date('2025-12-15T00:00:00Z'),
        dynamicPricingApplied: false,
      },
      {
        id: 'high',
        name: 'High Risk',
        category: 'Edibles',
        price: 50,
        stock: 4,
        salesLast7Days: 0,
        salesLast30Days: 0,
        salesVelocity: 0,
        lastSaleAt: new Date('2025-12-20T00:00:00Z'),
        dynamicPricingApplied: false,
      },
    ], thresholds, {
      now: new Date('2026-04-16T00:00:00Z'),
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productId).toBe('high');
  });
});
