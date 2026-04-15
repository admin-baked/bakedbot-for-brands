# Deliberative Pipeline Audit — Anti-Hallucination Coverage

> Audited: 2026-04-14 | Uncle Elroy v1 → now extending to full platform

## Executive Summary

The Deliberative Pipeline (Uncle Elroy ↔ Money Mike) currently only covers **inventory valuation** and **COGS audits**. After auditing the full codebase, I identified **8 additional high-risk areas** where agents or services produce claims without adversarial verification — creating hallucination vectors that could surface inflated numbers, wrong tax liability, or fabricated recommendations to dispensary owners.

---

## Current Coverage ✅

| Area | Pipeline Hook | Status |
|------|--------------|--------|
| Inventory Valuation | `runInventoryDeliberation()` | ✅ Active |
| COGS Data Quality | `runCOGSAudit()` | ✅ Active |
| Inventory Audit (standalone) | `runInventoryAudit()` | ✅ Active |

## Identified Gaps ❌ → Priority Implementation

### 1. 🔴 Profitability Dashboard — Estimated COGS (HIGH)
**File:** `src/server/actions/profitability.ts`
**Risk:** `getProductProfitabilityData()` Phase 2A estimates COGS using category-average margins when real cost data is missing. If 2+ products have bad cost data in a category, the average is wrong → ALL estimated costs in that category are wrong → inventory valuation and margin calculations are hallucinated.
**Fix:** Add `runCOGSEstimationAudit()` — verify estimated costs against known distribution ranges per category.

### 2. 🔴 Pricing Recommendations — Untethered Market Averages (HIGH)
**File:** `src/server/services/pricing.ts`
**Risk:** `generatePricingRecommendations()` computes market averages from Firestore products. If duplicates exist or categories are wrong, recommendations suggest wrong prices. No adversarial check before storing recommendations.
**Fix:** Add `runPricingRecommendationDeliberation()` — verify market stats against raw data before generating recommendations.

### 3. 🔴 Cannabis Tax Calculations — Bad COGS Inflation (HIGH)
**File:** `src/server/services/cannabis-tax.ts`
**Risk:** `calculate280EAnalysis()` and `calculateNYTaxSummary()` use COGS data directly. If COGS is inflated (same bug that caused $144K inventory), tax calculations are wrong → owner makes wrong financial decisions.
**Fix:** Add `runTaxCalculationGuard()` — verify COGS coverage meets minimum threshold before returning tax calculations.

### 4. 🟡 Working Capital Analysis — Hardcoded Assumptions (MEDIUM)
**File:** `src/server/actions/profitability.ts` → `getThriveProfitabilityDashboard()`
**Risk:** Thrive Syracuse config hardcodes: 3500 sqft, 12 employees, $1800 banking fees, 45% tax reserve. These feed directly into working capital analysis without verification.
**Fix:** Add `runWorkingCapitalGuard()` — flag when using hardcoded vs. actual config values.

### 5. 🟡 Menu Sync — No Adversarial Validation (MEDIUM)
**File:** `src/server/services/cannmenus.ts`
**Risk:** POS sync writes products to Firestore without checking for duplicates, price anomalies, or category consistency. Bad data enters the system at the source.
**Fix:** Add `runMenuSyncGuard()` — validate incoming sync data before writing to Firestore.

### 6. 🟡 Chatbot Responses — Unverified Product Claims (MEDIUM)
**File:** `src/ai/chat-query-handler.ts`
**Risk:** The chatbot generates responses about products. While the prompt says "Do NOT make medical claims," there's no data-grounding check — the LLM could hallucinate prices, stock levels, or effects that don't match actual product data.
**Fix:** Add grounding constraint to prompt — inject actual product data into response context.

### 7. 🟢 Agent Claims — No Cross-Verification (LOW-MEDIUM)
**Files:** `src/server/agents/smokey.ts`, `pops.ts`, `craig.ts`, `bigworm.ts`
**Risk:** Each agent produces claims independently. Pops says "sales are up 15%" — no one challenges the baseline. Craig creates campaigns with "our #1 seller" — no one verifies.
**Fix:** Add `runAgentClaimVerification()` — Uncle Elroy spot-checks agent claims against raw data.

### 8. 🟢 Product Recommendations — Stale/Wrong Data (LOW)
**File:** `src/ai/ai-powered-product-recommendations.ts`
**Risk:** Recommendations based on stale embeddings or wrong product metadata.
**Fix:** Add freshness check before generating recommendations.

---

## Implementation Priority

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| **Phase 1** (Now) | #1 COGS Estimation, #3 Tax Guard | 2h | Prevents financial hallucinations |
| **Phase 2** (This week) | #2 Pricing, #4 Working Capital | 2h | Prevents bad recommendations |
| **Phase 3** (Next sprint) | #5 Menu Sync, #6 Chatbot | 3h | Prevents bad data entry |
| **Phase 4** (Ongoing) | #7 Agent Claims, #8 Recommendations | 4h | Systemic improvement |

---

## Architecture: Extended Pipeline

```
                    ┌─────────────────────────────────┐
                    │     DELIBERATIVE PIPELINE        │
                    │     (Uncle Elroy's Domain)       │
                    └──────────┬──────────────────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────────┐
        │          │           │           │              │
   ┌────▼────┐ ┌──▼───┐ ┌────▼────┐ ┌────▼────┐ ┌──────▼──────┐
   │Inventory│ │ COGS │ │  Tax    │ │ Pricing │ │ Working     │
   │Audit    │ │Est.  │ │  Guard  │ │ Recomm. │ │ Capital     │
   │ ✅ Done │ │ NEW  │ │  NEW    │ │ NEW     │ │ Guard NEW   │
   └─────────┘ └──────┘ └─────────┘ └─────────┘ └─────────────┘
```

Each guard follows the same pattern:
1. **Assert** — The producing agent/service makes a claim
2. **Challenge** — Uncle Elroy runs raw data queries
3. **Evidence** — Produce audit artifact with proof
4. **Verdict** — TRUST / DON'T_TRUST / VERIFY_AGAIN