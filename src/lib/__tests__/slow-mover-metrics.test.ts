import {
  buildSlowMoverMetricBundle,
  formatSlowMoverMetricValue,
  getSlowMoverMetric,
  isGiftCardProductLike,
  parseSlowMoverMetricBundle,
} from '../slow-mover-metrics';

describe('slow-mover-metrics', () => {
  it('detects gift-card catalog items by name or category', () => {
    expect(isGiftCardProductLike({ name: 'Gift Card - $100', category: 'Other' })).toBe(true);
    expect(isGiftCardProductLike({ name: 'THC Gummies', category: 'Gift Cards' })).toBe(true);
    expect(isGiftCardProductLike({ name: 'Flower Jar', category: 'Flower' })).toBe(false);
  });

  it('builds retail, cost, and unit metrics with coverage details', () => {
    const bundle = buildSlowMoverMetricBundle([
      { stockLevel: 10, estimatedAtRisk: 500, estimatedCostBasis: 220 },
      { stockLevel: 4, estimatedAtRisk: 180, estimatedCostBasis: null },
    ], {
      excludedNonInventoryCount: 2,
    });

    expect(bundle.summaryLine).toBe('2 SKUs | 14 units | 2 gift cards excluded');
    expect(bundle.totalUnits).toBe(14);
    expect(bundle.metrics).toEqual([
      expect.objectContaining({
        id: 'retail_value',
        value: 680,
      }),
      expect.objectContaining({
        id: 'cost_basis',
        value: 220,
        coverage: expect.objectContaining({
          includedSkus: 1,
          totalSkus: 2,
          missingSkus: 1,
        }),
      }),
      expect.objectContaining({
        id: 'unit_count',
        value: 14,
      }),
    ]);
  });

  it('parses persisted metric bundles and formats selected values', () => {
    const bundle = parseSlowMoverMetricBundle({
      defaultMetricId: 'cost_basis',
      totalSkus: 3,
      totalUnits: 27,
      excludedNonInventoryCount: 1,
      summaryLine: '3 SKUs | 27 units | 1 gift card excluded',
      metrics: [
        {
          id: 'retail_value',
          label: 'Retail Value',
          shortLabel: 'Retail',
          description: 'Retail carry value',
          value: 1200,
          format: 'currency',
        },
        {
          id: 'cost_basis',
          label: 'Cost Basis',
          shortLabel: 'Cost',
          description: 'Capital tied up',
          value: 480,
          format: 'currency',
        },
      ],
    });

    const selected = getSlowMoverMetric(bundle, bundle?.defaultMetricId);

    expect(bundle?.summaryLine).toBe('3 SKUs | 27 units | 1 gift card excluded');
    expect(selected?.id).toBe('cost_basis');
    expect(selected && formatSlowMoverMetricValue(selected)).toBe('$480');
  });
});
