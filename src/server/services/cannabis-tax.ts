/**
 * Cannabis Tax & Profitability Service
 *
 * Implements 280E tax mitigation strategies, NY cannabis tax calculations,
 * and profitability analytics for dispensaries.
 *
 * @see src/types/cannabis-tax.ts for type definitions
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
  type Expense280E,
  type Tax280EAnalysis,
  type ExpenseCategory280E,
  type ExpenseSubcategory,
  type NYProductTax,
  type NYProductCategory,
  type NYTaxSummary,
  type ProfitabilityMetrics,
  type PriceCompressionAnalysis,
  type WorkingCapitalAnalysis,
  type TenantTaxConfig,
  NY_TAX_RATES,
  CANNABIS_BENCHMARKS,
} from '@/types/cannabis-tax';

// =============================================================================
// 280E TAX CALCULATIONS
// =============================================================================

/**
 * Expense category classification helper
 */
export function classifyExpense(subcategory: ExpenseSubcategory): ExpenseCategory280E {
  const directCOGS: ExpenseSubcategory[] = [
    'product_purchase',
    'packaging',
    'lab_testing',
    'excise_tax_wholesale',
  ];

  const indirectCOGS: ExpenseSubcategory[] = [
    'facility_rent_storage',
    'utilities_storage',
    'labor_inventory',
    'security_inventory',
    'insurance_inventory',
    'depreciation_equipment',
  ];

  if (directCOGS.includes(subcategory)) return 'cogs_direct';
  if (indirectCOGS.includes(subcategory)) return 'cogs_indirect';
  return 'non_deductible';
}

/**
 * Calculate 280E tax analysis for a tenant
 */
export async function calculate280EAnalysis(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<Tax280EAnalysis> {
  const { firestore } = await createServerClient();

  // Fetch expenses for period
  const expensesRef = firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('expenses')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate);

  const expensesSnap = await expensesRef.get();
  const expenses = expensesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Expense280E[];

  // Fetch revenue for period (from orders or financials)
  const ordersRef = firestore
    .collection('orders')
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .where('status', 'in', ['completed', 'confirmed']);

  const ordersSnap = await ordersRef.get();
  let grossRevenue = 0;
  ordersSnap.forEach(doc => {
    const order = doc.data();
    grossRevenue += order.total || 0;
  });

  // Calculate COGS breakdown
  let directCOGS = 0;
  let indirectCOGS = 0;
  let nonDeductibleExpenses = 0;

  const expenseBreakdown: Map<ExpenseSubcategory, { total: number; deductible: number }> = new Map();

  for (const expense of expenses) {
    const amount = expense.amount;
    const allocationPct = expense.allocationPercentage ?? 100;
    const allocatedAmount = (amount * allocationPct) / 100;

    // Initialize breakdown entry if needed
    if (!expenseBreakdown.has(expense.subcategory)) {
      expenseBreakdown.set(expense.subcategory, { total: 0, deductible: 0 });
    }
    const entry = expenseBreakdown.get(expense.subcategory)!;
    entry.total += amount;

    switch (expense.category) {
      case 'cogs_direct':
        directCOGS += amount;
        entry.deductible += amount;
        break;
      case 'cogs_indirect':
        indirectCOGS += allocatedAmount;
        entry.deductible += allocatedAmount;
        nonDeductibleExpenses += amount - allocatedAmount;
        break;
      case 'non_deductible':
        nonDeductibleExpenses += amount;
        break;
    }
  }

  const totalCOGS = directCOGS + indirectCOGS;
  const grossProfit = grossRevenue - totalCOGS;

  // Effective tax rate under 280E (typically 70-90%)
  // Federal corporate rate ~21% + state ~6-8% = ~28%
  // But applies to gross profit (not net), so effective rate is much higher
  const baseTaxRate = 0.28;
  const estimatedTaxLiability = grossProfit > 0 ? grossProfit * baseTaxRate : 0;

  // Effective rate = tax / (gross profit - non-deductible expenses)
  const netIncome = grossProfit - nonDeductibleExpenses;
  const effectiveTaxRate = netIncome > 0 ? estimatedTaxLiability / netIncome : 0;

  // Cash reserve recommendation (40-50% of gross profit)
  const cashReserveNeeded = grossProfit * 0.45;
  const actualCashProfit = grossProfit - cashReserveNeeded - nonDeductibleExpenses;

  // Find potential COGS allocation opportunities
  const potentialAllocations = expenses.filter(e =>
    e.category === 'cogs_indirect' &&
    (e.allocationPercentage ?? 0) < 100
  );
  const potentialCogsAllocation = potentialAllocations.reduce((sum, e) => {
    const currentAlloc = e.allocationPercentage ?? 0;
    const potential = e.amount * ((100 - currentAlloc) / 100);
    return sum + potential;
  }, 0);

  // Generate optimization suggestions
  const suggestions: string[] = [];

  if (potentialCogsAllocation > 1000) {
    suggestions.push(
      `Review ${potentialAllocations.length} indirect expenses for additional COGS allocation. ` +
      `Potential additional deduction: $${potentialCogsAllocation.toLocaleString()}`
    );
  }

  if (effectiveTaxRate > 0.7) {
    suggestions.push(
      'Effective tax rate exceeds 70%. Consider engaging a cannabis-specialized CPA for 280E optimization.'
    );
  }

  if (cashReserveNeeded > grossProfit * 0.5) {
    suggestions.push(
      'High tax reserve requirement. Ensure adequate cash reserves before major expenditures.'
    );
  }

  // Build breakdown array
  const breakdownArray = Array.from(expenseBreakdown.entries()).map(([subcategory, data]) => ({
    subcategory,
    total: data.total,
    deductibleAmount: data.deductible,
  }));

  return {
    tenantId,
    periodStart: startDate,
    periodEnd: endDate,
    grossRevenue,
    directCOGS,
    indirectCOGS,
    totalCOGS,
    nonDeductibleExpenses,
    grossProfit,
    estimatedTaxRate: effectiveTaxRate,
    estimatedTaxLiability,
    paperProfit: grossProfit - nonDeductibleExpenses,
    cashReserveNeeded,
    actualCashProfit,
    potentialCogsAllocation,
    optimizationSuggestions: suggestions,
    expenseBreakdown: breakdownArray,
  };
}

