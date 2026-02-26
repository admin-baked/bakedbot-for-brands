# AI-Executable Spec: Proactive Analytics & Agent Intelligence Upgrade
**PRD:** `dev/prds/2026-02-25-proactive-analytics-intelligence.md`
**Status:** ✅ Approved 2026-02-25
**Scope:** ~25 files, ~3,500 lines net new

---

## Implementation Phases

| Phase | What | Key Files |
|-------|------|-----------|
| 1 | Market Benchmark Types + Service | 2 new files |
| 2 | Tier 1 — Agent Benchmark Injection | 7 agent files modified |
| 3 | Tier 2 — 4 Analytics Tools | 1 new file, 3 agent files modified |
| 4 | Tier 3 — Deebo State Compliance Matrix | 6 new files, 1 agent modified |
| 5 | New Artifact Types + Rendering | `inbox.ts` modified, 2 new components |
| 6 | Dashboard Analytics Widgets | 3 new tab components, 1 new action file |
| 7 | Morning Briefing Cron | 2 new files |

---

## Phase 1: Market Benchmark Types + Service

### 1A. `src/types/market-benchmarks.ts` (NEW)

```typescript
export type LicenseType = 'limited' | 'unlimited' | 'unknown'
export type MarketMaturity = 'early' | 'developing' | 'mature'
export type CompetitionDensity = 'low' | 'medium' | 'high'

export interface MarketContext {
  state: string                      // e.g., 'New York'
  stateCode: string                  // e.g., 'NY'
  licenseType: LicenseType
  marketMaturity: MarketMaturity
  competitionDensity: CompetitionDensity
  licenseProgram?: string            // e.g., 'CAURD' for NY
  notes: string                      // Human-readable context for agents
}

export interface FinancialBenchmarks {
  discountRateAvg: number            // national avg e.g., 0.219
  discountRateTarget: number         // market-adjusted target e.g., 0.14
  grossMarginTarget: number          // e.g., 0.60
  shrinkTarget: number               // e.g., 0.005
  discountElasticity: number         // -0.4 (each +1% discount = -0.4% GM)
  accessoriesMarginNote: string      // "Accessories = 1-3% revenue but disproportionate margin"
}

export interface OperationalBenchmarks {
  inventoryReconciliationThresholdPct: number  // 0.05 (5%)
  inventoryReconciliationCadenceDays: number   // 30
  onlineOrderingShareTarget: number            // 0.15 for NY
  unitsPerTransactionLiftTarget: number        // 0.10 (10%)
  trainingHoursRequired: number                // 8
  skuAgingActionDays: { watch: 30; action: 60; liquidate: 90 }
}

export interface TaxContext {
  stateExcisePct: number             // 0.09 for NY
  hasFederalSection280E: boolean     // always true for US
  totalTaxEstimatePct: number        // combined estimate
  cogsOptimizationNote: string       // §280E reminder
}

export interface MarketBenchmarks {
  context: MarketContext
  financial: FinancialBenchmarks
  operations: OperationalBenchmarks
  tax: TaxContext
  marketNarrative: string            // Agent-readable paragraph (2-4 sentences)
}
```

### 1B. `src/server/services/market-benchmarks.ts` (NEW)

**Exports:**
- `getMarketBenchmarks(orgId: string): Promise<MarketBenchmarks>` — reads org_profile state → returns market-adjusted benchmarks
- `buildBenchmarkContextBlock(benchmarks: MarketBenchmarks): string` — returns formatted string for agent system prompt injection
- `getMarketBenchmarksSync(stateCode: string, licenseType?: LicenseType): MarketBenchmarks` — synchronous lookup for non-async contexts

**State → License Type Mapping (hardcoded, market knowledge):**
```typescript
const STATE_LICENSE_TYPE: Record<string, LicenseType> = {
  NY: 'limited',   // CAURD program, controlled rollout
  MA: 'limited',   // Controlled
  IL: 'limited',   // Controlled rollout
  NJ: 'limited',   // Still developing
  NV: 'limited',   // Controlled
  CA: 'unlimited', // Open licensing, mature
  CO: 'unlimited', // Open, mature
  WA: 'unlimited',
  OR: 'unlimited',
  MI: 'unlimited',
}

const STATE_MARKET_MATURITY: Record<string, MarketMaturity> = {
  NY: 'early',       // CAURD launched 2023
  NJ: 'early',
  MA: 'developing',
  IL: 'developing',
  CO: 'mature',
  CA: 'mature',
  WA: 'mature',
  OR: 'mature',
}
```

**NY Limited License Benchmarks (primary implementation — Thrive Syracuse):**
```typescript
const NY_LIMITED_BENCHMARKS: MarketBenchmarks = {
  context: {
    state: 'New York', stateCode: 'NY',
    licenseType: 'limited', marketMaturity: 'early',
    competitionDensity: 'low', licenseProgram: 'CAURD',
    notes: 'NY CAURD program launched 2023. Very few licensed dispensaries upstate (Syracuse area). Limited competition gives pricing power unavailable in mature markets.'
  },
  financial: {
    discountRateAvg: 0.15,        // lower than national 21.9% — limited competition
    discountRateTarget: 0.12,     // stay disciplined — pricing power exists
    grossMarginTarget: 0.61,
    shrinkTarget: 0.005,
    discountElasticity: -0.4,
    accessoriesMarginNote: 'Accessories = 1-3% of revenue but disproportionately high margin — treat as a deliberate micro-P&L with attach-rate targets.'
  },
  operations: {
    inventoryReconciliationThresholdPct: 0.05,
    inventoryReconciliationCadenceDays: 30,
    onlineOrderingShareTarget: 0.15,   // lower — NY delivery still developing
    unitsPerTransactionLiftTarget: 0.10,
    trainingHoursRequired: 8,
    skuAgingActionDays: { watch: 30, action: 60, liquidate: 90 }
  },
  tax: {
    stateExcisePct: 0.09,
    hasFederalSection280E: true,
    totalTaxEstimatePct: 0.18,
    cogsOptimizationNote: 'Federal §280E applies. COGS method and defensible inventory costing are strategically important — the difference between 70% and 90% effective tax rates.'
  },
  marketNarrative: `New York is a LIMITED LICENSE market in EARLY stage (CAURD program, launched 2023). Thrive Syracuse has very few licensed competitors upstate — meaningful pricing power exists that most mature markets lack. National discount averages (21.9%) DO NOT APPLY HERE. The primary margin risk is internal: unnecessary blanket discounting, slow inventory turns, and poor COGS capture. Protect pricing discipline above all else. NY OCM requires Metrc track-and-trace with monthly reconciliation (≤5% discrepancy threshold).`
}
```

