'use server';

/**
 * Profitability Server Actions
 *
 * Server actions for cannabis tax calculations, 280E analysis,
 * and profitability dashboards.
 */

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
  calculate280EAnalysis,
  calculateNYTaxSummary,
  calculateProfitabilityMetrics,
  calculatePriceCompression,
  calculateWorkingCapital,
  getTenantTaxConfig,
  saveTenantTaxConfig,
  classifyExpense,
} from '@/server/services/cannabis-tax';
import type {
  Tax280EAnalysis,
  NYTaxSummary,
  ProfitabilityMetrics,
  PriceCompressionAnalysis,
  WorkingCapitalAnalysis,
  TenantTaxConfig,
  Expense280E,
  ExpenseSubcategory,
  ReportPeriod,
  NYProductCategory,
} from '@/types/cannabis-tax';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

type ProfitabilityActor = {
  uid: string;
  role?: string;
  orgId?: string;
  brandId?: string;
  currentOrgId?: string;
};

function getOrgId(user: ProfitabilityActor): string | null {
  return user.currentOrgId || user.orgId || user.brandId || null;
}

function isValidOrgId(orgId: string): boolean {
  return !!orgId && !orgId.includes('/');
}

function isValidDocumentId(id: string): boolean {
  return !!id && !id.includes('/');
}

function requireOrgId(user: ProfitabilityActor, action: string): string {
  const orgId = getOrgId(user);
  if (!orgId || !isValidOrgId(orgId)) {
    logger.warn('[profitability] Missing or invalid org context', {
      action,
      actor: user.uid,
      actorRole: user.role,
      orgId,
    });
    throw new Error('Missing organization context');
  }
  return orgId;
}

function getPeriodDates(period: ReportPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'current_month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59),
      };
    case 'last_month':
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59),
      };
    case 'current_quarter':
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1),
        end: new Date(year, qStart + 3, 0, 23, 59, 59),
      };
    case 'last_quarter':
      const lqStart = Math.floor(month / 3) * 3 - 3;
      return {
        start: new Date(year, lqStart, 1),
        end: new Date(year, lqStart + 3, 0, 23, 59, 59),
      };
    case 'ytd':
      return {
        start: new Date(year, 0, 1),
        end: now,
      };
    case 'last_year':
      return {
        start: new Date(year - 1, 0, 1),
        end: new Date(year - 1, 11, 31, 23, 59, 59),
      };
    case 'custom':
      return {
        start: customStart || new Date(year, month, 1),
        end: customEnd || now,
      };
    default:
      return {
        start: new Date(year, month, 1),
        end: now,
      };
  }
}

// =============================================================================
// 280E ANALYSIS ACTIONS
// =============================================================================

/**
 * Get 280E tax analysis for tenant
 */
export async function get280EAnalysis(
  period: ReportPeriod = 'current_month',
  customStart?: Date,
  customEnd?: Date
): Promise<Tax280EAnalysis> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'get280EAnalysis');

  const { start, end } = getPeriodDates(period, customStart, customEnd);

  logger.info('[profitability] Fetching 280E analysis', { orgId, period, start, end });

  return calculate280EAnalysis(orgId, start, end);
}

/**
 * Add a new expense for 280E tracking
 */