// =============================================================================
// NY CANNABIS TAX CALCULATIONS
// =============================================================================

/**
 * Determine NY product category from product type/category string
 */
export function determineNYCategory(productCategory: string): NYProductCategory {
  const lowerCategory = productCategory.toLowerCase();

  if (lowerCategory.includes('edible') ||
      lowerCategory.includes('gummy') ||
      lowerCategory.includes('chocolate') ||
      lowerCategory.includes('beverage')) {
    return 'edible';
  }

  if (lowerCategory.includes('concentrate') ||
      lowerCategory.includes('extract') ||
      lowerCategory.includes('wax') ||
      lowerCategory.includes('shatter') ||
      lowerCategory.includes('rosin') ||
      lowerCategory.includes('live resin') ||
      lowerCategory.includes('distillate') ||
      lowerCategory.includes('cartridge') ||
      lowerCategory.includes('vape')) {
    return 'concentrate';
  }

  // Default to flower (also includes prerolls)
  return 'flower';
}

/**
 * Calculate NY taxes for a single product
 */
export function calculateNYProductTax(
  productId: string,
  productName: string,
  productCategory: string,
  thcMg: number,
  retailPrice: number
): NYProductTax {
  const category = determineNYCategory(productCategory);

  // Potency tax based on category
  const potencyTaxRate = NY_TAX_RATES.potencyTax[category];
  const potencyTax = thcMg * potencyTaxRate;

  // 13% sales tax on retail price
  const salesTax = retailPrice * NY_TAX_RATES.salesTax;

  const totalTax = potencyTax + salesTax;
  const priceAfterTax = retailPrice + totalTax;
  const effectiveTaxRate = retailPrice > 0 ? totalTax / retailPrice : 0;

  return {
    productId,
    productName,
    category,
    thcMg,
    retailPrice,
    potencyTax,
    salesTax,
    totalTax,
    priceAfterTax,
    effectiveTaxRate,
  };
}

/**
 * Calculate NY tax summary for a period
 */
