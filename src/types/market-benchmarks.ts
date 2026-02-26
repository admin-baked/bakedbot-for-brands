// src/types/market-benchmarks.ts
// Market-aware benchmark types for agent intelligence.
// Benchmarks are calibrated per license type + market maturity — NOT national one-size-fits-all.

export type LicenseType = 'limited' | 'unlimited' | 'unknown';
export type MarketMaturity = 'early' | 'developing' | 'mature';
export type CompetitionDensity = 'low' | 'medium' | 'high';

export interface MarketContext {
  state: string;                   // e.g., 'New York'
  stateCode: string;               // e.g., 'NY'
  licenseType: LicenseType;
  marketMaturity: MarketMaturity;
  competitionDensity: CompetitionDensity;
  licenseProgram?: string;         // e.g., 'CAURD' for NY
  notes: string;                   // Human-readable market context for agents
}

export interface FinancialBenchmarks {
  /** National industry average discount rate (21.9% — published research 2026) */
  discountRateNationalAvg: number;
  /** Market-adjusted discount rate target for THIS specific market */
  discountRateTarget: number;
  /** Gross margin target for this market type */
  grossMarginTarget: number;
  /** Best-in-class shrink target (consistent across all markets) */
  shrinkTarget: number;
  /**
   * Discount elasticity: each +1% increase in discount rate reduces gross margin by this amount.
   * Published 2026 industry research: -0.4% GM per +1% discount rate.
   */
  discountElasticity: number;
  /** Note on accessory category margin opportunity */
  accessoriesMarginNote: string;
}

export interface OperationalBenchmarks {
  /** Regulatory threshold for inventory discrepancy (5% = "significant" per CA/NY OCM) */
  inventoryReconciliationThresholdPct: number;
  /** Required reconciliation cadence in days (30 = monthly) */
  inventoryReconciliationCadenceDays: number;
  /** Online ordering share target for this market maturity */
  onlineOrderingShareTarget: number;
  /** Units-per-transaction lift target vs. current baseline */
  unitsPerTransactionLiftTarget: number;
  /** Minimum annual training hours required by state regulation */
  trainingHoursRequired: number;
  /** SKU aging action thresholds in days */
  skuAgingActionDays: {
    watch: number;      // Flag for monitoring
    action: number;     // Markdown recommended
    liquidate: number;  // Vendor swap or destruction review
  };
}

export interface TaxContext {
  /** State excise tax rate (as decimal, e.g., 0.09 = 9%) */
  stateExcisePct: number;
  /** Federal §280E always applies to US cannabis businesses */
  hasFederalSection280E: boolean;
  /** Combined state + local tax estimate */
  totalTaxEstimatePct: number;
  /** §280E COGS optimization note for agents */
  cogsOptimizationNote: string;
}

export interface MarketBenchmarks {
  context: MarketContext;
  financial: FinancialBenchmarks;
  operations: OperationalBenchmarks;
  tax: TaxContext;
  /** Agent-readable 2-4 sentence narrative about this specific market */
  marketNarrative: string;
}
