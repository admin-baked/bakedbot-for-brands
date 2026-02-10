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
} from '@/types/cannabis-tax';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getOrgId(user: { orgId?: string; brandId?: string; currentOrgId?: string; uid: string }): string {
  return user.orgId || user.brandId || user.currentOrgId || user.uid;
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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

  return getTenantTaxConfig(orgId);
}

/**
 * Save tenant tax configuration
 */
export async function saveTaxConfig(
  config: Partial<TenantTaxConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser(['dispensary', 'brand', 'super_user']);
    const orgId = getOrgId(user);

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

/**
 * Get all profitability dashboard data in one call
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
  const user = await requireUser(['dispensary', 'brand', 'super_user']);
  const orgId = getOrgId(user);

  const { start, end } = getPeriodDates(period, customStart, customEnd);

  logger.info('[profitability] Fetching full dashboard', { orgId, period });

  // Fetch config first (needed for other calculations)
  const config = await getTenantTaxConfig(orgId);

  // Fetch all data in parallel
  const [tax280E, nyTax, workingCapital] = await Promise.all([
    calculate280EAnalysis(orgId, start, end),
    calculateNYTaxSummary(orgId, start, end),
    calculateWorkingCapital(orgId, config || undefined),
  ]);

  // Calculate metrics using the fetched data
  const metrics = await calculateProfitabilityMetrics(orgId, start, end, config || undefined);

  return {
    metrics,
    tax280E,
    nyTax,
    workingCapital,
    config,
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
  const user = await requireUser(['dispensary', 'super_user']);

  // Thrive Syracuse specific tenant ID
  const orgId = 'org_thrive_syracuse';

  // Check authorization
  const userOrgId = getOrgId(user);
  if (userOrgId !== orgId && user.role !== 'super_user') {
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
