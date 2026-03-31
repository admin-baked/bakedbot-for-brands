---
name: daily-dispensary-ops-review
description: Review daily dispensary sales, margin, promo performance, traffic, menu movement, and operational anomalies to produce a concise store operations memo with prioritized actions. Use when a store needs its daily performance interpreted and surfaced for operator review. Trigger phrases: "how did we do today", "daily ops review", "store performance", "what happened yesterday", "daily summary", "morning briefing".
version: 0.1.0
owner: ops-intelligence
agent_owner: pops
allowed_roles:
  - super_user
  - dispensary_operator
outputs:
  - operations_memo
  - anomaly_summary
downstream_consumers:
  - super_user inbox
  - craig (if campaign action flagged)
  - ezal (if competitor context needed)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Daily Dispensary Ops Review

## Purpose
Give a dispensary operator a fast, opinionated read of yesterday's performance — what moved, what
didn't, what needs action today — so they can run the store, not dig through dashboards.

## When to Use
- Morning briefing playbook fires (daily, ~7 AM local time)
- Operator manually asks for yesterday's or today's store performance
- A metric alert fires and needs context before routing to an action memo
- End-of-day check before closing

## When NOT to Use
- **Weekly or multi-period trend analysis** → use `executive-brief` with a wider date range
- **Competitor performance** → route to Ezal for competitive context
- **Campaign performance deep-dive** → route to `low-performing-promo-diagnosis`
- **Loyalty segment health** → route to `loyalty-reengagement-opportunity-review`
- **Technical issues (POS sync errors, missing data)** → route to Linus before interpreting numbers

## Required Inputs
- `org_id` — required
- `date` — the review date; default: yesterday
- `store` — store name (for multi-location orgs)
- `baseline_window` — comparison period; default: prior 7-day average

## Reasoning Approach

Work through five performance dimensions in order. Each one can independently surface an action.

**1. Revenue & traffic**
- Total revenue vs baseline (7-day avg, same weekday prior week)
- Transaction count vs baseline
- Average basket size vs baseline
- Basket drives can reveal product mix shifts even when traffic is flat

**2. Menu performance**
- Top 5 SKUs by revenue vs prior period — anything surprising?
- Any category with significant velocity change (vapes up, flower down)?
- Out-of-stock flags that likely cost sales

**3. Promotional impact**
- Was any campaign active? Track: send → open → transaction (attributed revenue)
- Promo redemption rate vs expected
- Unintended margin drag from broad discounts

**4. Loyalty signals**
- Points earned vs redeemed ratio — high earn + low redeem = program not landing
- New enrollments today vs daily average
- Any loyalty tier drops (champion → engaged) in last 24 hours

**5. Anomalies**
- Any metric > 15% above or below its baseline → flag as anomaly, assess urgency
- Cross-dimension: traffic up but revenue flat → basket size problem or product mix issue
- Apply URGENCY tier: Immediate (act today) / This Week / Monitor

**Confidence rule:** If any input data is incomplete or POS sync was delayed, state it and reduce
confidence on affected dimensions. Never fill gaps with assumptions.

## Output Contract

```
## Daily Ops Review — [Store] — [Date]

REVENUE: $X,XXX ([+/-]X% vs baseline)
TRANSACTIONS: N ([+/-]X%)
AVG BASKET: $XX.XX ([+/-]X%)
DATA QUALITY: [Complete / POS lag noted on: ...]

### Top Actions Today
| # | Action | Owner | Urgency |
|---|--------|-------|---------|
| 1 | ...    | ...   | ...     |

### Performance Snapshot
**Revenue & Traffic:** [2 sentences — what moved and why]
**Menu:** [1–2 sentences — top performers, any gaps]
**Promos:** [1 sentence — active campaign impact or "no active campaign"]
**Loyalty:** [1 sentence — enrollment and redemption signal]

### Anomalies
[Bulleted list of flagged deviations with urgency tier. "None detected" if clean.]

### Tomorrow's Watch List
[1–2 items to monitor or confirm at next review]
```

Total length: 200–350 words. Scannable in under 60 seconds.

## Edge Cases
- **Sunday / short-hours day:** Compare to prior Sundays, not weekday average — flag if Sunday baseline not established
- **Holiday:** Note the holiday; adjust baseline comparison; high traffic days should compare to same holiday prior year
- **POS sync failure:** Do not produce a memo on incomplete data — alert operator, state expected sync time
- **New store (< 30 days open):** No reliable baseline yet; report absolute numbers with "baseline not yet established"
- **Multi-location org:** Produce one memo per location; do not blend metrics across stores

## Escalation Rules
- **Revenue < 50% of baseline with no known cause:** Escalate to Immediate + route anomaly-to-action-memo
- **Out-of-stock on top-3 revenue SKU:** Flag for procurement same day
- **POS data missing > 2 hours:** Escalate to Linus before producing memo
- **Loyalty redemption rate > 40% in one day:** Flag for margin review — may indicate gaming or error

## Compliance Notes
- Do not include customer PII in the memo — aggregate counts and revenue figures only
- Promotional attribution figures are estimates based on send-to-transaction window; label as attributed, not proven
- Revenue projections or forecasts are estimates — label clearly
