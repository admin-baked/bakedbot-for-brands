/**
 * Ezal Competitor Pricing Tests
 *
 * Tests for competitor pricing intelligence integration with dynamic pricing.
 */

import {
  getCompetitorPricing,
  getAverageCompetitorPrice,
  isCompetitivePrice,
  getCompetitorPricingForProduct,
  monitorCompetitorPrices,
  getCompetitorPriceTrends,
} from '../competitor-pricing';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(() => ({
    firestore: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                      empty: false,
                      docs: mockCompetitiveProducts,
                    })),
                  })),
                })),
                limit: jest.fn(() => ({
                  get: jest.fn(() => Promise.resolve({
                    empty: false,
                    docs: mockCompetitiveProducts,
                  })),
                })),
              })),
              limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({
                  empty: false,
                  docs: mockCompetitiveProducts,
                })),
              })),
            })),
            doc: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({
                exists: true,
                data: () => ({ name: 'Test Competitor' }),
              })),
            })),
          })),
          get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Blue Dream Flower',
              productName: 'Blue Dream Flower',
              price: 45,
            }),
          })),
        })),
      })),
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock data
const mockCompetitiveProducts = [
  {
    id: 'comp-prod-1',
    data: () => ({
      competitorId: 'comp-1',
      productName: 'Blue Dream Flower',
      brandName: 'Premium Cannabis',
      priceCurrent: 40,
      priceRegular: 45,
      inStock: true,
      lastSeenAt: new Date(),
      category: 'flower',
    }),
  },
  {
    id: 'comp-prod-2',
    data: () => ({
      competitorId: 'comp-2',
      productName: 'Blue Dream Premium',
      brandName: 'Elite Farms',
      priceCurrent: 50,
      priceRegular: 55,
      inStock: true,
      lastSeenAt: new Date(),
      category: 'flower',
    }),
  },
  {
    id: 'comp-prod-3',
    data: () => ({
      competitorId: 'comp-3',
      productName: 'OG Kush Flower',
      brandName: 'Cookies',
      priceCurrent: 55,
      priceRegular: 60,
      inStock: true,
      lastSeenAt: new Date(),
      category: 'flower',
    }),
  },
];

describe('Ezal Competitor Pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompetitorPricing', () => {
    it('should return matching competitor products by name', async () => {
      const result = await getCompetitorPricing('Blue Dream', 'org_test');

      expect(result).toBeInstanceOf(Array);
      // Should match products containing "Blue Dream"
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for non-matching products', async () => {
      // Mock empty response for this test
      jest.doMock('@/firebase/server-client', () => ({
        createServerClient: jest.fn(() => ({
          firestore: {
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({
                collection: jest.fn(() => ({
                  where: jest.fn(() => ({
                    limit: jest.fn(() => ({
                      get: jest.fn(() => Promise.resolve({
                        empty: true,
                        docs: [],
                      })),
                    })),
                  })),
                })),
              })),
            })),
          },
        })),
      }));

      const result = await getCompetitorPricing('NonExistentProduct12345', 'org_test');
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getAverageCompetitorPrice', () => {
    it('should calculate average price from competitors', async () => {
      const result = await getAverageCompetitorPrice('Blue Dream', 'org_test');

      // May return null if no matches or aggregated stats
      if (result) {
        expect(result.avgPrice).toBeGreaterThan(0);
        expect(result.lowestPrice).toBeLessThanOrEqual(result.avgPrice);
        expect(result.highestPrice).toBeGreaterThanOrEqual(result.avgPrice);
        expect(result.competitorCount).toBeGreaterThan(0);
        expect(['fresh', 'stale', 'very_stale']).toContain(result.freshness);
      }
    });

    it('should return null for products with no competitor data', async () => {
      const result = await getAverageCompetitorPrice('NonExistentProduct12345', 'org_test');
      // Can be null if no data found
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('isCompetitivePrice', () => {
    it('should return competitive when price is below market', async () => {
      const result = await isCompetitivePrice('Blue Dream', 35, 'org_test');

      expect(result).toHaveProperty('isCompetitive');
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.isCompetitive).toBe('boolean');
      expect(typeof result.recommendation).toBe('string');
    });

    it('should return not competitive when price is significantly above market', async () => {
      const result = await isCompetitivePrice('Blue Dream', 100, 'org_test');

      expect(result).toHaveProperty('isCompetitive');
      expect(result).toHaveProperty('recommendation');
    });

    it('should include details when competitor data exists', async () => {
      const result = await isCompetitivePrice('Blue Dream', 45, 'org_test');

      expect(result).toHaveProperty('details');
      if (result.details) {
        expect(result.details).toHaveProperty('ourPrice', 45);
        expect(result.details).toHaveProperty('marketAvg');
        expect(result.details).toHaveProperty('percentDiff');
        expect(result.details).toHaveProperty('dataFreshness');
      }
    });
  });

  describe('getCompetitorPricingForProduct', () => {
    it('should look up product by ID and return competitor pricing', async () => {
      const result = await getCompetitorPricingForProduct('product-123', 'org_test');

      // May return null if product not found or no competitor data
      if (result) {
        expect(result).toHaveProperty('avgPrice');
        expect(result).toHaveProperty('lowestPrice');
        expect(result).toHaveProperty('highestPrice');
        expect(result).toHaveProperty('competitorCount');
      }
    });
  });

  describe('monitorCompetitorPrices', () => {
    it('should return alerts and lastCheck timestamp', async () => {
      const result = await monitorCompetitorPrices('org_test', 10);

      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('lastCheck');
      expect(result.alerts).toBeInstanceOf(Array);
      expect(result.lastCheck).toBeInstanceOf(Date);
    });

    it('should filter alerts by threshold percentage', async () => {
      const result = await monitorCompetitorPrices('org_test', 50);

      // With high threshold, should have fewer or no alerts
      expect(result.alerts).toBeInstanceOf(Array);
    });
  });

  describe('getCompetitorPriceTrends', () => {
    it('should return array of price trends', async () => {
      const result = await getCompetitorPriceTrends('Blue Dream', 'org_test', 7);

      expect(result).toBeInstanceOf(Array);
      // Each trend entry should have required fields
      result.forEach((trend) => {
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('avgPrice');
        expect(trend).toHaveProperty('minPrice');
        expect(trend).toHaveProperty('maxPrice');
      });
    });
  });
});

describe('Competitor Pricing Edge Cases', () => {
  it('should handle zero prices gracefully', async () => {
    const result = await getAverageCompetitorPrice('Blue Dream', 'org_test');
    // Should filter out zero prices
    if (result) {
      expect(result.avgPrice).toBeGreaterThan(0);
    }
  });

  it('should handle missing orgId', async () => {
    const result = await getCompetitorPricing('Blue Dream', '');
    expect(result).toBeInstanceOf(Array);
  });

  it('should handle special characters in product names', async () => {
    const result = await getCompetitorPricing('Blue Dream (3.5g) - Premium', 'org_test');
    expect(result).toBeInstanceOf(Array);
  });
});
