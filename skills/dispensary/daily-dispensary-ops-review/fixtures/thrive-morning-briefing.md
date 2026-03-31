# Fixture: Morning Briefing — Thrive Syracuse

**Skill:** daily-dispensary-ops-review
**Skill version:** 0.1.0
**Fixture type:** trigger + output quality test
**Status:** eval-ready

---

## Input

```json
{
  "org_id": "org_thrive_syracuse",
  "store": "Thrive Syracuse",
  "date": "2026-03-30",
  "baseline_window": "prior_7_day_avg",
  "data": {
    "revenue": 2772,
    "revenue_baseline": 4200,
    "transactions": 274,
    "transactions_baseline": 380,
    "avg_basket": 10.12,
    "avg_basket_baseline": 10.45,
    "top_skus": [
      {"name": "Off Hours - Blue Dream 1g Pre-Roll", "revenue": 480, "units": 48},
      {"name": "Kiefer's - Gummies 10mg 10pk", "revenue": 310, "units": 31},
      {"name": "NY-Licensed Vape Cart 1g", "revenue": 290, "units": 29}
    ],
    "out_of_stock": ["House Blend Flower - 3.5g"],
    "active_campaigns": [],
    "loyalty_enrollments_today": 2,
    "loyalty_enrollments_baseline": 3.1,
    "loyalty_points_earned": 2510,
    "loyalty_points_redeemed": 140,
    "day_of_week": "Sunday",
    "store_hours_today": "11:00-18:00",
    "store_hours_standard": "10:30-20:00",
    "pos_sync_status": "complete"
  }
}
```

---

## Expected Output Characteristics

**PASS criteria:**
- [ ] Compares to prior Sundays (not just 7-day avg) or flags Sunday as a variable
- [ ] Notes shortened Sunday hours as a likely driver of lower traffic
- [ ] Flags out-of-stock on House Blend Flower as an action item
- [ ] Notes no active campaign (and implies opportunity)
- [ ] Basket size held flat — correctly attributes revenue drop to traffic, not basket
- [ ] Loyalty earn/redeem ratio noted (2510 earned vs 140 redeemed = low redemption signal)
- [ ] Keeps memo to 200–350 words
- [ ] Top actions section has ≤3 items with owners

**FAIL criteria:**
- [ ] Calls the revenue drop a "declining trend" from a single Sunday data point
- [ ] Recommends a discount campaign without diagnosis first
- [ ] Ignores Sunday hours context entirely
- [ ] Lists 5+ action items (violates bounded-actions rule)
- [ ] Fabricates a root cause (e.g., "competitor promotion") not in evidence

---

## Reference Output (passing example)

```
## Daily Ops Review — Thrive Syracuse — Sunday March 30, 2026

REVENUE: $2,772 (−34% vs 7-day avg)
TRANSACTIONS: 274 (−28%)
AVG BASKET: $10.12 (−3%, flat)
DATA QUALITY: Complete — POS sync current

### Top Actions Today
| # | Action | Owner | Urgency |
|---|--------|-------|---------|
| 1 | Restock House Blend Flower — out of stock, top-revenue category | Operator | Today |
| 2 | Pull last 4 Sundays' revenue to confirm whether this is seasonal baseline | Pops | This Week |
| 3 | No campaign sent in 12 days — window open for loyalty or winback push | Craig | This Week |

### Performance Snapshot
**Revenue & Traffic:** Revenue and transactions both down ~30%, but average basket held flat at $10.12
— the drop is entirely traffic-driven, not a basket size problem. Sunday hours (11 AM–6 PM vs standard
10:30 AM–8 PM) reduce trading time by 2.5 hours and likely account for much of the gap.

**Menu:** Off Hours Blue Dream and Kiefer's Gummies led revenue. House Blend Flower is out of stock —
restock today to avoid losing sales on a consistently popular SKU.

**Promos:** No active campaign. 12 days since last outreach — at-risk and dormant segments are cooling.

**Loyalty:** 2 new enrollments (baseline ~3). 2,510 points earned vs 140 redeemed — redemption rate is
low, which may mean customers aren't aware of their balance.

### Anomalies
- Revenue −34% vs 7-day avg (Monitor — likely Sunday pattern; confirm with historical Sunday data)

### Tomorrow's Watch List
- Confirm House Blend Flower restock before Monday open
- Monday revenue vs prior Monday to check if Sunday was an outlier
```