export async function calculateNYTaxSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<NYTaxSummary> {
  const { firestore } = await createServerClient();

  // Fetch completed orders with line items
  const ordersRef = firestore
    .collection('orders')
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .where('status', 'in', ['completed', 'confirmed']);

  const ordersSnap = await ordersRef.get();

  // Category breakdown
  const categoryData: Record<NYProductCategory, {
    unitsSold: number;
    grossSales: number;
    potencyTax: number;
    salesTax: number;
  }> = {
    flower: { unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
    concentrate: { unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
    edible: { unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
  };

  let totalGrossSales = 0;
  let totalPotencyTax = 0;
  let totalSalesTax = 0;

  // Process each order
  for (const doc of ordersSnap.docs) {
    const order = doc.data();

    for (const item of order.items || []) {
      const qty = item.qty || 1;
      const price = item.price || 0;
      const thcMg = item.thcMg || 0; // THC content in mg
      const category = determineNYCategory(item.category || 'flower');

      const itemRevenue = price * qty;
      const itemPotencyTax = thcMg * qty * NY_TAX_RATES.potencyTax[category];
      const itemSalesTax = itemRevenue * NY_TAX_RATES.salesTax;

      totalGrossSales += itemRevenue;
      totalPotencyTax += itemPotencyTax;
      totalSalesTax += itemSalesTax;

      categoryData[category].unitsSold += qty;
      categoryData[category].grossSales += itemRevenue;
      categoryData[category].potencyTax += itemPotencyTax;
      categoryData[category].salesTax += itemSalesTax;
    }
  }

  const totalTaxCollected = totalPotencyTax + totalSalesTax;

  return {
    tenantId,
    periodStart: startDate,
    periodEnd: endDate,
    grossSales: totalGrossSales,
    potencyTaxCollected: totalPotencyTax,
    salesTaxCollected: totalSalesTax,
    totalTaxCollected,
    potencyTaxOwed: totalPotencyTax, // Same as collected (pass-through)
    salesTaxOwed: totalSalesTax,
    totalTaxOwed: totalTaxCollected,
    netRevenueAfterTax: totalGrossSales - totalTaxCollected,
    categoryBreakdown: Object.entries(categoryData).map(([category, data]) => ({
      category: category as NYProductCategory,
      ...data,
    })),
  };
}

// =============================================================================
// PROFITABILITY ANALYTICS
// =============================================================================

/**
 * Calculate comprehensive profitability metrics
 */
export async function calculateProfitabilityMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  config?: Partial<TenantTaxConfig>
): Promise<ProfitabilityMetrics> {
  // Get 280E analysis
  const tax280E = await calculate280EAnalysis(tenantId, startDate, endDate);

  // Get NY tax summary
  const nyTax = await calculateNYTaxSummary(tenantId, startDate, endDate);

  // Calculate days in period for annualization
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const annualizationFactor = 365 / periodDays;

  // Benchmark calculations
  const annualizedRevenue = tax280E.grossRevenue * annualizationFactor;
  const revenuePerSqFt = config?.squareFootage
    ? annualizedRevenue / config.squareFootage
    : undefined;
  const revenuePerEmployee = config?.employeeCount
    ? annualizedRevenue / config.employeeCount
    : undefined;

  // Inventory turnover (placeholder - would need inventory data)
  const inventoryTurnover = 8; // Industry average default

  // Category performance (from NY tax data)
  const categoryPerformance = nyTax.categoryBreakdown.map(cat => {
    const benchmark = CANNABIS_BENCHMARKS.categoryMargins[cat.category] || 0.45;
    // Estimate COGS as 55% of sales (average)
    const estimatedCOGS = cat.grossSales * 0.55;
    const grossProfit = cat.grossSales - estimatedCOGS;
    const margin = cat.grossSales > 0 ? grossProfit / cat.grossSales : 0;

    return {
      category: cat.category,
      revenue: cat.grossSales,
      cogs: estimatedCOGS,
      grossProfit,
      margin,
      benchmark,
      performance: margin >= benchmark * 1.1 ? 'above' as const :
                   margin >= benchmark * 0.9 ? 'at' as const : 'below' as const,
    };
  });

  // Operating metrics
  const operatingExpenses = tax280E.nonDeductibleExpenses;
  const operatingProfit = tax280E.grossProfit - operatingExpenses;
  const operatingMargin = tax280E.grossRevenue > 0
    ? operatingProfit / tax280E.grossRevenue
    : 0;

  return {
    tenantId,
    periodStart: startDate,
    periodEnd: endDate,
    grossRevenue: tax280E.grossRevenue,
    cogs: tax280E.totalCOGS,
    grossProfit: tax280E.grossProfit,
    grossMargin: tax280E.grossRevenue > 0
      ? tax280E.grossProfit / tax280E.grossRevenue
      : 0,
    operatingExpenses,
    operatingProfit,
    operatingMargin,
    tax280ELiability: tax280E.estimatedTaxLiability,
    netProfitAfter280E: tax280E.actualCashProfit,
    effectiveTaxRate: tax280E.estimatedTaxRate,
    revenuePerSqFt,
    revenuePerEmployee,
    inventoryTurnover,
    categoryPerformance,
    vsLastPeriod: {
      revenueChange: 0,  // Would need historical data
      marginChange: 0,
      profitChange: 0,
    },
  };
}

// =============================================================================
// PRICE COMPRESSION ANALYSIS (GTI RULE)
// =============================================================================

/**
 * Calculate price compression scenarios
 * GTI Rule: If prices drop by X%, volume must increase by X/(1-X) to maintain revenue
 */
export function calculatePriceCompression(
  currentAveragePrice: number,
  currentVolume: number,
  marketPriceDropPercent: number
): PriceCompressionAnalysis {
  const currentRevenue = currentAveragePrice * currentVolume;

  // GTI Rule calculation
  // If prices drop by P%, volume must increase by P/(1-P) to maintain revenue
  // e.g., 20% price drop → need 25% more volume (0.2 / 0.8 = 0.25)
  const requiredVolumeIncrease = marketPriceDropPercent / (1 - marketPriceDropPercent);
  const requiredNewVolume = currentVolume * (1 + requiredVolumeIncrease);

  // Generate scenarios for different price drops
  const scenarios = [0.10, 0.15, 0.20, 0.25, 0.30].map(priceDropPct => {
    const volumeIncreaseNeeded = priceDropPct / (1 - priceDropPct);
    const newVolume = currentVolume * (1 + volumeIncreaseNeeded);
    const newPrice = currentAveragePrice * (1 - priceDropPct);
    const revenueAtNewPrice = newPrice * newVolume;

    return {
      priceDropPercent: priceDropPct,
      volumeIncreaseNeeded,
      newVolume,
      revenueAtNewPrice,
      breakeven: Math.abs(revenueAtNewPrice - currentRevenue) < 1,
    };
  });

  // Generate recommendations
  const recommendations: string[] = [];

  if (marketPriceDropPercent >= 0.20) {
    recommendations.push(
      'Significant price compression detected. Consider implementing tiered pricing strategy (Value, Standard, Premium).'
    );
  }

  recommendations.push(
    `To maintain revenue with a ${(marketPriceDropPercent * 100).toFixed(0)}% price drop, ` +
    `you need ${(requiredVolumeIncrease * 100).toFixed(0)}% more unit volume.`
  );

  if (requiredVolumeIncrease > 0.30) {
    recommendations.push(
      'Required volume increase exceeds 30%. Explore high-margin categories (edibles, accessories) ' +
      'to offset compression in commoditized categories.'
    );
  }

  return {
    tenantId: '',
    analysisDate: new Date(),
    currentAveragePrice,
    currentVolume,
    currentRevenue,
    marketPriceDropPercent,
    requiredVolumeIncrease,
    requiredNewVolume,
    scenarios,
    recommendations,
  };
}

// =============================================================================
// WORKING CAPITAL ANALYSIS
// =============================================================================

/**
 * Calculate working capital and liquidity analysis
 */
export async function calculateWorkingCapital(
  tenantId: string,
  config: Partial<TenantTaxConfig> = {}
): Promise<WorkingCapitalAnalysis> {
  const { firestore } = await createServerClient();

  // Get current month data
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch tenant financial data (would be from a dedicated collection)
  const configDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('tax_config')
    .get();

  const tenantConfig = configDoc.exists
    ? configDoc.data() as TenantTaxConfig
    : null;

  // Default values (would come from actual financial data)
  const cashOnHand = 50000; // Placeholder
  const accountsReceivable = 0; // Cannabis is mostly cash
  const inventoryValue = 100000; // Placeholder
  const accountsPayable = 30000; // Placeholder

  const monthlyOperatingExpenses = config.monthlyBankingFees || tenantConfig?.monthlyBankingFees || 2000;
  const monthlyRevenue = 150000; // Placeholder

  // Calculations
  const workingCapital = (cashOnHand + accountsReceivable + inventoryValue) - accountsPayable;
  const currentRatio = accountsPayable > 0
    ? (cashOnHand + accountsReceivable + inventoryValue) / accountsPayable
    : 0;
  const quickRatio = accountsPayable > 0
    ? (cashOnHand + accountsReceivable) / accountsPayable
    : 0;

  const monthlyCashBurn = monthlyOperatingExpenses - monthlyRevenue;
  const runwayMonths = monthlyCashBurn < 0
    ? cashOnHand / Math.abs(monthlyCashBurn)
    : Infinity;

  // Tax reserve (45% of gross profit)
  const estimatedMonthlyGrossProfit = monthlyRevenue * 0.45;
  const taxReserve = estimatedMonthlyGrossProfit * 0.45;

  const bankingFees = config.monthlyBankingFees || tenantConfig?.monthlyBankingFees || 2000;

  // Risk assessment
  let liquidityRisk: 'low' | 'medium' | 'high' | 'critical';
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  const targetRunway = config.targetRunwayMonths || tenantConfig?.targetRunwayMonths || 6;

  if (runwayMonths < 1) {
    liquidityRisk = 'critical';
    riskFactors.push('Cash runway under 1 month');
    recommendations.push('URGENT: Reduce expenses or secure emergency funding immediately.');
  } else if (runwayMonths < 3) {
    liquidityRisk = 'high';
    riskFactors.push('Cash runway under 3 months');
    recommendations.push('Build cash reserves to at least 3-6 months of operating expenses.');
  } else if (runwayMonths < targetRunway) {
    liquidityRisk = 'medium';
    riskFactors.push(`Cash runway below target (${targetRunway} months)`);
    recommendations.push('Consider building additional cash reserves.');
  } else {
    liquidityRisk = 'low';
  }

  if (currentRatio < 1.5) {
    riskFactors.push('Current ratio below 1.5');
    recommendations.push('Improve current ratio by reducing payables or increasing liquid assets.');
  }

  if (bankingFees > 2000) {
    riskFactors.push('High cannabis banking fees');
    recommendations.push('Shop for competitive cannabis banking rates.');
  }

  return {
    tenantId,
    analysisDate: new Date(),
    cashOnHand,
    accountsReceivable,
    inventoryValue,
    accountsPayable,
    workingCapital,
    currentRatio,
    quickRatio,
    monthlyOperatingExpenses,
    monthlyRevenue,
    monthlyCashBurn,
    runwayMonths,
    taxReserve,
    bankingFees,
    liquidityRisk,
    riskFactors,
    recommendations,
  };
}

// =============================================================================
// TENANT CONFIGURATION
// =============================================================================

/**
 * Get or create tenant tax configuration
 */
export async function getTenantTaxConfig(tenantId: string): Promise<TenantTaxConfig | null> {
  const { firestore } = await createServerClient();

  const configDoc = await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('tax_config')
    .get();

  return configDoc.exists ? (configDoc.data() as TenantTaxConfig) : null;
}

/**
 * Save tenant tax configuration
 */
export async function saveTenantTaxConfig(
  tenantId: string,
  config: Partial<TenantTaxConfig>
): Promise<void> {
  const { firestore } = await createServerClient();

  const now = new Date();
  const fullConfig: TenantTaxConfig = {
    tenantId,
    state: config.state || 'NY',
    county: config.county,
    squareFootage: config.squareFootage,
    employeeCount: config.employeeCount,
    enable280ETracking: config.enable280ETracking ?? true,
    defaultAllocationPercentages: config.defaultAllocationPercentages ?? {
      facilityRent: 30,
      utilities: 30,
      labor: 40,
    },
    taxReservePercentage: config.taxReservePercentage ?? 45,
    targetRunwayMonths: config.targetRunwayMonths ?? 6,
    monthlyBankingFees: config.monthlyBankingFees ?? 2000,
    createdAt: now,
    updatedAt: now,
  };

  await firestore
    .collection('tenants')
    .doc(tenantId)
    .collection('settings')
    .doc('tax_config')
    .set(fullConfig, { merge: true });

  logger.info('[cannabis-tax] Saved tax config', { tenantId });
}