**Default/National Benchmarks (fallback for unknown states):**
```typescript
const NATIONAL_DEFAULT_BENCHMARKS: MarketBenchmarks = {
  // discountRateAvg: 0.219, discountRateTarget: 0.18, grossMarginTarget: 0.55
  // Uses published research: 21.9% avg discount, -0.4% elasticity
}
```

**`buildBenchmarkContextBlock(benchmarks)` output format:**
```
=== MARKET & INDUSTRY BENCHMARKS ({STATE} — {LICENSE_TYPE} LICENSE) ===
Market: {LICENSE_TYPE} LICENSE | Stage: {MATURITY} | Competition: {DENSITY}

FINANCIAL BENCHMARKS ({context}):
• Discount Rate: National avg = 21.9% | THIS MARKET target = {discountRateTarget*100}%
  → Each +1% discount rate = -0.4% gross margin (elasticity rule — use in every promo recommendation)
  → {licenseType === 'limited' ? 'Pricing power exists — blanket discounting destroys margin unnecessarily' : 'Heavy competitive pressure — but still segment discounts vs. blanket'}
• Gross Margin Target: {grossMarginTarget*100}%
• Shrink Target: ≤{shrinkTarget*100}% (best-in-class across all markets)
• {accessoriesMarginNote}

OPERATIONAL BENCHMARKS:
• Inventory Reconciliation: Every {cadenceDays} days, ≤{threshold*100}% discrepancy (regulatory threshold)
• Online Ordering Share: Build to {onlineShare*100}%
• Units Per Transaction: Target +{upt*100}% vs current baseline
• Training Compliance: ≥{trainingHours} hours annually (regulatory minimum)
• SKU Aging Rules: 0-{watch}d healthy | {watch+1}-{action}d watch | {action+1}-{liquidate}d markdown | {liquidate+1}d+ liquidate

TAX CONTEXT:
• State Excise: ~{excise*100}% + local taxes (total est. ~{total*100}%)
• {cogsOptimizationNote}

MARKET NARRATIVE:
{marketNarrative}
==============================================
```

