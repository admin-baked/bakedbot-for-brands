/**
 * Profitability Tools for Money Mike Agent
 *
 * Provides tools for 280E tax analysis, NY cannabis tax calculations,
 * profitability metrics, and price compression analysis.
 */

import { z } from 'zod';
import {
  calculate280EAnalysis,
  calculateNYTaxSummary,
  calculateProfitabilityMetrics,
  calculatePriceCompression,
  calculateWorkingCapital,
  getTenantTaxConfig,
} from '@/server/services/cannabis-tax';
import { logger } from '@/lib/logger';

// =============================================================================
// TOOL DEFINITIONS (for Genkit/Agent registration)
// =============================================================================

export const profitabilityToolDefs = [
  {
    name: 'analyze280ETax',
    description: `Analyze 280E tax liability for a cannabis business.
    280E prevents cannabis businesses from deducting normal operating expenses - only COGS is deductible.
    This tool calculates: direct COGS, indirect COGS (via absorption costing), estimated tax liability,
    cash vs paper profit analysis, and optimization suggestions.`,
    schema: z.object({
      tenantId: z.string().describe('The tenant/org ID to analyze'),
      period: z.enum(['current_month', 'last_month', 'current_quarter', 'ytd']).default('current_month')
        .describe('Time period for analysis'),
    }),
  },
  {
    name: 'calculateNYCannabsTax',
    description: `Calculate New York cannabis taxes for a dispensary.
    NY has two components: potency tax (per mg THC, varies by product type) and 13% state sales tax.
    Returns: gross sales, potency tax collected, sales tax collected, net revenue, and breakdown by category.`,
    schema: z.object({
      tenantId: z.string().describe('The tenant/org ID'),
      period: z.enum(['current_month', 'last_month', 'current_quarter', 'ytd']).default('current_month'),
    }),
  },
  {
    name: 'getProfitabilityMetrics',
    description: `Get comprehensive profitability metrics including gross margin, operating margin,
    280E adjusted profit, industry benchmarks (revenue per sq ft, revenue per employee, inventory turnover),
    and category-level performance analysis.`,
    schema: z.object({
      tenantId: z.string().describe('The tenant/org ID'),
      period: z.enum(['current_month', 'last_month', 'current_quarter', 'ytd']).default('current_month'),
    }),
  },
  {
    name: 'analyzePriceCompression',
    description: `Analyze price compression impact using the GTI Rule.
    If market prices drop by X%, volume must increase by X/(1-X) to maintain revenue.
    Example: 20% price drop requires 25% volume increase to break even.
    Returns scenarios, required volume changes, and strategic recommendations.`,
    schema: z.object({
      currentAveragePrice: z.number().describe('Current average selling price'),
      currentVolume: z.number().describe('Current units sold per period'),
      marketPriceDropPercent: z.number().min(0).max(0.5).describe('Expected price drop as decimal (e.g., 0.20 for 20%)'),
    }),
  },
  {
    name: 'analyzeWorkingCapital',
    description: `Analyze working capital and liquidity position.
    Cannabis businesses have unique cash flow challenges due to limited banking access.
    Returns: cash position, current/quick ratios, runway months, tax reserve needs,
    and liquidity risk assessment with recommendations.`,
    schema: z.object({
      tenantId: z.string().describe('The tenant/org ID'),
    }),
  },
];

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

function getPeriodDates(period: string): { start: Date; end: Date } {
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
    case 'ytd':
      return {
        start: new Date(year, 0, 1),
        end: now,
      };
    default:
      return {
        start: new Date(year, month, 1),
        end: now,
      };
  }
}

