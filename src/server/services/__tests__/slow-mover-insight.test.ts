import { getAdminFirestore } from '@/firebase/admin';
import { loadSlowMoverInsight } from '../slow-mover-insight';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

describe('slow-mover-insight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-16T20:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers metadata.totalSkus and falls back to generatedAt for freshness', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              headline: '$12,500 in slow-moving inventory (341 SKUs)',
              generatedAt: {
                toDate: () => new Date('2026-04-16T19:00:00.000Z'),
              },
              metadata: {
                totalSkus: 24,
                totalUnits: 96,
                totalValueAtRisk: 12500,
                excludedNonInventoryCount: 3,
                metricBundle: {
                  defaultMetricId: 'retail_value',
                  totalSkus: 24,
                  totalUnits: 96,
                  excludedNonInventoryCount: 3,
                  summaryLine: '24 SKUs | 96 units | 3 gift cards excluded',
                  metrics: [
                    {
                      id: 'retail_value',
                      label: 'Retail Value',
                      shortLabel: 'Retail',
                      description: 'Retail carry value',
                      value: 12500,
                      format: 'currency',
                    },
                  ],
                },
                topProducts: [
                  {
                    name: 'Old Flower',
                    category: 'Flower',
                    valueAtRisk: 1800,
                    retailValueAtRisk: 1800,
                    costBasis: 720,
                    daysInInventory: 74,
                    price: 45,
                    stockLevel: 40,
                  },
                ],
              },
            }),
          }),
        })),
      })),
    });

    await expect(loadSlowMoverInsight('org_thrive_syracuse')).resolves.toEqual({
      headline: '$12,500 in slow-moving inventory (341 SKUs)',
      totalValueAtRisk: 12500,
      totalSkus: 24,
      totalUnits: 96,
      topProducts: [
        {
          name: 'Old Flower',
          category: 'Flower',
          valueAtRisk: 1800,
          retailValueAtRisk: 1800,
          costBasis: 720,
          daysInInventory: 74,
          price: 45,
          stockLevel: 40,
        },
      ],
      categoryBreakdown: {},
      excludedNonInventoryCount: 3,
      metricBundle: {
        defaultMetricId: 'retail_value',
        totalSkus: 24,
        totalUnits: 96,
        excludedNonInventoryCount: 3,
        summaryLine: '24 SKUs | 96 units | 3 gift cards excluded',
        metrics: [
          {
            id: 'retail_value',
            label: 'Retail Value',
            shortLabel: 'Retail',
            description: 'Retail carry value',
            value: 12500,
            format: 'currency',
          },
        ],
      },
      dataFreshness: 'fresh (< 24h)',
    });
  });

  it('falls back to the headline sku count and lastUpdated when metadata is missing', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              headline: '$148,460 in slow-moving inventory (341 SKUs)',
              lastUpdated: '2026-04-14T20:00:00.000Z',
              metadata: {
                totalValueAtRisk: 148459.87,
                topProducts: [],
              },
            }),
          }),
        })),
      })),
    });

    const insight = await loadSlowMoverInsight('org_thrive_syracuse');

    expect(insight).toMatchObject({
      totalSkus: 341,
      totalValueAtRisk: 148459.87,
      dataFreshness: '2d old',
    });
  });
});
