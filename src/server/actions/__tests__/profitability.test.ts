/**
 * Unit Tests for Profitability Server Actions
 *
 * Tests the server actions for 280E analysis, NY tax summary,
 * profitability metrics, and working capital analysis.
 */

import {
  getPriceCompressionAnalysis,
  addExpense,
  updateExpenseAllocation,
} from '../profitability';

// Mock auth
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    orgId: 'org_test',
    role: 'dispensary',
  }),
}));

// Helper to create recursive mock with chaining support
const createChainableMock = (finalResult: any = { docs: [] }) => {
  const mock: any = {};
  const methods = ['collection', 'doc', 'where', 'orderBy', 'withConverter'];

  methods.forEach(method => {
    mock[method] = jest.fn(() => mock);
  });

  mock.get = jest.fn().mockResolvedValue(finalResult);
  mock.add = jest.fn().mockResolvedValue({ id: 'new-expense-id' });
  mock.set = jest.fn().mockResolvedValue(undefined);
  mock.update = jest.fn().mockResolvedValue(undefined);

  return mock;
};

const mockFirestore = createChainableMock();

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(() => ({
    firestore: mockFirestore,
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the cannabis-tax service functions directly for cleaner tests
jest.mock('@/server/services/cannabis-tax', () => ({
  calculate280EAnalysis: jest.fn().mockResolvedValue({
    tenantId: 'org_test',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-02-28'),
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
    optimizationSuggestions: ['Review indirect expenses for additional COGS allocation'],
    expenseBreakdown: [
      { subcategory: 'product_purchase', total: 40000, deductibleAmount: 40000 },
      { subcategory: 'facility_rent_storage', total: 15000, deductibleAmount: 10000 },
    ],
  }),
  calculateNYTaxSummary: jest.fn().mockResolvedValue({
    tenantId: 'org_test',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-02-28'),
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
    tenantId: 'org_test',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-02-28'),
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
      { category: 'concentrate', revenue: 30000, cogs: 15000, grossProfit: 15000, margin: 0.50, benchmark: 0.50, performance: 'at' },
      { category: 'edible', revenue: 20000, cogs: 9000, grossProfit: 11000, margin: 0.55, benchmark: 0.55, performance: 'at' },
    ],
    vsLastPeriod: { revenueChange: 0.05, marginChange: 0.02, profitChange: 0.03 },
  }),
  calculatePriceCompression: jest.fn((price: number, volume: number, drop: number) => {
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
        { priceDropPercent: 0.15, volumeIncreaseNeeded: 0.1765, newVolume: volume * 1.1765, revenueAtNewPrice: price * 0.85 * volume * 1.1765, breakeven: true },
        { priceDropPercent: 0.20, volumeIncreaseNeeded: 0.25, newVolume: volume * 1.25, revenueAtNewPrice: price * 0.8 * volume * 1.25, breakeven: true },
        { priceDropPercent: 0.25, volumeIncreaseNeeded: 0.3333, newVolume: volume * 1.3333, revenueAtNewPrice: price * 0.75 * volume * 1.3333, breakeven: true },
        { priceDropPercent: 0.30, volumeIncreaseNeeded: 0.4286, newVolume: volume * 1.4286, revenueAtNewPrice: price * 0.7 * volume * 1.4286, breakeven: true },
      ],
      recommendations: ['Consider tiered pricing strategy', `Volume must increase ${(increase * 100).toFixed(0)}%`],
    };
  }),
  calculateWorkingCapital: jest.fn().mockResolvedValue({
    tenantId: 'org_test',
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
    riskFactors: ['Cash runway below target (6 months)'],
    recommendations: ['Build additional cash reserves'],
  }),
  getTenantTaxConfig: jest.fn().mockResolvedValue({
    tenantId: 'org_test',
    state: 'NY',
    county: 'Onondaga',
    squareFootage: 3500,
    employeeCount: 12,
    enable280ETracking: true,
    defaultAllocationPercentages: {
      facilityRent: 35,
      utilities: 30,
      labor: 45,
    },
    taxReservePercentage: 45,
    targetRunwayMonths: 6,
    monthlyBankingFees: 1800,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  saveTenantTaxConfig: jest.fn().mockResolvedValue(undefined),
  classifyExpense: jest.fn((subcategory: string) => {
    const directCOGS = ['product_purchase', 'packaging', 'lab_testing', 'excise_tax_wholesale'];
    const indirectCOGS = ['facility_rent_storage', 'utilities_storage', 'labor_inventory'];
    if (directCOGS.includes(subcategory)) return 'cogs_direct';
    if (indirectCOGS.includes(subcategory)) return 'cogs_indirect';
    return 'non_deductible';
  }),
}));

describe('Profitability Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // PRICE COMPRESSION ANALYSIS TESTS (uses pure calculation, no Firestore)
  // ==========================================================================
  describe('getPriceCompressionAnalysis', () => {
    it('should calculate GTI rule correctly', async () => {
      const result = await getPriceCompressionAnalysis(50, 1000, 0.20);

      expect(result.tenantId).toBe('org_test');
      expect(result.currentAveragePrice).toBe(50);
      expect(result.currentVolume).toBe(1000);
      expect(result.currentRevenue).toBe(50000);
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.25);
      expect(result.requiredNewVolume).toBeCloseTo(1250);
      expect(result.scenarios.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle 10% price drop scenario', async () => {
      const result = await getPriceCompressionAnalysis(100, 500, 0.10);

      // 10% drop needs ~11.11% volume increase
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.1111, 2);
      expect(result.requiredNewVolume).toBeCloseTo(555.55, 0);
    });

    it('should handle 30% price drop scenario', async () => {
      const result = await getPriceCompressionAnalysis(75, 2000, 0.30);

      // 30% drop needs ~42.86% volume increase
      expect(result.requiredVolumeIncrease).toBeCloseTo(0.4286, 2);
    });

    it('should include multiple scenarios', async () => {
      const result = await getPriceCompressionAnalysis(50, 1000, 0.20);

      expect(result.scenarios.length).toBe(5);
      expect(result.scenarios[0].priceDropPercent).toBe(0.10);
      expect(result.scenarios[4].priceDropPercent).toBe(0.30);
    });
  });

  // ==========================================================================
  // EXPENSE MANAGEMENT TESTS
  // ==========================================================================
  describe('addExpense', () => {
    it('should add a direct COGS expense', async () => {
      const result = await addExpense(
        'Product purchase',
        5000,
        new Date(),
        'product_purchase',
        undefined,
        undefined,
        'Vendor ABC',
        'INV-001'
      );

      expect(result.success).toBe(true);
      expect(result.id).toBe('new-expense-id');
    });

    it('should add an indirect COGS expense with allocation', async () => {
      const result = await addExpense(
        'Storage facility rent',
        3000,
        new Date(),
        'facility_rent_storage',
        35, // 35% allocation
        'Inventory storage portion of facility'
      );

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should add a non-deductible expense', async () => {
      const result = await addExpense(
        'Marketing campaign',
        2500,
        new Date(),
        'marketing'
      );

      expect(result.success).toBe(true);
    });

    it('should include vendor and invoice info when provided', async () => {
      const result = await addExpense(
        'Lab testing',
        500,
        new Date(),
        'lab_testing',
        undefined,
        undefined,
        'TestLab Inc',
        'TL-2026-001'
      );

      expect(result.success).toBe(true);
    });

    it('should fail when organization context is missing', async () => {
      const { requireUser } = require('@/server/auth/auth');
      (requireUser as jest.Mock).mockResolvedValueOnce({
        uid: 'test-user-123',
        role: 'dispensary',
      });

      const result = await addExpense(
        'Lab testing',
        500,
        new Date(),
        'lab_testing'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing organization context');
    });
  });

  describe('updateExpenseAllocation', () => {
    it('rejects invalid expense ids before touching Firestore', async () => {
      const result = await updateExpenseAllocation('bad/id', 40, 'Allocation rationale');

      expect(result).toEqual({
        success: false,
        error: 'Invalid expense id',
      });
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS (verify service calls are made correctly)
  // ==========================================================================
  describe('Service Integration', () => {
    const { calculate280EAnalysis } = require('@/server/services/cannabis-tax');
    const { calculateNYTaxSummary } = require('@/server/services/cannabis-tax');
    const { calculateProfitabilityMetrics } = require('@/server/services/cannabis-tax');
    const { calculateWorkingCapital } = require('@/server/services/cannabis-tax');
    const { getTenantTaxConfig } = require('@/server/services/cannabis-tax');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call calculate280EAnalysis with correct params', async () => {
      const { get280EAnalysis } = require('../profitability');
      await get280EAnalysis('current_month');

      expect(calculate280EAnalysis).toHaveBeenCalled();
      const callArgs = calculate280EAnalysis.mock.calls[0];
      expect(callArgs[0]).toBe('org_test'); // tenantId
      expect(callArgs[1]).toBeInstanceOf(Date); // start
      expect(callArgs[2]).toBeInstanceOf(Date); // end
    });

    it('should call calculateNYTaxSummary with correct params', async () => {
      const { getNYTaxSummary } = require('../profitability');
      await getNYTaxSummary('current_month');

      expect(calculateNYTaxSummary).toHaveBeenCalled();
    });

    it('should call getProfitabilityMetrics with config when available', async () => {
      const { getProfitabilityMetrics: getProfMetrics } = require('../profitability');
      await getProfMetrics('current_month');

      expect(getTenantTaxConfig).toHaveBeenCalled();
      expect(calculateProfitabilityMetrics).toHaveBeenCalled();
    });

    it('should call getWorkingCapitalAnalysis with config', async () => {
      const { getWorkingCapitalAnalysis: getWCA } = require('../profitability');
      await getWCA();

      expect(getTenantTaxConfig).toHaveBeenCalled();
      expect(calculateWorkingCapital).toHaveBeenCalled();
    });

    it('should call all services for dashboard', async () => {
      const { getProfitabilityDashboard: getDash } = require('../profitability');
      await getDash('current_month');

      expect(getTenantTaxConfig).toHaveBeenCalled();
      expect(calculate280EAnalysis).toHaveBeenCalled();
      expect(calculateNYTaxSummary).toHaveBeenCalled();
      expect(calculateWorkingCapital).toHaveBeenCalled();
      expect(calculateProfitabilityMetrics).toHaveBeenCalled();
    });

    it('should reject read actions when organization context is missing', async () => {
      const { requireUser } = require('@/server/auth/auth');
      (requireUser as jest.Mock).mockResolvedValueOnce({
        uid: 'test-user-123',
        role: 'dispensary',
      });

      await expect(getPriceCompressionAnalysis(50, 1000, 0.2)).rejects.toThrow('Missing organization context');
    });
  });

  // ==========================================================================
  // RETURN VALUE STRUCTURE TESTS
  // ==========================================================================
  describe('Return Value Structure', () => {
    it('280E analysis should have correct structure', async () => {
      const { get280EAnalysis } = require('../profitability');
      const result = await get280EAnalysis('current_month');

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('grossRevenue');
      expect(result).toHaveProperty('totalCOGS');
      expect(result).toHaveProperty('directCOGS');
      expect(result).toHaveProperty('indirectCOGS');
      expect(result).toHaveProperty('nonDeductibleExpenses');
      expect(result).toHaveProperty('estimatedTaxLiability');
      expect(result).toHaveProperty('cashReserveNeeded');
      expect(result).toHaveProperty('actualCashProfit');
      expect(result).toHaveProperty('optimizationSuggestions');
    });

    it('NY tax summary should have correct structure', async () => {
      const { getNYTaxSummary } = require('../profitability');
      const result = await getNYTaxSummary('current_month');

      expect(result).toHaveProperty('grossSales');
      expect(result).toHaveProperty('potencyTaxCollected');
      expect(result).toHaveProperty('salesTaxCollected');
      expect(result).toHaveProperty('totalTaxCollected');
      expect(result).toHaveProperty('netRevenueAfterTax');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result.categoryBreakdown).toHaveLength(3);
    });

    it('profitability metrics should have correct structure', async () => {
      const { getProfitabilityMetrics: getPM } = require('../profitability');
      const result = await getPM('current_month');

      expect(result).toHaveProperty('grossMargin');
      expect(result).toHaveProperty('operatingMargin');
      expect(result).toHaveProperty('effectiveTaxRate');
      expect(result).toHaveProperty('inventoryTurnover');
      expect(result).toHaveProperty('categoryPerformance');
    });

    it('working capital should have correct structure', async () => {
      const { getWorkingCapitalAnalysis: getWCA } = require('../profitability');
      const result = await getWCA();

      expect(result).toHaveProperty('cashOnHand');
      expect(result).toHaveProperty('workingCapital');
      expect(result).toHaveProperty('currentRatio');
      expect(result).toHaveProperty('quickRatio');
      expect(result).toHaveProperty('runwayMonths');
      expect(result).toHaveProperty('liquidityRisk');
      expect(result).toHaveProperty('recommendations');
    });

    it('dashboard should return all components', async () => {
      const { getProfitabilityDashboard: getDash } = require('../profitability');
      const result = await getDash('current_month');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('tax280E');
      expect(result).toHaveProperty('nyTax');
      expect(result).toHaveProperty('workingCapital');
      expect(result).toHaveProperty('config');
    });
  });
});
