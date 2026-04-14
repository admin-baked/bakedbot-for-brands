# COGS Coverage Improvement Plan — Thrive Syracuse

**Date:** April 14, 2026  
**Status:** Draft  
**Current State:** 448/1,251 SKUs (36%) have COGS data | 137 in-stock products missing COGS

---

## Problem Statement

Only 36% of Thrive Syracuse product documents contain cost/batchCost data from Alleaves POS. This means:
- **137 in-stock products** ($57,248 at retail) have NO cost basis for profitability analysis
- **666 dead SKUs** clutter the catalog with no stock AND no cost
- Inventory valuation at cost ($37,111) is a significant understatement if the 137 missing-COGS items have real cost
- Margin analysis is unreliable for 64% of the catalog

---

## Root Causes of Missing COGS

1. **Alleaves sync only pulls cost for products purchased through PO module** — products received outside the formal PO process (distributor samples, transfers, manual receiving) don't get cost data
2. **Cost field is populated by batch assignment** — if a product was never assigned to a batch in Alleaves, it has no `cost` or `batchCost`
3. **New products synced before first PO** — menu sync adds products immediately, but cost data only flows after the first purchase order

---

## Plan: Phase 1 — Immediate (This Week)

### 1A. Add COGS coverage metrics to dashboard
- **What:** Expose `productsWithCogs` / `productsWithoutCogs` from `getProductProfitabilityData()` in the dashboard UI
- **Where:** Profitability tab → show a "COGS Coverage" badge (e.g., "36% — 137 products missing cost data")
- **File:** `src/server/actions/profitability.ts` — already added `costAnomaly` field in this fix

### 1B. Backfill cost data from Alleaves purchase history
- **What:** Write a one-time script to query Alleaves PO/receiving history for all products missing `cost` and backfill `batchCost` in Firestore
- **How:** Use Alleaves API to fetch `products/{productId}/batches` — extract latest batch cost
- **Script:** `scratch/backfill-thrive-cogs.cjs` (to be created)
- **Expected result:** COGS coverage goes from 36% → ~70-80%

### 1C. Flag suspicious cost data (already done)
- ✅ `cost_exceeds_retail` — flags items where COGS > retail price (case pricing)
- ✅ `negative_margin` — flags items where margin < 5%
- ✅ `gift_card` — flags non-merchandise items

---

## Plan: Phase 2 — Short-term (Next 2 Weeks)

### 2A. Add cost fallback: estimated COGS from margin analysis
- **What:** For products without `cost` or `batchCost`, estimate cost using category-average margins
- **How:** Calculate avg margin per category from products WITH COGS, then apply: `estimatedCost = retailPrice × (1 - avgCategoryMargin)`
- **Where:** `getProductProfitabilityData()` — add `estimatedCost` field alongside `effectiveCost`
- **Benefits:** 100% of in-stock products get a cost basis (with confidence flag)

### 2B. Clean up dead SKUs
- **What:** Archive the 666 products that have zero stock AND zero cost
- **How:** Add `archived: true` flag or move to a subcollection
- **Benefits:** Cleaner catalog, more accurate COGS coverage percentage

### 2C. Normalize category names
- **What:** Fix duplicate categories (e.g., "Pre-Rolls" vs "Pre rolls", "Flower" vs "flower")
- **Current:** 22 categories where many are casing duplicates
- **Target:** 9 canonical categories
- **How:** Add category normalization map in the product sync pipeline

---

## Plan: Phase 3 — Long-term (Next Month)

### 3A. Real-time COGS sync from Alleaves
- **What:** Modify the Alleaves sync webhook to pull cost data on every product update
- **Current:** Sync pulls name, price, category, stockCount, images — but NOT cost
- **Change:** Add `cost` and `batchCost` fields to the Alleaves sync mapping
- **File:** `src/server/services/cannmenus.ts` or Alleaves-specific sync

### 3B. PO-level cost tracking
- **What:** Store cost history per product over time (not just current cost)
- **How:** Add `costHistory: [{ date, cost, source }]` subcollection
- **Benefits:** Trend analysis, shrink detection, vendor cost comparison

### 3C. Cost anomaly alerting
- **What:** Send alerts when cost data looks wrong (e.g., pre-roll at $200)
- **How:** Nightly job that flags `cost_exceeds_retail` items → Slack/email notification
- **Integration:** Use existing `scripts/nightly-dashboard-qa.mjs` infrastructure

---

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 3 Target |
|--------|---------|---------------|---------------|
| COGS Coverage | 36% | 75% | 95%+ |
| Cost Anomalies | Unknown (flagged) | Reviewed by owner | Auto-corrected |
| Dead SKUs | 666 | Archived | Purged |
| Inventory Accuracy | ~$37K (cost) | ~$50-60K (cost) | ~$55-65K (cost) |

---

## Owner Action Items

The following require Thrive Syracuse owner input:

1. **Review flagged cost anomalies** — especially the High Peaks Pre Roll at $200/unit (likely a case price)
2. **Confirm which products are actually in stock** — Alleaves `stockCount` may not match physical counts
3. **Provide historical PO data** — if Alleaves PO module wasn't used, we need another cost source
4. **Approve dead SKU archival** — confirm 666 zero-stock items can be hidden from dashboards
+++++++ REPLACE