export async function addExpense(
  description: string,
  amount: number,
  date: Date,
  subcategory: ExpenseSubcategory,
  allocationPercentage?: number,
  allocationRationale?: string,
  vendorName?: string,
  invoiceNumber?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
    const orgId = requireOrgId(user as ProfitabilityActor, 'addExpense');

    const { firestore } = await createServerClient();
    const now = new Date();

    const category = classifyExpense(subcategory);

    const expense: Omit<Expense280E, 'id'> = {
      tenantId: orgId,
      description,
      amount,
      date,
      category,
      subcategory,
      allocationPercentage: category === 'cogs_indirect' ? (allocationPercentage ?? 100) : undefined,
      allocationRationale,
      vendorName,
      invoiceNumber,
      periodMonth: date.getMonth() + 1,
      periodYear: date.getFullYear(),
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
    };

    const docRef = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('expenses')
      .add(expense);

    logger.info('[profitability] Added expense', { orgId, id: docRef.id, subcategory, amount });

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('[profitability] Failed to add expense', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get expenses for a period
 */
export async function getExpenses(
  period: ReportPeriod = 'current_month',
  customStart?: Date,
  customEnd?: Date
): Promise<Expense280E[]> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getExpenses');

  const { firestore } = await createServerClient();
  const { start, end } = getPeriodDates(period, customStart, customEnd);

  const expensesSnap = await firestore
    .collection('tenants')
    .doc(orgId)
    .collection('expenses')
    .where('date', '>=', start)
    .where('date', '<=', end)
    .orderBy('date', 'desc')
    .get();

  return expensesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Expense280E[];
}

/**
 * Update expense allocation percentage
 */
export async function updateExpenseAllocation(
  expenseId: string,
  allocationPercentage: number,
  allocationRationale: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidDocumentId(expenseId)) {
      return { success: false, error: 'Invalid expense id' };
    }
    const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
    const orgId = requireOrgId(user as ProfitabilityActor, 'updateExpenseAllocation');

    const { firestore } = await createServerClient();

    await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('expenses')
      .doc(expenseId)
      .update({
        allocationPercentage,
        allocationRationale,
        updatedAt: new Date(),
      });

    logger.info('[profitability] Updated expense allocation', { orgId, expenseId, allocationPercentage });

    return { success: true };
  } catch (error) {
    logger.error('[profitability] Failed to update expense', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// NY TAX ACTIONS
// =============================================================================

/**
 * Get NY tax summary for tenant
 */
export async function getNYTaxSummary(
  period: ReportPeriod = 'current_month',
  customStart?: Date,
  customEnd?: Date
): Promise<NYTaxSummary> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getNYTaxSummary');

  const { start, end } = getPeriodDates(period, customStart, customEnd);

  logger.info('[profitability] Fetching NY tax summary', { orgId, period });

  return calculateNYTaxSummary(orgId, start, end);
}

// =============================================================================
// PROFITABILITY ACTIONS
// =============================================================================

/**
 * Get comprehensive profitability metrics
 */
export async function getProfitabilityMetrics(
  period: ReportPeriod = 'current_month',
  customStart?: Date,
  customEnd?: Date
): Promise<ProfitabilityMetrics> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getProfitabilityMetrics');

  const { start, end } = getPeriodDates(period, customStart, customEnd);

  const config = await getTenantTaxConfig(orgId);

  logger.info('[profitability] Fetching profitability metrics', { orgId, period });

  return calculateProfitabilityMetrics(orgId, start, end, config || undefined);
}

/**
 * Calculate price compression analysis
 */
export async function getPriceCompressionAnalysis(
  currentAveragePrice: number,
  currentVolume: number,
  marketPriceDropPercent: number
): Promise<PriceCompressionAnalysis> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getPriceCompressionAnalysis');

  logger.info('[profitability] Calculating price compression', { orgId, marketPriceDropPercent });

  const analysis = calculatePriceCompression(
    currentAveragePrice,
    currentVolume,
    marketPriceDropPercent
  );

  return { ...analysis, tenantId: orgId };
}

/**
 * Get working capital analysis
 */
export async function getWorkingCapitalAnalysis(): Promise<WorkingCapitalAnalysis> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getWorkingCapitalAnalysis');

  const config = await getTenantTaxConfig(orgId);

  logger.info('[profitability] Fetching working capital analysis', { orgId });

  return calculateWorkingCapital(orgId, config || undefined);
}

// =============================================================================
// CONFIGURATION ACTIONS
// =============================================================================

/**
 * Get tenant tax configuration
 */
export async function getTaxConfig(): Promise<TenantTaxConfig | null> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getTaxConfig');

  return getTenantTaxConfig(orgId);
}

/**
 * Save tenant tax configuration
 */
