// src/server/services/market-benchmarks.ts
// Market-aware benchmark service.
// Returns calibrated KPI benchmarks based on state + license type + market maturity.
// Used by all agents at initialize() to ground advice in market reality vs. generic national averages.

import { logger } from '@/lib/logger';
import { getOrgProfileWithFallback } from './org-profile';
import type {
  MarketBenchmarks,
  LicenseType,
  MarketMaturity,
  MarketContext,
} from '@/types/market-benchmarks';

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Cache (60-minute TTL — benchmarks change very slowly)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  benchmarks: MarketBenchmarks;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// ─────────────────────────────────────────────────────────────────────────────
// State Knowledge Maps (hardcoded market knowledge — changes slowly)
// ─────────────────────────────────────────────────────────────────────────────

/** Full state name → 2-letter code */
const STATE_NAME_TO_CODE: Record<string, string> = {
  'New York': 'NY',
  'California': 'CA',
  'Massachusetts': 'MA',
  'Colorado': 'CO',
  'Illinois': 'IL',
  'Washington': 'WA',
  'Oregon': 'OR',
  'Michigan': 'MI',
  'New Jersey': 'NJ',
  'Nevada': 'NV',
  'Arizona': 'AZ',
  'Maryland': 'MD',
  'Connecticut': 'CT',
  'Missouri': 'MO',
  'Montana': 'MT',
  'New Mexico': 'NM',
  'Vermont': 'VT',
  'Alaska': 'AK',
  'Maine': 'ME',
  'Rhode Island': 'RI',
  'Delaware': 'DE',
  'Virginia': 'VA',
  'Minnesota': 'MN',
  'Ohio': 'OH',
  'Hawaii': 'HI',
  'Florida': 'FL',
};

const STATE_LICENSE_TYPE: Record<string, LicenseType> = {
  NY: 'limited',   // CAURD program — controlled rollout, 2023 start
  MA: 'limited',   // HCA — controlled
  IL: 'limited',   // IDFPR — controlled rollout
  NJ: 'limited',   // CRC — still developing
  NV: 'limited',   // CCB — controlled
  MD: 'limited',   // MCA — recent adult-use rollout
  CT: 'limited',   // DCP — limited licenses
  MO: 'limited',   // DHSS — early rollout
  CA: 'unlimited', // DCC — open licensing, mature
  CO: 'unlimited', // MED — open, mature
  WA: 'unlimited', // LCB — open, mature
  OR: 'unlimited', // OLCC — open, mature
  MI: 'unlimited', // MRA — open, mature
  AZ: 'unlimited', // ADHS — relatively open
  NM: 'unlimited', // RLD — open
};

const STATE_MARKET_MATURITY: Record<string, MarketMaturity> = {
  NY: 'early',       // CAURD launched late 2022/2023 — very early
  NJ: 'early',       // Adult-use 2023
  MO: 'early',       // Adult-use 2023
  CT: 'early',       // Adult-use 2023
  MD: 'early',       // Adult-use 2023
  MA: 'developing',  // 2018 — mid-maturity
  IL: 'developing',  // 2020 — mid-maturity
  NV: 'developing',  // 2017 but supply still constrained
  AZ: 'developing',  // 2021
  MI: 'developing',  // 2019
  CO: 'mature',      // 2012 — most mature
  CA: 'mature',      // 2018 — highly competitive
  WA: 'mature',      // 2014
  OR: 'mature',      // 2015
};