export async function analyze280ETax(
  tenantId: string,
  period: string = 'current_month'
): Promise<{
  summary: string;
  data: {
    grossRevenue: number;
    totalCOGS: number;
    directCOGS: number;
    indirectCOGS: number;
    nonDeductibleExpenses: number;
    grossProfit: number;
    estimatedTaxLiability: number;
    effectiveTaxRate: number;
    cashReserveNeeded: number;
    actualCashProfit: number;
  };
  optimizations: string[];
}> {
  logger.info('[profitability-tools] Analyzing 280E tax', { tenantId, period });

  const { start, end } = getPeriodDates(period);
  const analysis = await calculate280EAnalysis(tenantId, start, end);

  const summary = `
**280E Tax Analysis for ${period.replace('_', ' ')}**

| Metric | Amount |
|--------|--------|
| Gross Revenue | $${analysis.grossRevenue.toLocaleString()} |
| Direct COGS | $${analysis.directCOGS.toLocaleString()} |
| Indirect COGS (Allocated) | $${analysis.indirectCOGS.toLocaleString()} |
| **Total Deductible COGS** | **$${analysis.totalCOGS.toLocaleString()}** |
| Non-Deductible Expenses | $${analysis.nonDeductibleExpenses.toLocaleString()} |
| Gross Profit (Taxable) | $${analysis.grossProfit.toLocaleString()} |
| Estimated Tax Liability | $${analysis.estimatedTaxLiability.toLocaleString()} |
| Effective Tax Rate | ${(analysis.estimatedTaxRate * 100).toFixed(1)}% |
| Cash Reserve Needed | $${analysis.cashReserveNeeded.toLocaleString()} |
| **Actual Cash Profit** | **$${analysis.actualCashProfit.toLocaleString()}** |

⚠️ Under IRS 280E, cannabis businesses cannot deduct operating expenses - only COGS.
This creates a significant gap between paper profit and actual cash available.
`.trim();

  return {
    summary,
    data: {
      grossRevenue: analysis.grossRevenue,
      totalCOGS: analysis.totalCOGS,
      directCOGS: analysis.directCOGS,
      indirectCOGS: analysis.indirectCOGS,
      nonDeductibleExpenses: analysis.nonDeductibleExpenses,
      grossProfit: analysis.grossProfit,
      estimatedTaxLiability: analysis.estimatedTaxLiability,
      effectiveTaxRate: analysis.estimatedTaxRate,
      cashReserveNeeded: analysis.cashReserveNeeded,
      actualCashProfit: analysis.actualCashProfit,
    },
    optimizations: analysis.optimizationSuggestions,
  };
}

export async function calculateNYCannabisTax(
  tenantId: string,
  period: string = 'current_month'
): Promise<{
  summary: string;
  data: {
    grossSales: number;
    potencyTaxCollected: number;
    salesTaxCollected: number;
    totalTaxCollected: number;
    netRevenueAfterTax: number;
  };
  categoryBreakdown: { category: string; sales: number; potencyTax: number; salesTax: number }[];
}> {
  logger.info('[profitability-tools] Calculating NY cannabis tax', { tenantId, period });

  const { start, end } = getPeriodDates(period);
  const taxSummary = await calculateNYTaxSummary(tenantId, start, end);

  const summary = `
**NY Cannabis Tax Summary for ${period.replace('_', ' ')}**

| Component | Amount |
|-----------|--------|
| Gross Sales | $${taxSummary.grossSales.toLocaleString()} |
| Potency Tax Collected | $${taxSummary.potencyTaxCollected.toLocaleString()} |
| Sales Tax Collected (13%) | $${taxSummary.salesTaxCollected.toLocaleString()} |
| **Total Tax Collected** | **$${taxSummary.totalTaxCollected.toLocaleString()}** |
| Net Revenue After Tax | $${taxSummary.netRevenueAfterTax.toLocaleString()} |

**NY Potency Tax Rates:**
- Flower: $0.005 per mg THC
- Concentrate: $0.008 per mg THC
- Edible: $0.03 per mg THC
`.trim();

  return {
    summary,
    data: {
      grossSales: taxSummary.grossSales,
      potencyTaxCollected: taxSummary.potencyTaxCollected,
      salesTaxCollected: taxSummary.salesTaxCollected,
      totalTaxCollected: taxSummary.totalTaxCollected,
      netRevenueAfterTax: taxSummary.netRevenueAfterTax,
    },
    categoryBreakdown: taxSummary.categoryBreakdown.map(cat => ({
      category: cat.category,
      sales: cat.grossSales,
      potencyTax: cat.potencyTax,
      salesTax: cat.salesTax,
    })),
  };
}

