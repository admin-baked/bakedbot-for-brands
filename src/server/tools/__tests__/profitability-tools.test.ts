/**
 * Unit Tests for Profitability Tools (Money Mike Agent)
 *
 * Tests the agent tools for 280E analysis, NY tax calculations,
 * profitability metrics, and price compression.
 */

import {
  profitabilityToolDefs,
  analyzePriceCompressionForAgent,
  getCategoryCogsForAgent,
  executeProfitabilityTool,
} from '../profitability-tools';

// Mock services
jest.mock('@/server/services/cannabis-tax', () => ({
  calculate280EAnalysis: jest.fn().mockResolvedValue({
    tenantId: 'test-org',
    periodStart: new Date(),
    periodEnd: new Date(),
    grossRevenue: 100000,
    directCOGS: 40000,
    indirectCOGS: 10000,
    totalCOGS: 50000,
    nonDeductibleExpenses: 20000,
    grossProfit: 50000,
    estimatedTaxRate: 0.70,
    estimatedTaxLiability: 14000,
    paperProfit: 30000,
    cashReserveNeeded: 22500,
    actualCashProfit: 7500,
    potentialCogsAllocation: 5000,
    optimizationSuggestions: ['Review indirect expenses'],
    expenseBreakdown: [],
  }),
  calculateNYTaxSummary: jest.fn().mockResolvedValue({
    tenantId: 'test-org',
    periodStart: new Date(),
    periodEnd: new Date(),
    grossSales: 100000,
    potencyTaxCollected: 2000,
    salesTaxCollected: 13000,
    totalTaxCollected: 15000,
    potencyTaxOwed: 2000,
    salesTaxOwed: 13000,
    totalTaxOwed: 15000,
    netRevenueAfterTax: 85000,
    categoryBreakdown: [
      { category: 'flower', unitsSold: 500, grossSales: 50000, potencyTax: 1000, salesTax: 6500 },
      { category: 'concentrate', unitsSold: 200, grossSales: 30000, potencyTax: 700, salesTax: 3900 },
      { category: 'edible', unitsSold: 100, grossSales: 20000, potencyTax: 300, salesTax: 2600 },
    ],
  }),
  calculateProfitabilityMetrics: jest.fn().mockResolvedValue({
    tenantId: 'test-org',
    periodStart: new Date(),
    periodEnd: new Date(),
    grossRevenue: 100000,
    cogs: 50000,
    grossProfit: 50000,
    grossMargin: 0.50,
    operatingExpenses: 20000,
    operatingProfit: 30000,
    operatingMargin: 0.30,
    tax280ELiability: 14000,
    netProfitAfter280E: 7500,
    effectiveTaxRate: 0.70,
    revenuePerSqFt: 1200,
    revenuePerEmployee: 180000,
    inventoryTurnover: 10,
    categoryPerformance: [
      { category: 'flower', revenue: 50000, cogs: 25000, grossProfit: 25000, margin: 0.50, benchmark: 0.40, performance: 'above' },
    ],
    vsLastPeriod: { revenueChange: 0.05, marginChange: 0.02, profitChange: 0.03 },
  }),
  calculatePriceCompression: jest.fn((price, volume, drop) => {
    const increase = drop / (1 - drop);
    return {
      tenantId: '',
      analysisDate: new Date(),
      currentAveragePrice: price,
      currentVolume: volume,
      currentRevenue: price * volume,
      marketPriceDropPercent: drop,
      requiredVolumeIncrease: increase,
      requiredNewVolume: volume * (1 + increase),
      scenarios: [
        { priceDropPercent: 0.10, volumeIncreaseNeeded: 0.1111, newVolume: volume * 1.1111, revenueAtNewPrice: price * 0.9 * volume * 1.1111, breakeven: true },
        { priceDropPercent: 0.20, volumeIncreaseNeeded: 0.25, newVolume: volume * 1.25, revenueAtNewPrice: price * 0.8 * volume * 1.25, breakeven: true },
      ],
      recommendations: ['Consider tiered pricing strategy'],
    };
  }),
  calculateWorkingCapital: jest.fn().mockResolvedValue({
    tenantId: 'test-org',
    analysisDate: new Date(),
    cashOnHand: 50000,
    accountsReceivable: 0,
    inventoryValue: 100000,
    accountsPayable: 30000,
    workingCapital: 120000,
    currentRatio: 5.0,
    quickRatio: 1.67,
    monthlyOperatingExpenses: 15000,
    monthlyRevenue: 25000,
    monthlyCashBurn: -10000,
    runwayMonths: 5,
    taxReserve: 11250,
    bankingFees: 1800,
    liquidityRisk: 'medium',
    riskFactors: ['Cash runway below target'],
    recommendations: ['Build additional cash reserves'],
  }),
  getTenantTaxConfig: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/server/actions/profitability', () => ({
  getProductProfitabilityData: jest.fn().mockResolvedValue({
    products: [
      {
        id: 'preroll-1',
        name: 'House Pre-Roll',
        category: 'Pre-Rolls',
        retailPrice: 10,
        effectiveCost: 4,
        costSource: 'cost_of_good',
        marginPercent: 0.6,
        marginAmount: 6,
        stockCount: 10,
        inventoryValue: 40,
      },
      {
        id: 'preroll-2',
        name: 'Infused Pre-Roll',
        category: 'pre-roll',
        retailPrice: 12,
        effectiveCost: 5,
        costSource: 'batch_cost',
        marginPercent: 7 / 12,
        marginAmount: 7,
        stockCount: 20,
        inventoryValue: 100,
      },
      {
        id: 'preroll-3',
        name: 'Budget Pre-Roll',
        category: 'prerolls',
        retailPrice: 8,
        effectiveCost: null,
        costSource: 'none',
        marginPercent: null,
        marginAmount: null,
        stockCount: 5,
        inventoryValue: null,
      },
      {
        id: 'flower-1',
        name: 'Blue Dream',
        category: 'Flower',
        retailPrice: 35,
        effectiveCost: 15,
        costSource: 'cost_of_good',
        marginPercent: 20 / 35,
        marginAmount: 20,
        stockCount: 8,
        inventoryValue: 120,
      },
    ],
    summary: {
      totalInventoryValue: 260,
      totalRevenuePotential: 500,
      avgMarginPercent: 0.58,
      productsWithCogs: 3,
      productsWithoutCogs: 1,
    },
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Profitability Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // TOOL DEFINITIONS TESTS
  // ==========================================================================
  describe('profitabilityToolDefs', () => {
    it('should have 6 tool definitions', () => {
      expect(profitabilityToolDefs).toHaveLength(6);
    });

    it('should have analyze280ETax tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'analyze280ETax');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('280E');
      expect(tool?.schema).toBeDefined();
    });

    it('should have calculateNYCannabsTax tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'calculateNYCannabsTax');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('potency tax');
      expect(tool?.description).toContain('13%');
    });

    it('should have getProfitabilityMetrics tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'getProfitabilityMetrics');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('gross margin');
      expect(tool?.description).toContain('benchmark');
    });

    it('should have getCategoryCogs tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'getCategoryCogs');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('current synced COGS');
      expect(tool?.description).toContain('prerolls');
    });

    it('should have analyzePriceCompression tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'analyzePriceCompression');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('GTI Rule');
    });

    it('should have analyzeWorkingCapital tool', () => {
      const tool = profitabilityToolDefs.find(t => t.name === 'analyzeWorkingCapital');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('liquidity');
      expect(tool?.description).toContain('runway');
    });
  });

  // ==========================================================================
  // PRICE COMPRESSION TOOL TESTS
  // ==========================================================================
  describe('analyzePriceCompressionForAgent', () => {
    it('should return formatted summary with GTI rule', () => {
      const result = analyzePriceCompressionForAgent(50, 1000, 0.20);

      expect(result.summary).toContain('Price Compression Analysis');
      expect(result.summary).toContain('GTI Rule');
      expect(result.summary).toContain('20%');
    });

    it('should calculate correct revenue', () => {
      const result = analyzePriceCompressionForAgent(50, 1000, 0.20);

      expect(result.analysis.currentRevenue).toBe(50000);
    });

    it('should calculate GTI rule volume increase', () => {
      const result = analyzePriceCompressionForAgent(100, 500, 0.20);

      // 20% drop = 0.20 / 0.80 = 0.25 (25% increase needed)
      expect(result.analysis.requiredVolumeIncrease).toBeCloseTo(0.25);
      expect(result.analysis.requiredNewVolume).toBeCloseTo(625);
    });

    it('should include scenarios and recommendations', () => {
      const result = analyzePriceCompressionForAgent(75, 2000, 0.25);

      expect(result.scenarios.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getCategoryCogsForAgent', () => {
    it('should return a category COGS snapshot from synced product data', async () => {
      const result = await getCategoryCogsForAgent('prerolls');

      expect(result.summary).toContain('Pre-Rolls COGS Snapshot');
      expect(result.summary).toContain('Average unit COGS: $4.50');
      expect(result.data).toMatchObject({
        category: 'Pre-Rolls',
        matchedProducts: 3,
        productsWithCogs: 2,
        productsWithoutCogs: 1,
        averageUnitCogs: 4.5,
        averageRetailPrice: 11,
        currentInventoryCogs: 140,
        unitsInStock: 30,
      });
      expect(result.lowestMarginProducts[0].name).toBe('Infused Pre-Roll');
    });
  });

  // ==========================================================================
  // TOOL EXECUTOR TESTS
  // ==========================================================================
  describe('executeProfitabilityTool', () => {
    it('should execute analyze280ETax tool', async () => {
      const result = await executeProfitabilityTool('analyze280ETax', {
        tenantId: 'test-org',
        period: 'current_month',
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('280E');
      expect((result as any).data).toBeDefined();
      expect((result as any).optimizations).toBeDefined();
    });

    it('should execute calculateNYCannabsTax tool', async () => {
      const result = await executeProfitabilityTool('calculateNYCannabsTax', {
        tenantId: 'test-org',
        period: 'current_month',
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('NY Cannabis Tax');
      expect((result as any).data.grossSales).toBeDefined();
      expect((result as any).categoryBreakdown).toBeDefined();
    });

    it('should execute getProfitabilityMetrics tool', async () => {
      const result = await executeProfitabilityTool('getProfitabilityMetrics', {
        tenantId: 'test-org',
        period: 'current_month',
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('Profitability Metrics');
      expect((result as any).metrics.grossMargin).toBeDefined();
      expect((result as any).categoryPerformance).toBeDefined();
    });

    it('should execute getCategoryCogs tool', async () => {
      const result = await executeProfitabilityTool('getCategoryCogs', {
        category: 'prerolls',
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('Pre-Rolls COGS Snapshot');
      expect((result as any).data.productsWithCogs).toBe(2);
    });

    it('should execute analyzePriceCompression tool', async () => {
      const result = await executeProfitabilityTool('analyzePriceCompression', {
        currentAveragePrice: 50,
        currentVolume: 1000,
        marketPriceDropPercent: 0.20,
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('GTI Rule');
      expect((result as any).analysis.requiredVolumeIncrease).toBeCloseTo(0.25);
    });

    it('should execute analyzeWorkingCapital tool', async () => {
      const result = await executeProfitabilityTool('analyzeWorkingCapital', {
        tenantId: 'test-org',
      });

      expect(result).toBeDefined();
      expect((result as any).summary).toContain('Working Capital');
      expect((result as any).metrics.liquidityRisk).toBeDefined();
      expect((result as any).recommendations).toBeDefined();
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        executeProfitabilityTool('unknownTool', {})
      ).rejects.toThrow('Unknown profitability tool');
    });
  });

  // ==========================================================================
  // SUMMARY FORMATTING TESTS
  // ==========================================================================
  describe('Summary Formatting', () => {
    it('should format 280E summary as markdown table', async () => {
      const result = await executeProfitabilityTool('analyze280ETax', {
        tenantId: 'test-org',
        period: 'current_month',
      });

      expect((result as any).summary).toContain('| Metric | Amount |');
      expect((result as any).summary).toContain('Gross Revenue');
      expect((result as any).summary).toContain('Total Deductible COGS');
      expect((result as any).summary).toContain('280E');
    });

    it('should format NY tax summary with category rates', async () => {
      const result = await executeProfitabilityTool('calculateNYCannabsTax', {
        tenantId: 'test-org',
        period: 'current_month',
      });

      expect((result as any).summary).toContain('Flower: $0.005 per mg');
      expect((result as any).summary).toContain('Concentrate: $0.008 per mg');
      expect((result as any).summary).toContain('Edible: $0.03 per mg');
    });

    it('should format working capital with risk emoji', async () => {
      const result = await executeProfitabilityTool('analyzeWorkingCapital', {
        tenantId: 'test-org',
      });

      // Should contain risk indicator
      expect((result as any).summary).toMatch(/Liquidity Risk:.*MEDIUM/i);
    });

    it('should format category COGS summary with inventory and margin context', async () => {
      const result = await executeProfitabilityTool('getCategoryCogs', {
        category: 'prerolls',
      });

      expect((result as any).summary).toContain('Current inventory COGS: $140.00');
      expect((result as any).summary).toContain('Average gross margin: 59.2%');
    });
  });
});