const STATE_LICENSE_PROGRAM: Record<string, string> = {
  NY: 'CAURD',
  MA: 'HCA',
  IL: 'IDFPR',
  NJ: 'CRC',
  CO: 'MED',
  CA: 'DCC',
  WA: 'LCB',
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-State Benchmark Definitions
// ─────────────────────────────────────────────────────────────────────────────

function buildContext(stateCode: string, stateName: string): MarketContext {
  const licenseType = STATE_LICENSE_TYPE[stateCode] ?? 'unknown';
  const maturity = STATE_MARKET_MATURITY[stateCode] ?? 'developing';

  const competitionDensity =
    licenseType === 'unlimited' && maturity === 'mature' ? 'high'
    : licenseType === 'limited' && maturity === 'early' ? 'low'
    : 'medium';

  const notes: Record<string, string> = {
    NY: 'NY CAURD program launched 2022-2023. Very few licensed dispensaries, especially upstate (Syracuse area). Limited competition creates pricing power unavailable in mature markets.',
    MA: 'MA HCA program — controlled licensing since 2018. Strict advertising rules (85% 21+ audience composition required). Mid-density competition.',
    IL: 'IL IDFPR — controlled rollout since 2020. Chicago-heavy competition; downstate markets thinner. Equity license backlog created supply gaps.',
    CO: 'CO MED — most mature US market (2012). Heavy price compression, high store density, aggressive discounting common. Discipline critical.',
    CA: 'CA DCC — open licensing, mature since 2018. Extreme price compression in most markets. Massive illegal market still competing. Cost control is existential.',
  };

  return {
    state: stateName,
    stateCode,
    licenseType,
    marketMaturity: maturity,
    competitionDensity,
    licenseProgram: STATE_LICENSE_PROGRAM[stateCode],
    notes: notes[stateCode] ?? `${stateName} cannabis market — ${licenseType} licensing, ${maturity} stage.`,
  };
}

// NY Limited / Early — Primary implementation (Thrive Syracuse)
const NY_BENCHMARKS: MarketBenchmarks = {
  context: buildContext('NY', 'New York'),
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.12,      // 12% — limited competition means pricing power exists
    grossMarginTarget: 0.61,       // 58-65% range; 61% center
    shrinkTarget: 0.005,           // 0.5% best-in-class (universal)
    discountElasticity: -0.4,      // published 2026 research: each +1% discount = -0.4% GM
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — treat as a deliberate micro-P&L with explicit attach-rate targets per transaction.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,     // NY OCM / Metrc standard
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.15,   // 10-20% — NY delivery still developing
    unitsPerTransactionLiftTarget: 0.10,
    trainingHoursRequired: 8,          // NY OCM / responsible vendor
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.09,          // NY 9% state cannabis excise
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.18,     // state + local combined estimate
    cogsOptimizationNote: 'Federal §280E applies — COGS method and defensible inventory costing are strategically important. Difference between 70% and 90% effective tax rates.',
  },
  marketNarrative: `New York is a LIMITED LICENSE market in EARLY stage (CAURD program, launched 2022-2023). Thrive Syracuse operates with very few licensed competitors upstate — meaningful pricing power exists that mature markets (CA, CO) have lost. The national discount average (21.9%) does NOT apply here. Primary margin risk is internal: unnecessary blanket discounting, slow inventory turns, poor COGS capture. Protect pricing discipline above all. NY OCM requires Metrc track-and-trace with monthly reconciliation (≤5% discrepancy threshold).`,
};

const MA_BENCHMARKS: MarketBenchmarks = {
  context: buildContext('MA', 'Massachusetts'),
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.14,
    grossMarginTarget: 0.58,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — treat as a deliberate micro-P&L with explicit attach-rate targets per transaction.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.20,
    unitsPerTransactionLiftTarget: 0.10,
    trainingHoursRequired: 8,          // MA explicitly requires 8 hrs annually
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.10,          // MA 10.75% excise, rounded for estimation
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.20,
    cogsOptimizationNote: 'Federal §280E applies. MA has one of the higher combined tax burdens — COGS optimization is critical to after-tax profitability.',
  },
  marketNarrative: `Massachusetts is a LIMITED LICENSE market in DEVELOPING stage (HCA, since 2018). Mid-level competition with strict advertising rules — 85% 21+ audience composition required for most channels. Pricing power exists but is eroding in metro areas (Boston). Upside: strong demand and higher-income consumer base support margin targets above national average.`,
};

const CA_BENCHMARKS: MarketBenchmarks = {
  context: buildContext('CA', 'California'),
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.18,      // CA mature — discounting is structural
    grossMarginTarget: 0.53,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — in CA where cannabis margins are compressed, accessories are a rare high-margin haven.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,     // CA DCC explicit 5% threshold
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.25,   // CA delivery mature — target 25%
    unitsPerTransactionLiftTarget: 0.12,
    trainingHoursRequired: 8,
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.15,          // CA 15% excise (returned Oct 2025)
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.28,     // CA has highest combined tax burden
    cogsOptimizationNote: 'Federal §280E applies. CA has one of the highest combined tax burdens in the US — COGS optimization is not optional, it is survival-level critical.',
  },
  marketNarrative: `California is an UNLIMITED LICENSE market in MATURE stage (DCC, since 2018). Extreme price compression, high store density, and persistent illegal market competition. Discounting is structural — 18-22% discount rates are common. Margin defense requires disciplined buying, SKU rationalization, and operational efficiency. Delivery is mature — target 25% of sales from online/delivery channels.`,
};