export async function getProfitabilityMetricsForAgent(
  tenantId: string,
  period: string = 'current_month'
): Promise<{
  summary: string;
  metrics: {
    grossRevenue: number;
    grossMargin: number;
    operatingMargin: number;
    effectiveTaxRate: number;
    netProfitAfter280E: number;
    inventoryTurnover: number;
    revenuePerSqFt?: number;
    revenuePerEmployee?: number;
  };
  categoryPerformance: { category: string; margin: number; benchmark: number; status: string }[];
}> {
  logger.info('[profitability-tools] Getting profitability metrics', { tenantId, period });

  const { start, end } = getPeriodDates(period);
  const config = await getTenantTaxConfig(tenantId);
  const metrics = await calculateProfitabilityMetrics(tenantId, start, end, config || undefined);

  const summary = `
**Profitability Metrics for ${period.replace('_', ' ')}**

| Metric | Value | Status |
|--------|-------|--------|
| Gross Revenue | $${metrics.grossRevenue.toLocaleString()} | - |
| Gross Margin | ${(metrics.grossMargin * 100).toFixed(1)}% | ${getMarginStatus(metrics.grossMargin)} |
| Operating Margin | ${(metrics.operatingMargin * 100).toFixed(1)}% | - |
| 280E Effective Tax Rate | ${(metrics.effectiveTaxRate * 100).toFixed(1)}% | ${metrics.effectiveTaxRate > 0.7 ? '⚠️ High' : '✅'} |
| Net Profit (After 280E) | $${metrics.netProfitAfter280E.toLocaleString()} | - |
| Inventory Turnover | ${metrics.inventoryTurnover}x/year | ${getTurnoverStatus(metrics.inventoryTurnover)} |
${metrics.revenuePerSqFt ? `| Revenue/Sq Ft | $${metrics.revenuePerSqFt.toLocaleString()} | ${getSqFtStatus(metrics.revenuePerSqFt)} |` : ''}
${metrics.revenuePerEmployee ? `| Revenue/Employee | $${metrics.revenuePerEmployee.toLocaleString()} | ${getEmployeeStatus(metrics.revenuePerEmployee)} |` : ''}
`.trim();

  return {
    summary,
    metrics: {
      grossRevenue: metrics.grossRevenue,
      grossMargin: metrics.grossMargin,
      operatingMargin: metrics.operatingMargin,
      effectiveTaxRate: metrics.effectiveTaxRate,
      netProfitAfter280E: metrics.netProfitAfter280E,
      inventoryTurnover: metrics.inventoryTurnover,
      revenuePerSqFt: metrics.revenuePerSqFt,
      revenuePerEmployee: metrics.revenuePerEmployee,
    },
    categoryPerformance: metrics.categoryPerformance.map(cat => ({
      category: cat.category,
      margin: cat.margin,
      benchmark: cat.benchmark,
      status: cat.performance,
    })),
  };
}

function getMarginStatus(margin: number): string {
  if (margin >= 0.55) return '✅ Excellent';
  if (margin >= 0.45) return '✅ Good';
  if (margin >= 0.35) return '⚠️ Average';
  return '❌ Below Average';
}

function getTurnoverStatus(turnover: number): string {
  if (turnover >= 12) return '✅ Excellent';
  if (turnover >= 8) return '✅ Good';
  if (turnover >= 6) return '⚠️ Average';
  return '❌ Slow';
}

function getSqFtStatus(revPerSqFt: number): string {
  if (revPerSqFt >= 1500) return '✅ Excellent';
  if (revPerSqFt >= 974) return '✅ Above Average';
  if (revPerSqFt >= 700) return '⚠️ Average';
  return '❌ Below Average';
}

function getEmployeeStatus(revPerEmployee: number): string {
  if (revPerEmployee >= 300000) return '✅ Excellent';
  if (revPerEmployee >= 200000) return '✅ Good';
  if (revPerEmployee >= 150000) return '⚠️ Average';
  return '❌ Below Average';
}

export function analyzePriceCompressionForAgent(
  currentAveragePrice: number,
  currentVolume: number,
  marketPriceDropPercent: number
): {
  summary: string;
  analysis: {
    currentRevenue: number;
    requiredVolumeIncrease: number;
    requiredNewVolume: number;
  };
  scenarios: { priceDrop: string; volumeNeeded: string; breakeven: boolean }[];
  recommendations: string[];
} {
  logger.info('[profitability-tools] Analyzing price compression');

  const analysis = calculatePriceCompression(
    currentAveragePrice,
    currentVolume,
    marketPriceDropPercent
  );

  const summary = `
**Price Compression Analysis (GTI Rule)**

Current State:
- Average Price: $${currentAveragePrice.toFixed(2)}
- Current Volume: ${currentVolume.toLocaleString()} units
- Current Revenue: $${analysis.currentRevenue.toLocaleString()}

If market prices drop by ${(marketPriceDropPercent * 100).toFixed(0)}%:
- New Price: $${(currentAveragePrice * (1 - marketPriceDropPercent)).toFixed(2)}
- Required Volume Increase: **${(analysis.requiredVolumeIncrease * 100).toFixed(0)}%**
- New Volume Needed: ${Math.ceil(analysis.requiredNewVolume).toLocaleString()} units

**GTI Rule:** When prices drop by X%, volume must increase by X/(1-X) to maintain revenue.
Example: 20% price drop → need 25% more volume (0.20 / 0.80 = 0.25)

| Price Drop | Volume Increase Needed | Breakeven? |
|------------|----------------------|------------|
${analysis.scenarios.map(s =>
  `| ${(s.priceDropPercent * 100).toFixed(0)}% | ${(s.volumeIncreaseNeeded * 100).toFixed(0)}% | ${s.breakeven ? '✅' : '❌'} |`
).join('\n')}
`.trim();

  return {
    summary,
    analysis: {
      currentRevenue: analysis.currentRevenue,
      requiredVolumeIncrease: analysis.requiredVolumeIncrease,
      requiredNewVolume: analysis.requiredNewVolume,
    },
    scenarios: analysis.scenarios.map(s => ({
      priceDrop: `${(s.priceDropPercent * 100).toFixed(0)}%`,
      volumeNeeded: `${(s.volumeIncreaseNeeded * 100).toFixed(0)}%`,
      breakeven: s.breakeven,
    })),
    recommendations: analysis.recommendations,
  };
}