**`getMarketBenchmarks(orgId)` implementation:**
1. Call `getOrgProfileWithFallback(orgId).catch(() => null)`
2. Extract `profile?.brand?.state` → map to stateCode via reverse lookup
3. If no state → return `NATIONAL_DEFAULT_BENCHMARKS`
4. Look up `STATE_LICENSE_TYPE[stateCode]` and `STATE_MARKET_MATURITY[stateCode]`
5. Match to specific benchmark object (NY_LIMITED → return `NY_LIMITED_BENCHMARKS`)
6. For unmapped states → interpolate from license type + maturity (limited+early = most conservative, unlimited+mature = most aggressive)
7. Cache result 60 minutes in-memory (benchmarks don't change)

**Test cases:**
- `getMarketBenchmarks('org_thrive_syracuse')` → `NY_LIMITED_BENCHMARKS` (state='New York' in org profile)
- `getMarketBenchmarksSync('NY', 'limited')` → discountRateTarget=0.12, grossMarginTarget=0.61
- `getMarketBenchmarksSync('CA', 'unlimited')` → discountRateTarget=0.18, grossMarginTarget=0.55
- `getMarketBenchmarksSync('XX')` → NATIONAL_DEFAULT_BENCHMARKS (unknown state)
- `buildBenchmarkContextBlock(NY_LIMITED_BENCHMARKS)` → string containing '=== MARKET & INDUSTRY BENCHMARKS (NEW YORK — LIMITED LICENSE) ==='

---

## Phase 2: Tier 1 — Agent Benchmark Injection

### Modification pattern (ALL 7 agents)

In each agent's `initialize(orgId: string, ...)` method:
1. Add to existing `Promise.all`: `getMarketBenchmarks(orgId).catch(() => null)`
2. Call `buildBenchmarkContextBlock(benchmarks)` on result
3. Inject block into system prompt BEFORE `=== AGENT SQUAD` section

**Agents to modify:**
- `src/server/agents/pops.ts` — inject after OrgProfile block
- `src/server/agents/moneymike.ts` — inject after OrgProfile block, BEFORE §280E section (already has §280E content — merge/deduplicate)
- `src/server/agents/craig.ts` — inject; add rule: "Discount rate for THIS MARKET is {target}% — flag any campaign that would push rate above this"
- `src/server/agents/smokey.ts` — inject; add: "Good/Better/Best tier merchandising: entry/mid/premium per category"
- `src/server/agents/mrs-parker.ts` — inject; add: "Retention matters more in limited-license markets — you won every customer at higher cost"
- `src/server/agents/ezal.ts` — inject; add: "Price compression risk is {context.notes} — calibrate alerts accordingly"
- `src/server/agents/deebo.ts` — inject; used for compliance matrix in Phase 4

**Craig-specific addition to rules:**
```
DISCOUNT DISCIPLINE RULE:
Our market's discount rate target is {discountRateTarget*100}%. National avg is 21.9%.
Each +1% in discount rate = -0.4% gross margin (hard rule — cite this in every promo recommendation).
Before recommending any promotion, calculate: estimated discount rate impact × -0.4 = gross margin reduction.
Flag when a proposed campaign would push discount rate above {discountRateTarget*100}%.
```

---

## Phase 3: Tier 2 — Analytics Tools

### 3A. `src/server/tools/analytics-tools.ts` (NEW)

**Exports:**
- `analyticsToolDefs` — array of Genkit tool definitions (4 tools)
- `makeAnalyticsToolsImpl(orgId: string)` — returns tool implementations

**Tool 1: `promotion_scorecard`**
```typescript
// Input
z.object({
  startDate: z.string(),         // ISO date 'YYYY-MM-DD'
  endDate: z.string(),           // ISO date 'YYYY-MM-DD'
  promotionName: z.string().optional(),
  comparisonStartDate: z.string().optional(), // defaults to same-length prior period
  comparisonEndDate: z.string().optional(),
})

// Implementation: makeAnalyticsToolsImpl(orgId).promotion_scorecard(input)
// 1. Query orders WHERE createdAt BETWEEN startDate AND endDate for orgId
// 2. Query orders for comparison period (prior period same length if not specified)
// 3. Compute for each period:
//    - totalRevenue, totalOrders, totalUnits, avgBasketSize, avgUnitsPerTransaction
//    - totalDiscount, discountRate (totalDiscount / grossSales)
//    - grossProfit (requires product COGS — join with products collection on productId)
//    - transactionsPerDay
// 4. Compute deltas: all metrics promo vs. comparison
// 5. Estimate cannibalization: if post-period (7 days after) revenue is below trend, flag
// 6. Return PromotionScorecardResult

// Output type
interface PromotionScorecardResult {
  baseline: PeriodMetrics
  promo: PeriodMetrics
  delta: {
    revenueChangePct: number
    grossProfitChangePct: number    // KEY metric — not just revenue
    basketSizeChangePct: number
    unitsPerTransactionChangePct: number
    discountRateDelta: number       // e.g., +0.03 = 3% higher discount rate
    discountRateGrossMarginImpact: number  // discountRateDelta * -0.4 = GM impact
    transactionCountChangePct: number
  }
  verdict: 'profitable' | 'break_even' | 'margin_negative'  // based on GP delta
  verdictRationale: string          // 1-2 sentences
  benchmarkComparison: string       // vs. market discount rate target
  chartData: Array<{ period: string; revenue: number; grossProfit: number; discountRate: number }>
}

interface PeriodMetrics {
  label: string; startDate: string; endDate: string
  totalRevenue: number; totalOrders: number; totalUnits: number
  avgBasketSize: number; avgUnitsPerTransaction: number
  totalDiscount: number; discountRate: number
  grossProfit: number; grossMarginPct: number
  transactionsPerDay: number
}
```

**Tool 2: `sku_profitability_view`**
```typescript
// Input
z.object({
  category: z.string().optional(),     // filter to one category
  minContribMarginPct: z.number().optional(),  // e.g., 0.15 to find <15% margin SKUs
  topN: z.number().default(20),
  lookbackDays: z.number().default(30),
})

// Implementation:
// 1. Fetch products for orgId from tenants/{orgId}/publicViews/products/items
// 2. Fetch orders for lookbackDays to compute unitsSold per productId
// 3. Per SKU compute:
//    - netRevenue = unitsSold * price * (1 - avgDiscountRate)
//    - cogs = product.cost * unitsSold  (use product.cost or product.batchCost)
//    - grossProfit = netRevenue - cogs
//    - grossMarginPct = grossProfit / netRevenue
//    - exciseBurden = netRevenue * benchmarks.tax.stateExcisePct  (from MarketBenchmarks)
//    - contributionMargin = grossProfit - exciseBurden
//    - contributionMarginPct = contributionMargin / netRevenue
// 4. Sort by contributionMarginPct desc → heroes (top 10), drains (bottom 10 OR <15%)
// 5. Add disclaimer text about §280E (non-tax-advice)

// Output type
interface SkuProfitabilityResult {
  heroes: SkuProfit[]              // top 10 by contributionMarginPct
  drains: SkuProfit[]              // bottom 10, or all with contributionMarginPct < 0.15
  summary: {
    totalNetRevenue: number
    totalContributionMargin: number
    portfolioContribMarginPct: number
    skuCount: number
    drainsCount: number
    drainsTotalRevenuePct: number  // what % of revenue drains represent
  }
  disclaimer: string               // §280E non-tax-advice disclaimer
  benchmarkNote: string            // vs. market GM target
  chartData: Array<{ name: string; contributionMarginPct: number; revenue: number; isHero: boolean }>
}

interface SkuProfit {
  productId: string; name: string; category: string; brand: string
  price: number; cost: number | null
  unitsSold: number; netRevenue: number
  grossMarginPct: number; contributionMarginPct: number
  contributionMargin: number
  actionRecommendation: 'protect' | 'grow' | 'reprice' | 'rationalize'
}
```

**Tool 3: `inventory_health_score`**
```typescript
// Input
z.object({
  category: z.string().optional(),
})

// Implementation:
// 1. Fetch products for orgId
// 2. For each product compute daysSinceLastSale:
//    - Use product.updatedAt or product.lastSyncAt as proxy for last inventory date
//    - Use order data: find most recent order containing this productId (lookback 90 days)
//    - If no orders found in 90 days → bucket as 90+
// 3. Compute velocity: unitsSold last 7 days / 7 = units/day
// 4. Compute weeksOfCover: currentStock / max(velocity, 0.01)  (avoid div by zero)
// 5. Bucket by daysSinceLastSale:
//    - 0-30: healthy
//    - 31-60: watch (eligible for targeted promo)
//    - 61-90: action needed (markdown recommended)
//    - 90+: liquidate (vendor swap or destruction review)
// 6. Compute $ at risk = sum(currentStock * cost) per bucket

// Output type
interface InventoryHealthResult {
  buckets: {
    healthy: InventoryBucket    // 0-30 days
    watch: InventoryBucket      // 31-60 days
    action: InventoryBucket     // 61-90 days
    liquidate: InventoryBucket  // 90+ days
  }
  totalSkuCount: number
  totalDollarAtRisk: number     // sum of watch + action + liquidate $ value
  topAgingItems: InventoryItem[]  // worst 5 by daysSinceLastSale × value
  actionRules: {
    watch: string     // "Eligible for targeted promotion. Do not run blanket discount."
    action: string    // "Markdown recommended. Isolate from main promotion calendar."
    liquidate: string // "Vendor swap, bundle with fast-mover, or flag for destruction review."
  }
  chartData: Array<{ bucket: string; skuCount: number; dollarValue: number; color: string }>
}

interface InventoryBucket {
  skuCount: number
  dollarValue: number  // sum(units * cost) for this bucket
  items: InventoryItem[]
}

interface InventoryItem {
  productId: string; name: string; category: string; brand: string
  daysSinceLastSale: number; currentStock: number
  velocity: number  // units/day
  weeksOfCover: number
  dollarValue: number  // stock * cost
}
```

**Tool 4: `vendor_scorecard`**
```typescript
// Input
z.object({
  lookbackDays: z.number().default(30),
})

// Implementation (NOTE: no PO data — infer from product + order data):
// 1. Fetch products — group by product.brandName as "vendor"
// 2. Fetch orders for lookbackDays
// 3. Per vendor compute:
//    - skuCount: # of distinct products
//    - unitsSold: total units from orders
//    - revenue: sum(price * units)
//    - avgContribMarginPct: mean of per-SKU contributionMarginPct
//    - sellThroughScore: unitsSold / max(totalInventory, 1) (proxy for OTIF — how fast product moves)
//    - underperformingSkuPct: % of their SKUs with contributionMarginPct < 0.15
//    - overallScore: weighted composite (sellThrough * 0.4 + margin * 0.4 + skuCount * 0.2 normalized)
// 4. Sort by overallScore desc
// 5. Classify: top 25% = 'star', 50-75% = 'solid', 25-50% = 'watch', bottom 25% = 'review'

// Output type
interface VendorScorecardResult {
  vendors: VendorScore[]          // sorted by overallScore desc
  summary: {
    starVendors: string[]         // vendor names
    reviewVendors: string[]       // vendor names — renegotiate or replace
    portfolioSellThroughAvg: number
    portfolioMarginAvg: number
  }
  chartData: Array<{ vendor: string; sellThroughScore: number; marginScore: number; overallScore: number }>
}

interface VendorScore {
  vendorName: string; skuCount: number
  unitsSold: number; revenue: number
  avgContribMarginPct: number; sellThroughScore: number
  underperformingSkuPct: number; overallScore: number
  tier: 'star' | 'solid' | 'watch' | 'review'
  recommendation: string  // 1 sentence agent-written recommendation
}
```

**`makeAnalyticsToolsImpl(orgId)` returns:**
```typescript
{
  promotion_scorecard: async (input) => { ... return PromotionScorecardResult },
  sku_profitability_view: async (input) => { ... return SkuProfitabilityResult },
  inventory_health_score: async (input) => { ... return InventoryHealthResult },
  vendor_scorecard: async (input) => { ... return VendorScorecardResult },
}
```

### 3B. Agent wiring for Tier 2 tools

**`src/server/agents/pops.ts`** — add to tool stack:
```typescript
import { analyticsToolDefs, makeAnalyticsToolsImpl } from '@/server/tools/analytics-tools'
// In buildTools(orgId): spread analyticsToolDefs into toolsDef
// In tool executor: spread makeAnalyticsToolsImpl(orgId) into tools object
```
- Pops can now answer: "show inventory health", "vendor scorecard", "SKU profitability"

**`src/server/agents/moneymike.ts`** — add to tool stack:
- Add `analyticsToolDefs` + `makeAnalyticsToolsImpl`
- Money Mike can answer: "which SKUs are killing margins", "promotion scorecard"

**`src/server/agents/craig.ts`** — add `promotion_scorecard` only:
- Craig uses scorecard to evaluate campaigns before recommending new promotions
- System prompt addition: "Before recommending any promotion, use promotion_scorecard to review the last comparable promotion. Show the GP delta and discount rate impact."

---

## Phase 4: Tier 3 — Deebo State Compliance Matrix

### 4A. `src/server/data/state-marketing-rules/index.ts` (NEW)

```typescript
export interface MarketingRule {
  channel: string
  allowed: boolean | 'conditional'
  condition?: string      // When conditional: what's required
  audienceMinAge?: number // Default 21
  audienceCompositionRequired?: number  // e.g., 0.85 for MA (85% must be 21+)
  ageGateRequired?: boolean
  prohibitedContent: string[]
  requiredDisclosures: string[]
  citations: string[]
}

export interface StateMarketingRules {
  stateCode: string
  stateName: string
  channels: Record<string, MarketingRule>
  generalProhibitions: string[]
  loyaltyProgramRules: string
  websiteRequirements: string
  lastUpdated: string  // YYYY-MM-DD
}

export function getStateMarketingRules(stateCode: string): StateMarketingRules
export function checkMarketingCompliance(
  stateCode: string,
  channel: string,
  contentDescription: string
): { compliant: boolean; issues: string[]; verdict: string }
```

### 4B. `src/server/data/state-marketing-rules/ny.ts` (NEW)

NY rules (OCM regulations):
- Digital advertising: allowed, age gate required on website, no health claims
- SMS/Email (first-party): allowed, opt-in required, TCPA applies
- Social media (organic): allowed with required age disclaimers
- Paid social: conditional — audience 21+ targeting required, no broad reach
- OOH/Billboards: conditional — no youth-appealing content, no near schools
- Loyalty programs: allowed, no "promotion" language that implies product claims
- Prohibited: health/medical claims, cartoon/celebrity youth-appeal, product efficacy guarantees
- Website: age gate required (must verify 21+)

### 4C. `src/server/data/state-marketing-rules/ma.ts` (NEW)

MA rules (strictest in dataset — use as model for others):
- All channels require 85% 21+ audience composition with documented evidence
- Paid social/search: conditional on audience composition data proof
- Website: age gate mandatory
- No: cartoons, celebrities that appeal to youth, health claims
- Required: warning disclosures on all materials
- Promotions/loyalty: must not be "advertised" in ways that circumvent audience rules
- Citations: Massachusetts 935 CMR 500.105 advertising regulations

### 4D. `ca.ts`, `co.ts`, `il.ts` — same pattern as NY/MA

CA: DCC regulations, strong restrictions, age gate required
CO: MED regulations, 30% audience overhang rule (70% 21+)
IL: IDFPR rules, similar to CO

### 4E. Deebo system prompt addition in `src/server/agents/deebo.ts`

Add to initialize():
1. Load `getStateMarketingRules(stateCode)` from org profile state
2. Inject `STATE_MARKETING_COMPLIANCE` block:

```
=== STATE MARKETING COMPLIANCE ({STATE}) ===
When Craig or any agent proposes a marketing campaign or channel, you MUST:
1. Identify the channel (paid social, SMS, email, OOH, website, etc.)
2. Check it against {STATE} rules below
3. Return a per-channel compliance verdict: COMPLIANT | CONDITIONAL | NON-COMPLIANT
4. Cite the specific rule violated if non-compliant

CHANNEL RULES FOR {STATE}:
{channels rendered as table}

PROHIBITED CONTENT (ALL CHANNELS):
{generalProhibitions as bulleted list}

LOYALTY PROGRAM RULES:
{loyaltyProgramRules}

WEBSITE REQUIREMENTS:
{websiteRequirements}

Last updated: {lastUpdated}
=======================================
```

**New Deebo tool: `check_marketing_compliance`**
```typescript
// Input
z.object({
  channel: z.string(),           // 'paid_social', 'sms', 'email', 'ooh', 'organic_social'
  contentDescription: z.string(), // brief description of planned content/campaign
  targetAudience: z.string().optional(),
})
// Implementation: calls checkMarketingCompliance(stateCode, channel, contentDescription)
// Returns: { compliant: boolean, issues: string[], verdict: string, citations: string[] }
```

---

## Phase 5: New Artifact Types + Rendering

### 5A. Add to `src/types/inbox.ts`

**Add to `InboxArtifactType` union:**
```typescript
| 'analytics_chart'     // Recharts chart from agent analytics tool
| 'analytics_briefing'  // Morning proactive briefing
```

**Add new data types (at bottom of file):**
```typescript
export interface ChartDataKey {
  key: string           // matches key in chartData objects
  label: string         // display label
  color: string         // hex color e.g., '#22c55e'
  type?: 'line' | 'bar' // for composed charts
}

export interface ChartBenchmark {
  value: number
  label: string         // e.g., "Industry avg 21.9%"
  color: string         // e.g., '#ef4444'
}

export type AnalyticsChartType =
  | 'line' | 'bar' | 'horizontal_bar' | 'donut'
  | 'heatmap' | 'stacked_bar' | 'composed'

export interface AnalyticsChart {
  title: string
  description?: string
  chartType: AnalyticsChartType
  chartData: Record<string, unknown>[]   // Recharts-compatible data array
  dataKeys: ChartDataKey[]
  xAxisKey?: string                       // for line/bar charts
  benchmark?: ChartBenchmark
  insight: string                         // Agent-written 1-2 sentence insight
  disclaimer?: string                     // e.g., §280E disclaimer
  toolSource: 'promotion_scorecard' | 'sku_profitability_view' | 'inventory_health_score' | 'vendor_scorecard' | 'morning_briefing' | 'orders_analytics' | 'custom'
  generatedAt: string                     // ISO string
}

export interface BriefingMetric {
  title: string
  value: string
  trend: 'up' | 'down' | 'flat'
  vsLabel: string         // e.g., "vs. 12% market target"
  status: 'good' | 'warning' | 'critical'
  actionable?: string     // Short action if warning/critical
}

export interface BriefingNewsItem {
  headline: string
  source: string
  url?: string
  relevance: 'high' | 'medium'
}

export interface AnalyticsBriefing {
  date: string            // YYYY-MM-DD
  dayOfWeek: string       // e.g., 'Tuesday'
  metrics: BriefingMetric[]
  newsItems: BriefingNewsItem[]
  urgencyLevel: 'critical' | 'warning' | 'info' | 'clean'
  topAlert?: string       // Most urgent single-line alert if any
  marketContext: string   // e.g., "NY Limited License | Early Market"
}
```

**Update `InboxArtifact.data` union:**
```typescript
data: Carousel | BundleDeal | CreativeContent | QRCode | IntegrationRequest | AnalyticsChart | AnalyticsBriefing;
```

### 5B. `src/components/inbox/artifacts/analytics-chart-artifact.tsx` (NEW)

**Component:** `AnalyticsChartArtifact`
**Props:** `{ artifact: InboxArtifact; className?: string }`

Implementation:
- Cast `artifact.data as AnalyticsChart`
- Render chart using Recharts based on `chartType`:
  - `'bar'` → `<BarChart>` with `<XAxis dataKey={xAxisKey}>`, `<Bar>` per dataKey
  - `'horizontal_bar'` → `<BarChart layout="vertical">` with `<YAxis type="category">`
  - `'line'` → `<LineChart>` with `<Line>` per dataKey
  - `'donut'` → `<PieChart>` with `<Pie innerRadius={60} outerRadius={80}>`
  - `'stacked_bar'` → `<BarChart>` with `stacked` prop on each `<Bar>`
  - `'composed'` → `<ComposedChart>` mixing bars and lines
- If `benchmark` exists → render `<ReferenceLine y={benchmark.value} stroke={benchmark.color} label={benchmark.label} strokeDasharray="4 4" />`
- Render `insight` text below chart in muted foreground
- If `disclaimer` → render disclaimer in `text-xs text-muted-foreground italic`
- Use `<ResponsiveContainer width="100%" height={240}>`
- Import only from `recharts` (already installed)

### 5C. `src/components/inbox/artifacts/analytics-briefing-artifact.tsx` (NEW)

**Component:** `AnalyticsBriefingArtifact`
**Props:** `{ artifact: InboxArtifact; className?: string }`

Implementation:
- Cast `artifact.data as AnalyticsBriefing`
- Header: `{dayOfWeek}'s Briefing · {date formatted as "Feb 25"}` + urgency badge (red/amber/green/clean)
- If `topAlert` → render red alert banner at top
- Metrics grid: 2-column, each metric card shows:
  - Title (small, muted)
  - Value (large, bold)
  - Trend arrow (↑ green, ↓ red, → neutral) + vsLabel
  - Status dot (good=green, warning=amber, critical=red)
  - If `actionable` → small italic text below
- News section: titled "Industry Headlines"
  - Each item: headline + source badge + relevance dot
  - `url` → make headline a link (target="_blank")
- Market context pill at bottom: `"📍 {marketContext}"`

### 5D. Update `src/components/inbox/inbox-artifact-panel.tsx`

**Add to the artifact type switch/conditional rendering:**
```typescript
import { AnalyticsChartArtifact } from './artifacts/analytics-chart-artifact'
import { AnalyticsBriefingArtifact } from './artifacts/analytics-briefing-artifact'

// In the detail view switch:
case 'analytics_chart':
  return <AnalyticsChartArtifact artifact={selectedArtifact} />
case 'analytics_briefing':
  return <AnalyticsBriefingArtifact artifact={selectedArtifact} />
```

**Add to artifact list item rendering** — for analytics_chart and analytics_briefing:
- `analytics_chart` → icon: `BarChart2`, label: data.title
- `analytics_briefing` → icon: `Newspaper`, label: `{data.dayOfWeek}'s Briefing`

---

## Phase 6: Dashboard Analytics Widgets

### 6A. `src/server/actions/dispensary-analytics.ts` (NEW)

All functions require `requireUser()` and verify org membership.

```typescript
// Products analytics
export async function getProductsAnalytics(orgId: string): Promise<ActionResult<ProductsAnalyticsData>>

// Orders analytics
export async function getOrdersAnalytics(orgId: string): Promise<ActionResult<OrdersAnalyticsData>>

// Menu analytics
export async function getMenuAnalytics(orgId: string): Promise<ActionResult<MenuAnalyticsData>>
```

**`ProductsAnalyticsData` interface:**
```typescript
interface ProductsAnalyticsData {
  velocityData: Array<{ date: string; [category: string]: number | string }>  // 30 days, keyed by category
  marginDrains: SkuProfit[]        // top-revenue SKUs with contributionMarginPct < 0.15
  agingData: Array<{ bucket: string; skuCount: number; dollarValue: number; color: string }>
  categoryMix: Array<{ name: string; revenue: number; pct: number }>
  priceTierData: Array<{ tier: 'Value' | 'Mid' | 'Premium'; skuCount: number; revenue: number }>
  benchmarks: Pick<MarketBenchmarks, 'financial' | 'context'>
  generatedAt: string
}
```

**`OrdersAnalyticsData` interface:**
```typescript
interface OrdersAnalyticsData {
  basketSizeTrend: Array<{ date: string; avgBasket: number }>   // 30 days
  uptTrend: Array<{ date: string; avgUnitsPerTransaction: number }>  // 30 days
  discountRateTrend: Array<{ date: string; discountRate: number }>   // 30 days
  peakHourHeatmap: Array<{ hour: number; dayOfWeek: number; transactionCount: number }>
  onlineVsInStoreSplit: Array<{ name: string; value: number }>  // [{name:'Online',value:X},{name:'In-Store',value:Y}]
  promoLiftData?: Array<{ period: string; revenue: number; grossProfit: number }>
  industryDiscountBenchmark: number  // from MarketBenchmarks, e.g., 0.219 or 0.15 for NY
  marketDiscountTarget: number       // market-adjusted target
  generatedAt: string
}
```

**`MenuAnalyticsData` interface:**
```typescript
interface MenuAnalyticsData {
  categoryPerformance: Array<{
    category: string
    revenue: number
    marginPct: number
    velocity: number        // units/day
    daysOnHand: number
    skuCount: number
  }>
  skuRationalizationFlags: Array<{
    productId: string; name: string; category: string
    daysSinceLastSale: number; velocity: number
    action: 'markdown' | 'liquidate'
    estimatedAtRisk: number  // $ value
  }>
  priceTierDistribution: Array<{
    tier: string; minPrice: number; maxPrice: number
    skuCount: number; revenuePct: number
  }>
  generatedAt: string
}
```

**Price tier classification (for priceTierData):**
- Value: price < $20
- Mid: $20 ≤ price < $50
- Premium: price ≥ $50

### 6B. `src/app/dashboard/products/components/analytics-tab.tsx` (NEW)

**Component:** `ProductsAnalyticsTab`
**Props:** `{ orgId: string }`

Widgets (use Recharts, `'use client'`):
1. **Velocity Chart** — LineChart, x=date, lines per category, height=200, no legend clutter (top 3 categories only)
2. **Margin Drain Alert** — Table: Name | Category | Revenue | Contrib Margin % (red badge if <15%) | Action ("Reprice" or "Rationalize" button stub)
3. **Inventory Aging** — BarChart, x=bucket label, y=dollarValue, colors: green/yellow/orange/red for healthy/watch/action/liquidate
4. **Category Mix** — PieChart (donut), segments by category revenue
5. **Price Tier Distribution** — horizontal BarChart, tiers on y-axis

Data loading: client-side `useEffect` calling `getProductsAnalytics(orgId)`.
Loading state: Skeleton components from ShadCN.
Error state: Alert component.
Each widget has "Ask Pops →" button that opens: `window.location.href = '/dashboard/inbox?message=...'` with pre-filled context.

### 6C. Integrate into products page

In `src/app/dashboard/products/page.tsx` — pass `orgId` to client component.
In products client component (`src/app/dashboard/products/components/products-client.tsx` or `ProductsDataTable` wrapper) — add `Tabs` with:
- "Products" tab (existing table)
- "Analytics" tab (`<ProductsAnalyticsTab orgId={orgId} />`)

### 6D. `src/app/dashboard/orders/components/analytics-tab.tsx` (NEW)

**Component:** `OrdersAnalyticsTab`
**Props:** `{ orgId: string }`

Widgets:
1. **Basket Size Trend** — LineChart 30 days. No benchmark line needed (basket size is internal target).
2. **Discount Rate Trend** — LineChart 30 days. TWO reference lines:
   - Dashed red: `industryDiscountBenchmark` (national 21.9% or market avg) labeled "National avg"
   - Dashed amber: `marketDiscountTarget` (e.g., 12% for NY limited) labeled "Your market target"
   - This is THE most important chart in the whole system.
3. **Units Per Transaction Trend** — LineChart 30 days
4. **Peak Hour Heatmap** — Custom grid: 7 columns (Mon-Sun) × 18 rows (6am-midnight), cell color = transaction count intensity (low=slate-100, high=green-600), sized 14px × 14px cells
5. **Online vs In-Store Split** — PieChart (donut), only if online data exists (hide if both values 0)

Data loading: same pattern as products tab.

### 6E. Integrate into orders page

In `src/app/dashboard/orders/page.tsx` and `OrdersPageClient` — add Tabs:
- "Orders" tab (existing content)
- "Analytics" tab (`<OrdersAnalyticsTab orgId={orgId} />`)

### 6F. `src/app/dashboard/menu/components/analytics-tab.tsx` (NEW)

**Component:** `MenuAnalyticsTab`
**Props:** `{ orgId: string }`

Widgets:
1. **Category Performance Table** — sortable table: Category | Revenue | Margin % | Velocity (units/day) | Days On Hand | SKU Count. Color-code Margin %: green ≥55%, amber 40-55%, red <40%.
2. **SKU Rationalization Flags** — alert-style list (amber/red) of flagged SKUs: Name | Days Since Last Sale | Action badge (Markdown/Liquidate). Empty state: green "All SKUs healthy" message.
3. **Price Tier Distribution** — Stacked bar (horizontal): each tier as a row, width proportional to revenuePct. Labels show SKU count and revenue %.

### 6G. Integrate into menu page

Menu page already has tabs. Add "Analytics" tab:
- In `src/app/dashboard/menu/page.tsx` — pass `orgId` to client
- In `src/app/dashboard/menu/menu-client.tsx` (or equivalent) — add tab:
  - New tab value: `'analytics'`
  - Tab label: "Analytics" with `BarChart2` icon
  - Tab content: `<MenuAnalyticsTab orgId={orgId} />`

---

## Phase 7: Morning Briefing Cron

### 7A. `src/server/services/morning-briefing.ts` (NEW)

```typescript
export async function generateMorningBriefing(orgId: string): Promise<AnalyticsBriefing>
```

**Implementation:**
1. Get `benchmarks = await getMarketBenchmarks(orgId)`
2. Get `ordersAnalytics = await getOrdersAnalytics(orgId)` — yesterday's metrics
3. Get `productsAnalytics = await getProductsAnalytics(orgId)` — margin drains + aging
4. Fetch cannabis industry news via Jina: `jinaSearch('cannabis dispensary industry news ' + benchmarks.context.stateCode + ' 2026')` — take top 3 results, extract headline + source
5. Build `metrics: BriefingMetric[]`:
   - **Net Sales Yesterday**: compute from yesterday's orders vs. 7-day avg
   - **Discount Rate (7-day avg)**: compare to `benchmarks.financial.discountRateTarget` → status: good if below target, warning if within 3%, critical if above
   - **Top Margin Drain**: name of worst contributionMarginPct SKU from productsAnalytics.marginDrains[0]
   - **Inventory At Risk**: sum $ value of products in 60+ day aging bucket
   - **Active SKU Count**: total products in catalog
6. Set `urgencyLevel`:
   - 'critical' if any metric is 'critical'
   - 'warning' if any metric is 'warning'
   - 'info' if all 'good' but news items are high relevance
   - 'clean' otherwise
7. Set `topAlert` if discountRate > target + 0.05 (5% above target): "⚠️ Discount rate {X}% is above your {target}% market target — {GP impact} est. gross margin impact"
8. Return `AnalyticsBriefing` object

```typescript
export async function postMorningBriefingToInbox(orgId: string): Promise<void>
```

**Implementation:**
1. Call `generateMorningBriefing(orgId)`
2. Create inbox artifact via Firestore Admin SDK:
   - `type: 'analytics_briefing'`
   - `data: briefing`
   - `status: 'approved'`  (briefings are pre-approved — no review needed)
   - `threadId`: find or create a dedicated "Daily Briefing" thread for this org
     - Query `inbox_threads` WHERE `orgId == orgId AND metadata.isBriefingThread == true` LIMIT 1
     - If not found: create thread with `{ orgId, agentId: 'pops', title: '📊 Daily Briefing', metadata: { isBriefingThread: true } }`
   - `rationale`: "Proactive daily briefing generated at 8 AM"
   - `createdBy: 'system'`

### 7B. `src/app/api/cron/morning-briefing/route.ts` (NEW)

```typescript
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response>
export async function GET(request: Request): Promise<Response>  // for manual testing
```

**Implementation:**
1. Auth: `requireCronSecret(request)` — return early if fails
2. Query all active orgs: `users` collection WHERE `role IN ['dispensary_admin', 'brand_admin']` — collect unique `orgId` values
3. For each orgId (limit 50 concurrent — use `Promise.allSettled` in batches of 10):
   - Call `postMorningBriefingToInbox(orgId)`
   - Log success/failure per org
4. Return `{ success: true, orgsProcessed: N, errors: [...] }`

**Cloud Scheduler job (manual creation by user):**
- Name: `morning-briefing`
- Schedule: `0 13 * * *` (8 AM EST = 1 PM UTC)
- URL: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/morning-briefing`
- Method: POST
- Auth: Bearer `${CRON_SECRET}`

---

## Exact Test Cases

### Phase 1 Tests (`tests/market-benchmarks.test.ts`)
```typescript
it('NY limited license returns correct discount target', async () => {
  const result = getMarketBenchmarksSync('NY', 'limited')
  expect(result.financial.discountRateTarget).toBe(0.12)
  expect(result.context.licenseType).toBe('limited')
  expect(result.context.marketMaturity).toBe('early')
})

it('CA unlimited returns national-level discount target', async () => {
  const result = getMarketBenchmarksSync('CA', 'unlimited')
  expect(result.financial.discountRateTarget).toBeGreaterThan(0.16)
  expect(result.context.competitionDensity).toBe('high')
})

it('unknown state returns national default', () => {
  const result = getMarketBenchmarksSync('XX')
  expect(result.context.licenseType).toBe('unknown')
  expect(result.financial.discountElasticity).toBe(-0.4)
})

it('buildBenchmarkContextBlock contains required sections', () => {
  const block = buildBenchmarkContextBlock(NY_LIMITED_BENCHMARKS)
  expect(block).toContain('LIMITED LICENSE')
  expect(block).toContain('21.9%')    // always show national avg for context
  expect(block).toContain('12%')      // NY target
  expect(block).toContain('-0.4%')    // elasticity rule
  expect(block).toContain('§280E')
})
```

### Phase 3 Tests (`tests/analytics-tools.test.ts`)
```typescript
it('promotion_scorecard returns profitable verdict when GP increased', async () => {
  // Mock orders: promo period has higher GP than baseline
  const result = await tools.promotion_scorecard({ startDate: '2026-02-01', endDate: '2026-02-07' })
  expect(result).toHaveProperty('verdict')
  expect(['profitable', 'break_even', 'margin_negative']).toContain(result.verdict)
  expect(result.delta.discountRateGrossMarginImpact).toBe(result.delta.discountRateDelta * -0.4)
})

it('sku_profitability_view adds §280E disclaimer', async () => {
  const result = await tools.sku_profitability_view({})
  expect(result.disclaimer).toContain('§280E')
  expect(result.disclaimer).toContain('not tax advice')
})

it('inventory_health_score buckets sum to total SKU count', async () => {
  const result = await tools.inventory_health_score({})
  const total = result.buckets.healthy.skuCount + result.buckets.watch.skuCount +
                result.buckets.action.skuCount + result.buckets.liquidate.skuCount
  expect(total).toBe(result.totalSkuCount)
})

it('vendor_scorecard tiers cover all four categories', async () => {
  const result = await tools.vendor_scorecard({})
  const tiers = result.vendors.map(v => v.tier)
  expect(tiers.length).toBeGreaterThan(0)
  expect(['star', 'solid', 'watch', 'review'].every(t =>
    tiers.includes(t) || result.vendors.length < 4  // small vendor count = ok not to have all tiers
  )).toBe(true)
})
```

### Phase 4 Tests (`tests/state-marketing-rules.test.ts`)
```typescript
it('MA requires 85% audience composition for all advertising', () => {
  const rules = getStateMarketingRules('MA')
  const paidSocial = rules.channels['paid_social']
  expect(paidSocial.audienceCompositionRequired).toBe(0.85)
})

it('checkMarketingCompliance returns non-compliant for health claims', () => {
  const result = checkMarketingCompliance('NY', 'email', 'Email about our medical-grade flower that treats anxiety')
  expect(result.compliant).toBe(false)
  expect(result.issues.length).toBeGreaterThan(0)
})

it('compliant email campaign passes', () => {
  const result = checkMarketingCompliance('NY', 'sms', 'Weekend deal on top shelf flower. 21+ only. Reply STOP to unsubscribe.')
  expect(result.compliant).toBe(true)
})
```

---

## Rollback Plan

Each phase is independently committable. To rollback any phase:
- **Phase 1-4:** Revert agent initialize() calls — agents work without benchmarks (non-breaking)
- **Phase 5:** Revert `inbox.ts` type additions + remove artifact panel cases
- **Phase 6:** Remove analytics tab from pages — existing tabs unaffected
- **Phase 7:** Disable Cloud Scheduler job — no code change needed

---

## File Change Summary

### New Files (17)
1. `src/types/market-benchmarks.ts`
2. `src/server/services/market-benchmarks.ts`
3. `src/server/tools/analytics-tools.ts`
4. `src/server/data/state-marketing-rules/index.ts`
5. `src/server/data/state-marketing-rules/ny.ts`
6. `src/server/data/state-marketing-rules/ca.ts`
7. `src/server/data/state-marketing-rules/ma.ts`
8. `src/server/data/state-marketing-rules/co.ts`
9. `src/server/data/state-marketing-rules/il.ts`
10. `src/components/inbox/artifacts/analytics-chart-artifact.tsx`
11. `src/components/inbox/artifacts/analytics-briefing-artifact.tsx`
12. `src/server/actions/dispensary-analytics.ts`
13. `src/app/dashboard/products/components/analytics-tab.tsx`
14. `src/app/dashboard/orders/components/analytics-tab.tsx`
15. `src/app/dashboard/menu/components/analytics-tab.tsx`
16. `src/server/services/morning-briefing.ts`
17. `src/app/api/cron/morning-briefing/route.ts`

### Modified Files (12)
1. `src/types/inbox.ts` — add analytics_chart, analytics_briefing types + data union
2. `src/server/agents/pops.ts` — benchmark injection + analyticsToolDefs
3. `src/server/agents/moneymike.ts` — benchmark injection + analyticsToolDefs
4. `src/server/agents/craig.ts` — benchmark injection + promotion_scorecard + discount discipline rule
5. `src/server/agents/smokey.ts` — benchmark injection
6. `src/server/agents/mrs-parker.ts` — benchmark injection
7. `src/server/agents/ezal.ts` — benchmark injection
8. `src/server/agents/deebo.ts` — state compliance matrix + check_marketing_compliance tool
9. `src/components/inbox/inbox-artifact-panel.tsx` — add analytics_chart + analytics_briefing cases
10. `src/app/dashboard/products/page.tsx` or client component — add Analytics tab
11. `src/app/dashboard/orders/page.tsx` + `OrdersPageClient` — add Analytics tab
12. `src/app/dashboard/menu/` client component — add Analytics tab

### Manual Post-Deploy Step
Create Cloud Scheduler job `morning-briefing` (schedule: `0 13 * * *`, POST to `/api/cron/morning-briefing`, Bearer CRON_SECRET).
