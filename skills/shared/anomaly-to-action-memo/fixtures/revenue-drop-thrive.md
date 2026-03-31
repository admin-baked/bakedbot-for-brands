# Fixture: Revenue Drop — Thrive Syracuse

**Skill:** anomaly-to-action-memo
**Skill version:** 0.1.0
**Fixture type:** trigger + output quality test
**Status:** eval-ready

---

## Input

```json
{
  "signal": "Daily revenue dropped 34% vs prior 7-day average",
  "metric": "daily_revenue",
  "direction": "down",
  "magnitude": "-34%",
  "time_window": "2026-03-30",
  "baseline": "$4,200 avg daily revenue (prior 7 days)",
  "actual": "$2,772",
  "org_id": "org_thrive_syracuse",
  "store": "Thrive Syracuse",
  "related_data": [
    "Traffic also down 28% (380 → 274 transactions)",
    "Average basket size roughly flat ($10.45 → $10.12)",
    "No promotional campaigns active",
    "Sunday — store hours 11 AM–6 PM (shorter than weekday)"
  ]
}
```

---

## Expected Output Characteristics

**PASS criteria:**
- [ ] Urgency classified as "This Week" or "Monitor" (not Immediate — single-day, may be Sunday pattern)
- [ ] Identifies Sunday hours as a likely contributing cause (evidence-based)
- [ ] Traffic decline flagged as the primary driver vs basket size change
- [ ] Does NOT fabricate a root cause with certainty (e.g., "competitor opened" — not in evidence)
- [ ] Recommends comparing to prior Sundays, not just 7-day rolling average
- [ ] Confidence labeled Medium or lower given single data point
- [ ] Does not recommend a campaign without first diagnosing root cause

**FAIL criteria:**
- [ ] States "revenue is declining" as a trend from one data point
- [ ] Recommends a discount campaign without further analysis
- [ ] Confidence labeled High on a single-day anomaly
- [ ] Fabricates competitor activity as cause

---

## Reference Output (passing example)

```
## Action Memo — Daily Revenue Drop — Thrive Syracuse — 2026-03-30

URGENCY: Monitor
CONFIDENCE: Medium — single data point; Sunday hours are a known variable

IMPACTED METRIC: Daily revenue −34% vs 7-day average ($4,200 → $2,772)

### What Happened
Revenue and transaction count both dropped sharply on Sunday March 30. Average basket
size held roughly flat, so the decline is driven by fewer customers, not smaller purchases.

### Evidence
- Confirmed: 380 → 274 transactions (−28%)
- Confirmed: Avg basket $10.45 → $10.12 (−3%, flat within noise)
- Confirmed: No active promotions
- Context: Sunday hours 11 AM–6 PM vs 10:30 AM–8 PM weekdays (−2.5 hours)

### Likely Causes
1. Sunday shortened hours (evidence-based) — 2.5 fewer hours of trading time accounts for
   a significant portion of the gap; prior Sundays should confirm if this is baseline
2. One-day demand fluctuation (inferred) — single data point; may be within normal Sunday variance
3. External factor (unconfirmed) — weather, local event, or area disruption not yet investigated

### Business Impact
~$1,428 below average. If this is a Sunday pattern, annualized impact is ~$74,000 — worth
understanding but not necessarily a problem to fix beyond hours optimization.

### Recommended Actions
| # | Action | Owner | Urgency |
|---|--------|-------|---------|
| 1 | Pull last 4 Sundays' revenue to establish Sunday baseline | Pops | This week |
| 2 | If Sunday baseline confirms structural gap: evaluate extended Sunday hours | Operator | This week |

### Monitor
Watch next Sunday (April 6). If revenue again < $3,000, escalate to Immediate and run
full traffic + campaign analysis.
```