export async function saveTaxConfig(
  config: Partial<TenantTaxConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
    const orgId = requireOrgId(user as ProfitabilityActor, 'saveTaxConfig');

    await saveTenantTaxConfig(orgId, config);

    logger.info('[profitability] Saved tax config', { orgId });

    return { success: true };
  } catch (error) {
    logger.error('[profitability] Failed to save tax config', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// DASHBOARD DATA AGGREGATION
// =============================================================================

// Zero-filled fallbacks for when Firestore queries fail (e.g. missing composite index)
function emptyTax280E(orgId: string, start: Date, end: Date): Tax280EAnalysis {
  return {
    tenantId: orgId, periodStart: start, periodEnd: end,
    grossRevenue: 0, directCOGS: 0, indirectCOGS: 0, totalCOGS: 0,
    nonDeductibleExpenses: 0, grossProfit: 0, estimatedTaxRate: 0,
    estimatedTaxLiability: 0, paperProfit: 0, cashReserveNeeded: 0,
    actualCashProfit: 0, potentialCogsAllocation: 0,
    optimizationSuggestions: ['Connect order data to see 280E analysis.'],
    expenseBreakdown: [],
  };
}

function emptyNYTax(orgId: string, start: Date, end: Date): NYTaxSummary {
  return {
    tenantId: orgId, periodStart: start, periodEnd: end,
    grossSales: 0, potencyTaxCollected: 0, salesTaxCollected: 0,
    totalTaxCollected: 0, potencyTaxOwed: 0, salesTaxOwed: 0,
    totalTaxOwed: 0, netRevenueAfterTax: 0,
    categoryBreakdown: [
      { category: 'flower' as const, unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
      { category: 'concentrate' as const, unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
      { category: 'edible' as const, unitsSold: 0, grossSales: 0, potencyTax: 0, salesTax: 0 },
    ],
  };
}

function emptyWorkingCapital(orgId: string): WorkingCapitalAnalysis {
  return {
    tenantId: orgId, analysisDate: new Date(),
    cashOnHand: 0, accountsReceivable: 0, inventoryValue: 0, accountsPayable: 0,
    workingCapital: 0, currentRatio: 0, quickRatio: 0,
    monthlyOperatingExpenses: 0, monthlyRevenue: 0, monthlyCashBurn: 0,
    runwayMonths: 0, taxReserve: 0, bankingFees: 0,
    liquidityRisk: 'medium' as const,
    riskFactors: ['Configure financial settings to see working capital analysis.'],
    recommendations: ['Enter monthly expenses and revenue targets in Settings > Tax Config.'],
  };
}

function emptyMetrics(orgId: string, start: Date, end: Date): ProfitabilityMetrics {
  return {
    tenantId: orgId, periodStart: start, periodEnd: end,
    grossRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: 0, operatingProfit: 0, operatingMargin: 0,
    tax280ELiability: 0, netProfitAfter280E: 0, effectiveTaxRate: 0,
    inventoryTurnover: 0, categoryPerformance: [],
    vsLastPeriod: { revenueChange: 0, marginChange: 0, profitChange: 0 },
  };
}

/**
 * Get all profitability dashboard data in one call.
 * Uses Promise.allSettled so a missing Firestore index on the orders collection
 * doesn't crash the entire dashboard — financial tabs show $0 data instead.
 */
export async function getProfitabilityDashboard(
  period: ReportPeriod = 'current_month',
  customStart?: Date,
  customEnd?: Date
): Promise<{
  metrics: ProfitabilityMetrics;
  tax280E: Tax280EAnalysis;
  nyTax: NYTaxSummary;
  workingCapital: WorkingCapitalAnalysis;
  config: TenantTaxConfig | null;
}> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getProfitabilityDashboard');

  const { start, end } = getPeriodDates(period, customStart, customEnd);

  logger.info('[profitability] Fetching full dashboard', { orgId, period });

  const config = await getTenantTaxConfig(orgId);

  // allSettled: if any calculation fails (e.g. missing Firestore composite index on orders)
  // we fall back to zero-filled data so the rest of the page stays functional
  const [tax280EResult, nyTaxResult, workingCapitalResult, metricsResult] = await Promise.allSettled([
    calculate280EAnalysis(orgId, start, end),
    calculateNYTaxSummary(orgId, start, end),
    calculateWorkingCapital(orgId, config || undefined),
    calculateProfitabilityMetrics(orgId, start, end, config || undefined),
  ]);

  if (tax280EResult.status === 'rejected') {
    logger.error('[profitability] 280E calculation failed (likely missing Firestore index)', { error: String(tax280EResult.reason) });
  }
  if (nyTaxResult.status === 'rejected') {
    logger.error('[profitability] NY tax calculation failed', { error: String(nyTaxResult.reason) });
  }
  if (workingCapitalResult.status === 'rejected') {
    logger.error('[profitability] Working capital calculation failed', { error: String(workingCapitalResult.reason) });
  }

  return {
    tax280E: tax280EResult.status === 'fulfilled' ? tax280EResult.value : emptyTax280E(orgId, start, end),
    nyTax: nyTaxResult.status === 'fulfilled' ? nyTaxResult.value : emptyNYTax(orgId, start, end),
    workingCapital: workingCapitalResult.status === 'fulfilled' ? workingCapitalResult.value : emptyWorkingCapital(orgId),
    metrics: metricsResult.status === 'fulfilled' ? metricsResult.value : emptyMetrics(orgId, start, end),
    config,
  };
}

// =============================================================================
// PRODUCT COGS PROFITABILITY (POS-sourced data)
// =============================================================================

export interface ProductProfitabilityItem {
  id: string;
  name: string;
  category: string;
  retailPrice: number;
  effectiveCost: number | null; // cost ?? batchCost from POS
  costSource: 'cost_of_good' | 'batch_cost' | 'none';
  marginPercent: number | null; // (price - cost) / price
  marginAmount: number | null;  // price - cost
  stockCount: number;
  inventoryValue: number | null; // effectiveCost * stockCount
}

/**
 * Get product-level profitability using Alleaves COGS data.
 *
 * Uses `cost` (Cost of Good) and `batchCost` (Wholesale/Batch Cost) from the
 * tenant product catalog synced by POS. Both fields are treated as equivalent
 * COGS signals per user specification.
 *
 * Data source: tenants/{orgId}/publicViews/products/items
 */
export async function getProductProfitabilityData(): Promise<{
  products: ProductProfitabilityItem[];
  summary: {
    totalInventoryValue: number;
    totalRevenuePotential: number;
    avgMarginPercent: number | null;
    productsWithCogs: number;
    productsWithoutCogs: number;
  };
}> {
  const user = await requireUser(['dispensary', 'brand', 'super_user', 'super_admin']);
  const orgId = requireOrgId(user as ProfitabilityActor, 'getProductProfitabilityData');

  const { firestore } = await createServerClient();

  const itemsSnap = await firestore
    .collection('tenants')
    .doc(orgId)
    .collection('publicViews')
    .doc('products')
    .collection('items')
    .get();

  const products: ProductProfitabilityItem[] = itemsSnap.docs.map(doc => {
    const data = doc.data();
    const retailPrice: number = typeof data.price === 'number' ? data.price : 0;
    const cost: number | undefined = typeof data.cost === 'number' ? data.cost : undefined;
    const batchCost: number | undefined = typeof data.batchCost === 'number' ? data.batchCost : undefined;

    // cost (Cost of Good) takes priority; fall back to batchCost (Wholesale/Batch Cost)
    const effectiveCost = cost !== undefined ? cost : (batchCost !== undefined ? batchCost : null);
    const costSource: 'cost_of_good' | 'batch_cost' | 'none' =
      cost !== undefined ? 'cost_of_good' : (batchCost !== undefined ? 'batch_cost' : 'none');

    const stockCount: number = typeof data.stockCount === 'number' ? data.stockCount : 0;

    const marginPercent =
      effectiveCost !== null && retailPrice > 0
        ? (retailPrice - effectiveCost) / retailPrice
        : null;
    const marginAmount =
      effectiveCost !== null && retailPrice > 0
        ? retailPrice - effectiveCost
        : null;
    const inventoryValue =
      effectiveCost !== null && stockCount > 0
        ? effectiveCost * stockCount
        : null;

    return {
      id: doc.id,
      name: typeof data.name === 'string' ? data.name : 'Unknown',
      category: typeof data.category === 'string' ? data.category : 'Other',
      retailPrice,
      effectiveCost,
      costSource,
      marginPercent,
      marginAmount,
      stockCount,
      inventoryValue,
    };
  });

  // Sort: products with COGS first (lowest margin = needs attention), no-COGS last
  products.sort((a, b) => {
    if (a.effectiveCost === null && b.effectiveCost === null) return 0;
    if (a.effectiveCost === null) return 1;
    if (b.effectiveCost === null) return -1;
    if (a.marginPercent === null && b.marginPercent === null) return 0;
    if (a.marginPercent === null) return 1;
    if (b.marginPercent === null) return -1;
    return a.marginPercent - b.marginPercent;
  });

  const productsWithCogsArr = products.filter(p => p.effectiveCost !== null);
  const totalInventoryValue = productsWithCogsArr.reduce((sum, p) => sum + (p.inventoryValue ?? 0), 0);
  const totalRevenuePotential = products.reduce((sum, p) => sum + p.retailPrice * p.stockCount, 0);
  const margins = productsWithCogsArr
    .filter(p => p.marginPercent !== null)
    .map(p => p.marginPercent!);
  const avgMarginPercent =
    margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;

  logger.info('[profitability] Fetched product COGS data', {
    orgId,
    totalProducts: products.length,
    productsWithCogs: productsWithCogsArr.length,
  });

  return {
    products,
    summary: {
      totalInventoryValue,
      totalRevenuePotential,
      avgMarginPercent,
      productsWithCogs: productsWithCogsArr.length,
      productsWithoutCogs: products.length - productsWithCogsArr.length,
    },
  };
}

// =============================================================================
// THRIVE SYRACUSE SPECIFIC
// =============================================================================

/**
 * Get Thrive Syracuse profitability dashboard with real Alleaves data
 */
export async function getThriveProfitabilityDashboard(
  period: ReportPeriod = 'current_month'
): Promise<{
  metrics: ProfitabilityMetrics;
  tax280E: Tax280EAnalysis;
  nyTax: NYTaxSummary;
  workingCapital: WorkingCapitalAnalysis;
  config: TenantTaxConfig;
}> {
  const user = await requireUser(['dispensary', 'super_user', 'super_admin']);

  // Thrive Syracuse specific tenant ID
  const orgId = 'org_thrive_syracuse';

  // Check authorization
  const userOrgId = getOrgId(user as ProfitabilityActor);
  if (userOrgId !== orgId && user.role !== 'super_user' && user.role !== 'super_admin') {
    throw new Error('Unauthorized access to Thrive Syracuse data');
  }

  const { start, end } = getPeriodDates(period);

  // Thrive-specific configuration
  const thriveConfig: TenantTaxConfig = {
    tenantId: orgId,
    state: 'NY',
    county: 'Onondaga', // Syracuse is in Onondaga County
    squareFootage: 3500, // Estimated retail + storage
    employeeCount: 12,   // Estimated staff
    enable280ETracking: true,
    defaultAllocationPercentages: {
      facilityRent: 35,   // 35% of rent for inventory storage
      utilities: 30,       // 30% of utilities for storage
      labor: 45,           // 45% of labor for inventory handling
    },
    taxReservePercentage: 45,
    targetRunwayMonths: 6,
    monthlyBankingFees: 1800, // Cannabis banking fees
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  logger.info('[profitability] Fetching Thrive Syracuse dashboard', { period });

  // Fetch all data
  const [tax280E, nyTax, workingCapital] = await Promise.all([
    calculate280EAnalysis(orgId, start, end),
    calculateNYTaxSummary(orgId, start, end),
    calculateWorkingCapital(orgId, thriveConfig),
  ]);

  const metrics = await calculateProfitabilityMetrics(orgId, start, end, thriveConfig);

  return {
    metrics,
    tax280E,
    nyTax,
    workingCapital,
    config: thriveConfig,
  };
}