const CO_BENCHMARKS: MarketBenchmarks = {
  context: buildContext('CO', 'Colorado'),
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.18,
    grossMarginTarget: 0.52,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — in CO where cannabis margins are heavily compressed, accessories protect blended margin.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.22,
    unitsPerTransactionLiftTarget: 0.12,
    trainingHoursRequired: 8,
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.15,          // CO 15% state excise
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.25,
    cogsOptimizationNote: 'Federal §280E applies. CO mature market — COGS discipline separates profitable operators from break-even operators.',
  },
  marketNarrative: `Colorado is an UNLIMITED LICENSE market in MATURE stage (MED, since 2012 — the original legal recreational market). Severe price compression, very high store density, aggressive competitor discounting. Operators must compete on efficiency, assortment, and experience — not just price. Delivery is normalized. Margin targets are the lowest in the US.`,
};

const IL_BENCHMARKS: MarketBenchmarks = {
  context: buildContext('IL', 'Illinois'),
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.15,
    grossMarginTarget: 0.57,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — strong attach opportunity given IL\'s high-basket consumer profile.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.18,
    unitsPerTransactionLiftTarget: 0.10,
    trainingHoursRequired: 8,
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.10,          // IL tiered excise — 10% low THC, up to 25% high THC
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.22,
    cogsOptimizationNote: 'Federal §280E applies. IL tiered excise tax (based on THC content) means category mix directly affects tax burden — high-THC products carry higher excise.',
  },
  marketNarrative: `Illinois is a LIMITED LICENSE market in DEVELOPING stage (IDFPR, since 2020). Competition is heavier in Chicago metro than downstate. Price compression is real but not as severe as CA/CO — some pricing power remains. Note: IL units sold rose in 2025 while revenue fell, a sign of early price compression onset. Maintain discount discipline now before compression accelerates.`,
};

/** National default for states without specific calibration */
const NATIONAL_DEFAULT_BENCHMARKS: MarketBenchmarks = {
  context: {
    state: 'Unknown',
    stateCode: 'XX',
    licenseType: 'unknown',
    marketMaturity: 'developing',
    competitionDensity: 'medium',
    notes: 'State not specifically calibrated — using national average benchmarks.',
  },
  financial: {
    discountRateNationalAvg: 0.219,
    discountRateTarget: 0.18,
    grossMarginTarget: 0.55,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — treat as a deliberate micro-P&L with explicit attach-rate targets per transaction.',
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.20,
    unitsPerTransactionLiftTarget: 0.10,
    trainingHoursRequired: 8,
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 },
  },
  tax: {
    stateExcisePct: 0.10,          // national average estimate
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.20,
    cogsOptimizationNote: 'Federal §280E applies — COGS method and defensible inventory costing are strategically important for after-tax profitability.',
  },
  marketNarrative: `Using national average benchmarks — state not specifically calibrated. Recommend setting org state in brand profile for market-specific intelligence. National avg discount rate: 21.9%. Each +1% increase in discount rate reduces gross margin by ~0.4%.`,
};

