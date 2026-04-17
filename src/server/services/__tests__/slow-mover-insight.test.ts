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
                totalValueAtRisk: 12500,
                topProducts: [
                  {
                    name: 'Old Flower',
                    category: 'Flower',
                    valueAtRisk: 1800,
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
      topProducts: [
        {
          name: 'Old Flower',
          category: 'Flower',
          valueAtRisk: 1800,
          daysInInventory: 74,
          price: 45,
          stockLevel: 40,
        },
      ],
      categoryBreakdown: {},
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