export async function analyzeWorkingCapitalForAgent(
  tenantId: string
): Promise<{
  summary: string;
  metrics: {
    cashOnHand: number;
    workingCapital: number;
    currentRatio: number;
    quickRatio: number;
    runwayMonths: number;
    taxReserve: number;
    liquidityRisk: string;
  };
  recommendations: string[];
}> {
  logger.info('[profitability-tools] Analyzing working capital', { tenantId });

  const config = await getTenantTaxConfig(tenantId);
  const analysis = await calculateWorkingCapital(tenantId, config || undefined);

  const riskEmoji = {
    low: '✅',
    medium: '⚠️',
    high: '🔴',
    critical: '🚨',
  };

  const summary = `
**Working Capital Analysis**

| Metric | Value | Status |
|--------|-------|--------|
| Cash on Hand | $${analysis.cashOnHand.toLocaleString()} | - |
| Working Capital | $${analysis.workingCapital.toLocaleString()} | ${analysis.workingCapital > 0 ? '✅' : '❌'} |
| Current Ratio | ${analysis.currentRatio.toFixed(2)}x | ${analysis.currentRatio >= 1.5 ? '✅' : '⚠️'} |
| Quick Ratio | ${analysis.quickRatio.toFixed(2)}x | ${analysis.quickRatio >= 1.0 ? '✅' : '⚠️'} |
| Cash Runway | ${analysis.runwayMonths === Infinity ? '∞' : analysis.runwayMonths.toFixed(1)} months | ${analysis.runwayMonths >= 6 ? '✅' : '⚠️'} |
| Tax Reserve Needed | $${analysis.taxReserve.toLocaleString()} | - |
| Banking Fees (Monthly) | $${analysis.bankingFees.toLocaleString()} | - |

**Liquidity Risk: ${riskEmoji[analysis.liquidityRisk]} ${analysis.liquidityRisk.toUpperCase()}**

${analysis.riskFactors.length > 0 ? `
Risk Factors:
${analysis.riskFactors.map(f => `- ${f}`).join('\n')}
` : ''}
`.trim();

  return {
    summary,
    metrics: {
      cashOnHand: analysis.cashOnHand,
      workingCapital: analysis.workingCapital,
      currentRatio: analysis.currentRatio,
      quickRatio: analysis.quickRatio,
      runwayMonths: analysis.runwayMonths,
      taxReserve: analysis.taxReserve,
      liquidityRisk: analysis.liquidityRisk,
    },
    recommendations: analysis.recommendations,
  };
}

// =============================================================================
// TOOL EXECUTOR (for agent harness)
// =============================================================================

export async function executeProfitabilityTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'analyze280ETax':
      return analyze280ETax(
        args.tenantId as string,
        (args.period as string) || 'current_month'
      );

    case 'calculateNYCannabsTax':
      return calculateNYCannabisTax(
        args.tenantId as string,
        (args.period as string) || 'current_month'
      );

    case 'getProfitabilityMetrics':
      return getProfitabilityMetricsForAgent(
        args.tenantId as string,
        (args.period as string) || 'current_month'
      );

    case 'analyzePriceCompression':
      return analyzePriceCompressionForAgent(
        args.currentAveragePrice as number,
        args.currentVolume as number,
        args.marketPriceDropPercent as number
      );

    case 'analyzeWorkingCapital':
      return analyzeWorkingCapitalForAgent(args.tenantId as string);

    default:
      throw new Error(`Unknown profitability tool: ${toolName}`);
  }
}
