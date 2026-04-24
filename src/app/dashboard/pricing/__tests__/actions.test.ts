import {
  getPricingAnalytics,
  getProductCategories,
  getRulePerformanceData,
  previewRuleScope,
} from '../actions';
import { getPricingRules } from '@/app/actions/dynamic-pricing';
import { loadCatalogAnalyticsProducts } from '@/server/services/catalog-analytics-source';

jest.mock('@/app/actions/dynamic-pricing', () => ({
  getPricingRules: jest.fn(),
}));

jest.mock('@/server/services/catalog-analytics-source', () => ({
  loadCatalogAnalyticsProducts: jest.fn(),
  toAnalyticsDate: jest.requireActual('@/server/services/catalog-analytics-source').toAnalyticsDate,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('pricing dashboard actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(Date.parse('2026-03-21T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes pricing analytics from the shared catalog source', async () => {
    (getPricingRules as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'rule-flower',
          name: 'Flower markdown',
          active: true,
          conditions: { categories: ['flower'] },
          priceAdjustment: { type: 'percentage', value: 0.1 },
          timesApplied: 5,
          revenueImpact: -60,
          avgConversionRate: 3.4,
        },
        {
          id: 'rule-edibles',
          name: 'Edibles clearance',
          active: true,
          conditions: { categories: ['edibles'] },
          priceAdjustment: { type: 'fixed_amount', value: 3 },
          timesApplied: 0,
          revenueImpact: 0,
          avgConversionRate: 0,
        },
        {
          id: 'rule-inactive',
          name: 'Inactive rule',
          active: false,
          conditions: {},
          priceAdjustment: { type: 'percentage', value: 0.05 },
          timesApplied: 10,
          revenueImpact: 25,
          avgConversionRate: 5,
        },
      ],
    });

    (loadCatalogAnalyticsProducts as jest.Mock).mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Blue Dream',
        category: 'Flower',
        price: 18,
        originalPrice: 20,
        cost: 10,
        stock: 8,
        salesLast7Days: 7,
        salesLast30Days: 30,
        salesVelocity: 1,
        dynamicPricingApplied: true,
        dynamicPricingUpdatedAt: '2026-03-20T00:00:00.000Z',
      },
      {
        id: 'prod-2',
        name: 'OG Cartridge',
        category: 'Vape',
        price: 35,
        cost: 20,
        stock: 5,
        salesLast7Days: 5,
        salesLast30Days: 20,
        salesVelocity: 0.7,
        dynamicPricingApplied: false,
      },
      {
        id: 'prod-3',
        name: 'Night Gummies',
        category: 'Edibles',
        price: 12,
        originalPrice: 15,
        cost: 6,
        stock: 14,
        salesLast7Days: 0,
        salesLast30Days: 10,
        salesVelocity: 0.2,
        dynamicPricingApplied: true,
        dynamicPricingUpdatedAt: '2026-03-19T00:00:00.000Z',
      },
    ]);

    const result = await getPricingAnalytics('org-1');

    expect(result.overview.totalProducts).toBe(3);
    expect(result.overview.productsWithDynamicPricing).toBe(2);
    expect(result.overview.avgDiscountPercent).toBe(15);
    expect(result.overview.totalRevenue).toBe(1360);
    expect(result.overview.revenueImpact).toBe(-90);
    expect(result.overview.marginImpact).toBe(-90);
    expect(result.rulePerformance).toHaveLength(2);
    expect(result.rulePerformance[0]).toMatchObject({
      ruleId: 'rule-edibles',
      revenue: -30,
    });
    expect(result.rulePerformance[1]).toMatchObject({
      ruleId: 'rule-flower',
      revenue: -60,
      timesApplied: 5,
    });
    expect(result.productPerformance[0]).toMatchObject({
      productId: 'prod-2',
      revenue: 700,
    });
  });

  it('builds a deterministic pricing update series from live menu pricing', async () => {
    (loadCatalogAnalyticsProducts as jest.Mock).mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Blue Dream',
        category: 'Flower',
        price: 20,
        originalPrice: 22,
        stock: 8,
        salesLast7Days: 7,
        salesLast30Days: 30,
        salesVelocity: 1,
        dynamicPricingApplied: true,
        dynamicPricingUpdatedAt: '2026-03-20T00:00:00.000Z',
      },
      {
        id: 'prod-2',
        name: 'Always On',
        category: 'Edibles',
        price: 10,
        originalPrice: 12,
        stock: 5,
        salesLast7Days: 0,
        salesLast30Days: 30,
        salesVelocity: 0,
        dynamicPricingApplied: true,
      },
    ]);

    const result = await getRulePerformanceData('org-1', 3);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      { date: '2026-03-19', revenue: 10, applications: 1 },
      { date: '2026-03-20', revenue: 30, applications: 1 },
      { date: '2026-03-21', revenue: 30, applications: 0 },
    ]);
  });

  it('previews scope from normalized products and exposes runtime flags', async () => {
    (loadCatalogAnalyticsProducts as jest.Mock).mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Blue Dream',
        category: 'Flower',
        price: 20,
        originalPrice: 22,
        cost: 10,
        stock: 8,
        salesLast7Days: 7,
        salesLast30Days: 30,
        salesVelocity: 1,
        dynamicPricingApplied: false,
      },
      {
        id: 'prod-2',
        name: 'Night Gummies',
        category: 'Edibles',
        price: 15,
        stock: 3,
        salesLast7Days: 2,
        salesLast30Days: 8,
        salesVelocity: 0.3,
        dynamicPricingApplied: false,
      },
    ]);

    const result = await previewRuleScope('org-1', {
      conditions: {
        categories: ['flower'],
        inventoryAge: { min: 30 },
      },
      priceAdjustment: {
        type: 'percentage',
        value: 0.1,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      count: 1,
      totalProducts: 2,
      hasRuntimeConditions: true,
    });
    expect(result.data?.products[0]).toMatchObject({
      id: 'prod-1',
      discountedPrice: 18,
      discountPercent: 10,
    });
  });

  it('loads distinct categories from the canonical product source', async () => {
    (loadCatalogAnalyticsProducts as jest.Mock).mockResolvedValue([
      { id: 'prod-1', name: 'A', category: 'Flower', price: 10, stock: 1, salesLast7Days: 0, salesLast30Days: 0, salesVelocity: 0, dynamicPricingApplied: false },
      { id: 'prod-2', name: 'B', category: 'Edibles', price: 12, stock: 1, salesLast7Days: 0, salesLast30Days: 0, salesVelocity: 0, dynamicPricingApplied: false },
      { id: 'prod-3', name: 'C', category: 'Flower', price: 8, stock: 1, salesLast7Days: 0, salesLast30Days: 0, salesVelocity: 0, dynamicPricingApplied: false },
    ]);

    const result = await getProductCategories('org-1');

    expect(result).toEqual({
      success: true,
      categories: ['Edibles', 'Flower'],
    });
  });
});