const STATE_BENCHMARK_MAP: Record<string, MarketBenchmarks> = {
  NY: NY_BENCHMARKS,
  MA: MA_BENCHMARKS,
  CA: CA_BENCHMARKS,
  CO: CO_BENCHMARKS,
  IL: IL_BENCHMARKS,
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronous benchmark lookup by state code.
 * Used when orgId is not available or async context is unavailable.
 */
export function getMarketBenchmarksSync(
  stateCode: string,
  _licenseType?: LicenseType
): MarketBenchmarks {
  return STATE_BENCHMARK_MAP[stateCode.toUpperCase()] ?? NATIONAL_DEFAULT_BENCHMARKS;
}

/**
 * Primary async fetch — reads org profile state and returns market-calibrated benchmarks.
 * Results cached 60 minutes. Falls back gracefully to national defaults.
 */
export async function getMarketBenchmarks(orgId: string): Promise<MarketBenchmarks> {
  const cached = cache.get(orgId);
  if (cached && isCacheValid(cached)) return cached.benchmarks;

  try {
    const profile = await getOrgProfileWithFallback(orgId);
    const stateName = profile?.brand?.state;

    if (!stateName) {
      logger.warn(`[MarketBenchmarks] No state in org profile for orgId=${orgId} — using national defaults`);
      return NATIONAL_DEFAULT_BENCHMARKS;
    }

    const stateCode = STATE_NAME_TO_CODE[stateName] ?? stateName.slice(0, 2).toUpperCase();
    const benchmarks = STATE_BENCHMARK_MAP[stateCode] ?? NATIONAL_DEFAULT_BENCHMARKS;

    // Override context with actual state name if using default
    const result: MarketBenchmarks =
      stateCode in STATE_BENCHMARK_MAP
        ? benchmarks
        : {
            ...NATIONAL_DEFAULT_BENCHMARKS,
            context: {
              ...NATIONAL_DEFAULT_BENCHMARKS.context,
              state: stateName,
              stateCode,
              licenseType: STATE_LICENSE_TYPE[stateCode] ?? 'unknown',
              marketMaturity: STATE_MARKET_MATURITY[stateCode] ?? 'developing',
            },
          };

    cache.set(orgId, { benchmarks: result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    logger.error(`[MarketBenchmarks] Failed for orgId=${orgId}: ${String(err)}`);
    return NATIONAL_DEFAULT_BENCHMARKS;
  }
}

/**
 * Builds the agent system prompt injection block from market benchmarks.
 * Inject this BEFORE the === AGENT SQUAD === section in every agent's system prompt.
 */
export function buildBenchmarkContextBlock(benchmarks: MarketBenchmarks): string {
  const { context, financial, operations, tax } = benchmarks;

  const licenseLabel = context.licenseType === 'limited'
    ? 'LIMITED LICENSE'
    : context.licenseType === 'unlimited'
    ? 'UNLIMITED LICENSE'
    : 'LICENSE TYPE UNKNOWN';

  const maturityLabel = context.marketMaturity.toUpperCase();
  const competitionLabel = context.competitionDensity.toUpperCase();

  const discountTargetPct = Math.round(financial.discountRateTarget * 100);
  // National avg uses one decimal to preserve "21.9%" — rounding to integer gives "22%" which loses precision
  const discountNationalPct = parseFloat((financial.discountRateNationalAvg * 100).toFixed(1));
  const gmTargetPct = Math.round(financial.grossMarginTarget * 100);
  const shrinkTargetPct = (financial.shrinkTarget * 100).toFixed(1);
  const onlineTargetPct = Math.round(operations.onlineOrderingShareTarget * 100);
  const uptLiftPct = Math.round(operations.unitsPerTransactionLiftTarget * 100);
  const reconciliationPct = Math.round(operations.inventoryReconciliationThresholdPct * 100);
  const excisePct = Math.round(tax.stateExcisePct * 100);
  const totalTaxPct = Math.round(tax.totalTaxEstimatePct * 100);

  const pricingPowerNote = context.licenseType === 'limited'
    ? `→ PRICING POWER EXISTS in this market — blanket discounting destroys margin that competitors cannot pressure you into losing.`
    : `→ Competitive pressure is REAL — but segment discounts vs. blanket discounts to protect margin.`;

  return `=== MARKET & INDUSTRY BENCHMARKS (${context.state.toUpperCase()} — ${licenseLabel}) ===
Market Type: ${licenseLabel}${context.licenseProgram ? ` (${context.licenseProgram})` : ''} | Stage: ${maturityLabel} | Competition: ${competitionLabel}

FINANCIAL BENCHMARKS (${context.state} — NOT national one-size-fits-all):
• Discount Rate: National avg = ${discountNationalPct}% | THIS MARKET target = ${discountTargetPct}%
  → Each +1% discount rate = approximately -0.4% gross margin (hard rule — cite in every promo)
  ${pricingPowerNote}
• Gross Margin Target: ${gmTargetPct}% (market-calibrated)
• Shrink Target: ≤${shrinkTargetPct}% (best-in-class, universal across all markets)
• ${financial.accessoriesMarginNote}

OPERATIONAL BENCHMARKS:
• Inventory Reconciliation: Every ${operations.inventoryReconciliationCadenceDays} days, ≤${reconciliationPct}% discrepancy threshold (regulatory standard)
• Online Ordering Share: Build toward ${onlineTargetPct}% of sales
• Units Per Transaction: Target +${uptLiftPct}% lift vs. current baseline
• Training Compliance: ≥${operations.trainingHoursRequired} hours annually (regulatory minimum)
• SKU Aging Rules:
  - 0–${operations.skuAgingActionDays.watch} days: healthy, monitor velocity
  - ${operations.skuAgingActionDays.watch + 1}–${operations.skuAgingActionDays.action} days: WATCH — eligible for targeted promotion only
  - ${operations.skuAgingActionDays.action + 1}–${operations.skuAgingActionDays.liquidate} days: ACTION — markdown recommended, isolate from main calendar
  - ${operations.skuAgingActionDays.liquidate + 1}+ days: LIQUIDATE — vendor swap, bundle with fast-mover, or flag for destruction review

TAX CONTEXT (${context.state}):
• State Excise: ~${excisePct}% + local taxes (combined estimate ~${totalTaxPct}%)
• ${tax.cogsOptimizationNote}

MARKET NARRATIVE:
${benchmarks.marketNarrative}
=== END BENCHMARKS ===`;
}

export { NATIONAL_DEFAULT_BENCHMARKS };
export type { MarketBenchmarks };
