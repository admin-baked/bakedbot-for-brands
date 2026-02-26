// tests/market-benchmarks.test.ts
// Unit tests for the Market Benchmark Service (Phase 1 — Proactive Analytics Initiative)

import {
  getMarketBenchmarksSync,
  buildBenchmarkContextBlock,
  NATIONAL_DEFAULT_BENCHMARKS,
} from '../src/server/services/market-benchmarks';

// ─────────────────────────────────────────────────────────────────────────────
// getMarketBenchmarksSync — State Lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('getMarketBenchmarksSync — state lookup', () => {

  // NY Limited / Early — primary market (Thrive Syracuse)
  describe('New York (limited, early)', () => {
    const result = getMarketBenchmarksSync('NY');

    it('returns limited license type', () => {
      expect(result.context.licenseType).toBe('limited');
    });

    it('returns early market maturity', () => {
      expect(result.context.marketMaturity).toBe('early');
    });

    it('returns low competition density', () => {
      expect(result.context.competitionDensity).toBe('low');
    });

    it('returns CAURD license program', () => {
      expect(result.context.licenseProgram).toBe('CAURD');
    });

    it('returns market-adjusted discount target below national avg', () => {
      expect(result.financial.discountRateTarget).toBeLessThan(result.financial.discountRateNationalAvg);
      expect(result.financial.discountRateTarget).toBe(0.12);
    });

    it('national avg discount rate is always 21.9%', () => {
      expect(result.financial.discountRateNationalAvg).toBe(0.219);
    });

    it('returns higher gross margin target than mature markets', () => {
      expect(result.financial.grossMarginTarget).toBeGreaterThan(0.55);
    });

    it('discount elasticity is always -0.4', () => {
      expect(result.financial.discountElasticity).toBe(-0.4);
    });

    it('shrink target is 0.5% best-in-class', () => {
      expect(result.financial.shrinkTarget).toBe(0.005);
    });

    it('inventory reconciliation threshold is 5%', () => {
      expect(result.operations.inventoryReconciliationThresholdPct).toBe(0.05);
    });

    it('training hours requirement is 8', () => {
      expect(result.operations.trainingHoursRequired).toBe(8);
    });

    it('SKU aging thresholds are correctly ordered', () => {
      const { watch, action, liquidate } = result.operations.skuAgingActionDays;
      expect(watch).toBeLessThan(action);
      expect(action).toBeLessThan(liquidate);
    });

    it('§280E applies', () => {
      expect(result.tax.hasFederalSection280E).toBe(true);
    });

    it('NY state excise is 9%', () => {
      expect(result.tax.stateExcisePct).toBe(0.09);
    });

    it('market narrative mentions limited license', () => {
      expect(result.marketNarrative.toUpperCase()).toContain('LIMITED');
    });

    it('market narrative mentions CAURD or NY', () => {
      expect(result.marketNarrative).toMatch(/CAURD|New York|NY/i);
    });
  });

  // CA Unlimited / Mature
  describe('California (unlimited, mature)', () => {
    const result = getMarketBenchmarksSync('CA');

    it('returns unlimited license type', () => {
      expect(result.context.licenseType).toBe('unlimited');
    });

    it('returns mature market maturity', () => {
      expect(result.context.marketMaturity).toBe('mature');
    });

    it('returns high competition density', () => {
      expect(result.context.competitionDensity).toBe('high');
    });

    it('discount target is higher than NY (more competitive pressure)', () => {
      const ny = getMarketBenchmarksSync('NY');
      expect(result.financial.discountRateTarget).toBeGreaterThan(ny.financial.discountRateTarget);
    });

    it('gross margin target is lower than NY', () => {
      const ny = getMarketBenchmarksSync('NY');
      expect(result.financial.grossMarginTarget).toBeLessThan(ny.financial.grossMarginTarget);
    });

    it('CA excise is 15%', () => {
      expect(result.tax.stateExcisePct).toBe(0.15);
    });

    it('online ordering target is higher than NY (mature delivery market)', () => {
      const ny = getMarketBenchmarksSync('NY');
      expect(result.operations.onlineOrderingShareTarget).toBeGreaterThan(
        ny.operations.onlineOrderingShareTarget
      );
    });
  });

  // MA Limited / Developing
  describe('Massachusetts (limited, developing)', () => {
    const result = getMarketBenchmarksSync('MA');

    it('returns limited license type', () => {
      expect(result.context.licenseType).toBe('limited');
    });

    it('returns developing market maturity', () => {
      expect(result.context.marketMaturity).toBe('developing');
    });

    it('discount target is between NY and CA targets', () => {
      const ny = getMarketBenchmarksSync('NY');
      const ca = getMarketBenchmarksSync('CA');
      expect(result.financial.discountRateTarget).toBeGreaterThan(ny.financial.discountRateTarget);
      expect(result.financial.discountRateTarget).toBeLessThanOrEqual(ca.financial.discountRateTarget);
    });

    it('training hours is 8 (MA regulation explicitly requires 8)', () => {
      expect(result.operations.trainingHoursRequired).toBe(8);
    });
  });

  // CO Unlimited / Mature
  describe('Colorado (unlimited, mature)', () => {
    const result = getMarketBenchmarksSync('CO');

    it('returns unlimited and mature', () => {
      expect(result.context.licenseType).toBe('unlimited');
      expect(result.context.marketMaturity).toBe('mature');
    });

    it('has lowest gross margin target (most competitive market)', () => {
      const ny = getMarketBenchmarksSync('NY');
      expect(result.financial.grossMarginTarget).toBeLessThan(ny.financial.grossMarginTarget);
    });
  });

  // IL Limited / Developing
  describe('Illinois (limited, developing)', () => {
    const result = getMarketBenchmarksSync('IL');

    it('returns limited license type', () => {
      expect(result.context.licenseType).toBe('limited');
    });

    it('returns developing market maturity', () => {
      expect(result.context.marketMaturity).toBe('developing');
    });
  });

  // Unknown state — national default
  describe('Unknown state — national default fallback', () => {
    const result = getMarketBenchmarksSync('XX');

    it('returns unknown license type', () => {
      expect(result.context.licenseType).toBe('unknown');
    });

    it('discount elasticity is always -0.4 regardless of market', () => {
      expect(result.financial.discountElasticity).toBe(-0.4);
    });

    it('national avg discount is 21.9%', () => {
      expect(result.financial.discountRateNationalAvg).toBe(0.219);
    });

    it('§280E always applies', () => {
      expect(result.tax.hasFederalSection280E).toBe(true);
    });

    it('shrink target is always 0.5%', () => {
      expect(result.financial.shrinkTarget).toBe(0.005);
    });
  });

  // Case insensitivity
  describe('case insensitivity', () => {
    it('lowercase state code resolves correctly', () => {
      const lower = getMarketBenchmarksSync('ny');
      const upper = getMarketBenchmarksSync('NY');
      expect(lower.context.licenseType).toBe(upper.context.licenseType);
      expect(lower.financial.discountRateTarget).toBe(upper.financial.discountRateTarget);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Market Ordering Invariants — limited < unlimited in margin pressure
// ─────────────────────────────────────────────────────────────────────────────

describe('market ordering invariants', () => {
  const ny = getMarketBenchmarksSync('NY');   // limited, early
  const il = getMarketBenchmarksSync('IL');   // limited, developing
  const co = getMarketBenchmarksSync('CO');   // unlimited, mature
  const ca = getMarketBenchmarksSync('CA');   // unlimited, mature

  it('limited markets have lower discount rate targets than unlimited', () => {
    expect(ny.financial.discountRateTarget).toBeLessThan(co.financial.discountRateTarget);
    expect(il.financial.discountRateTarget).toBeLessThanOrEqual(ca.financial.discountRateTarget);
  });

  it('limited markets have higher gross margin targets than unlimited', () => {
    expect(ny.financial.grossMarginTarget).toBeGreaterThan(ca.financial.grossMarginTarget);
    expect(il.financial.grossMarginTarget).toBeGreaterThan(co.financial.grossMarginTarget);
  });

  it('mature unlimited markets have higher online ordering targets', () => {
    expect(ca.operations.onlineOrderingShareTarget).toBeGreaterThanOrEqual(
      ny.operations.onlineOrderingShareTarget
    );
  });

  it('discount elasticity is identical across all markets (-0.4 is a universal constant)', () => {
    [ny, il, co, ca].forEach(m => {
      expect(m.financial.discountElasticity).toBe(-0.4);
    });
  });

  it('§280E applies to all US markets', () => {
    [ny, il, co, ca].forEach(m => {
      expect(m.tax.hasFederalSection280E).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBenchmarkContextBlock — Agent Prompt Block
// ─────────────────────────────────────────────────────────────────────────────

describe('buildBenchmarkContextBlock', () => {
  const nyBlock = buildBenchmarkContextBlock(getMarketBenchmarksSync('NY'));
  const caBlock = buildBenchmarkContextBlock(getMarketBenchmarksSync('CA'));

  it('block contains the opening delimiter', () => {
    expect(nyBlock).toContain('=== MARKET & INDUSTRY BENCHMARKS');
  });

  it('block contains the closing delimiter', () => {
    expect(nyBlock).toContain('=== END BENCHMARKS ===');
  });

  it('NY block explicitly mentions LIMITED LICENSE', () => {
    expect(nyBlock).toContain('LIMITED LICENSE');
  });

  it('CA block explicitly mentions UNLIMITED LICENSE', () => {
    expect(caBlock).toContain('UNLIMITED LICENSE');
  });

  it('always shows national avg (21.9%) for reference', () => {
    expect(nyBlock).toContain('21.9%');
    expect(caBlock).toContain('21.9%');
  });

  it('shows market-adjusted target distinct from national avg (NY)', () => {
    // NY target is 12%, national is 21.9% — both must appear
    expect(nyBlock).toContain('12%');
    expect(nyBlock).toContain('21.9%');
  });

  it('discount elasticity rule appears in block', () => {
    expect(nyBlock).toContain('-0.4%');
  });

  it('§280E appears in block', () => {
    expect(nyBlock).toContain('§280E');
  });

  it('SKU aging thresholds appear in block', () => {
    expect(nyBlock).toContain('LIQUIDATE');
    expect(nyBlock).toContain('ACTION');
    expect(nyBlock).toContain('WATCH');
  });

  it('pricing power note appears for limited license markets', () => {
    expect(nyBlock).toContain('PRICING POWER EXISTS');
  });

  it('competitive pressure note appears for unlimited license markets', () => {
    expect(caBlock).toContain('Competitive pressure');
  });

  it('block for default benchmarks does not crash', () => {
    const block = buildBenchmarkContextBlock(NATIONAL_DEFAULT_BENCHMARKS);
    expect(block).toBeTruthy();
    expect(block).toContain('21.9%');
    expect(block).toContain('§280E');
  });

  it('block contains market narrative', () => {
    // Last section of block is the narrative — verify it has real content
    expect(nyBlock.length).toBeGreaterThan(500);
    const lines = nyBlock.split('\n');
    expect(lines.length).toBeGreaterThan(15);
  });

  it('percentage values are formatted as integers not decimals', () => {
    // Should show "12%" not "0.12%" or "12.000%"
    expect(nyBlock).toMatch(/12%/);
    expect(nyBlock).not.toContain('0.12%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NATIONAL_DEFAULT_BENCHMARKS export
// ─────────────────────────────────────────────────────────────────────────────

describe('NATIONAL_DEFAULT_BENCHMARKS', () => {
  it('is exported and has all required fields', () => {
    expect(NATIONAL_DEFAULT_BENCHMARKS).toBeDefined();
    expect(NATIONAL_DEFAULT_BENCHMARKS.context).toBeDefined();
    expect(NATIONAL_DEFAULT_BENCHMARKS.financial).toBeDefined();
    expect(NATIONAL_DEFAULT_BENCHMARKS.operations).toBeDefined();
    expect(NATIONAL_DEFAULT_BENCHMARKS.tax).toBeDefined();
    expect(NATIONAL_DEFAULT_BENCHMARKS.marketNarrative).toBeTruthy();
  });

  it('national avg discount is always 21.9%', () => {
    expect(NATIONAL_DEFAULT_BENCHMARKS.financial.discountRateNationalAvg).toBe(0.219);
  });

  it('elasticity is -0.4', () => {
    expect(NATIONAL_DEFAULT_BENCHMARKS.financial.discountElasticity).toBe(-0.4);
  });
});
