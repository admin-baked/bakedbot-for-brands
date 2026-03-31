---
name: sell-through-partner-analysis
description: Analyze which retail dispensary partners are selling through a grower's products effectively, identify top performers and laggards, and produce a prioritized partner action plan. Use when a grower wants to know where their products move fastest, which partners need attention, and where to focus wholesale sales effort. Trigger phrases: "which partners are selling our product", "sell-through analysis", "partner performance", "where is inventory moving", "which dispensaries reorder most", "wholesale partner review", "retail partner scorecard".
version: 0.1.0
owner: grower-operations
agent_owner: pops
allowed_roles:
  - super_user
  - grower_operator
outputs:
  - partner_scorecard
  - follow_up_brief
downstream_consumers:
  - craig (partner follow-up outreach drafts)
  - retail-account-opportunity-review (brand-side mirror of this skill)
  - inventory-aging-risk-review (route aged stock to high-velocity partners)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Sell-Through Partner Analysis

## Purpose
Give a grower a ranked view of which dispensary partners are moving product — and which are letting
it sit — so wholesale effort, preferential pricing, and inventory routing go to the partners who
actually turn inventory into revenue.

## When to Use
- Monthly or quarterly grower partner review
- Grower is deciding which partners to prioritize for a new batch or strain release
- Aging inventory needs to be routed to highest-velocity partners (feeds from `inventory-aging-risk-review`)
- A partner hasn't reordered in longer than expected
- Grower is evaluating whether to expand or contract their retail partner list

## When NOT to Use
- **Inventory aging decisions** → `inventory-aging-risk-review` drives those; this skill informs routing, not risk assessment
- **Retail account opportunity review from the brand side** → `retail-account-opportunity-review` covers that perspective
- **Partner compliance issues** → Deebo; sell-through performance ≠ compliance posture
- **Pricing strategy** → Money Mike; this skill identifies where to offer incentives, not what price to set
- **Customer-level analytics within a dispensary** → Pops + dispensary's own data; grower visibility stops at the partner door

## Required Inputs
- `org_id` / `grower_id` — required
- `review_window` — default: last 60 days
- `partner_list` — all active retail dispensary partners; pulled from CRM
- `shipment_data` — units shipped per partner per SKU per week
- `reorder_data` — reorder dates, quantities, cadence per partner
- `sell_through_reports` — if available from POS share (optional but improves accuracy)

## Reasoning Approach

Sell-through is a velocity signal, not just a volume signal. A small dispensary with 100% sell-through
in 10 days is a better partner for limited stock than a large dispensary with 40% sell-through in 60 days.

**Three metrics to score each partner:**

**1. Sell-through rate**
`units_sold / units_ordered × 100` over the review window.
- > 85% in ≤ 30 days: high velocity ✅
- 60–85% in 30–60 days: solid, improving or holding 🟡
- < 60% OR > 60 days to clear: slow-moving 🔴
- No sell-through data: flag as unverified; use reorder cadence as proxy

**2. Reorder cadence**
- Reordering before previous shipment is cleared: sell-through is healthy, partner is confident
- Reordering on expected schedule: reliable, maintain relationship
- Reordering late or not at all: investigate — out of budget, low velocity, or competitor displacement

**3. SKU diversity**
Partners carrying only 1–2 SKUs have concentration risk — if that strain/form misses, the relationship stalls.
Partners carrying 4+ SKUs across categories are higher-quality partners worth investing in.

**Partner tiers:**
- **Tier 1 (Grow):** High sell-through + regular reorders + SKU diversity → prioritize for new launches, exclusive early access
- **Tier 2 (Maintain):** Solid velocity, consistent orders → keep stocked, no over-investment needed
- **Tier 3 (Develop):** Potential visible but underperforming → diagnose block; propose product mix change or rep visit
- **Tier 4 (Review):** Low velocity + irregular reorders → discuss future of relationship; route aging stock cautiously

## Output Contract

```
## Sell-Through Partner Analysis — [Grower/Brand] — [Period]

PARTNERS REVIEWED: N  |  TOTAL UNITS SHIPPED: N  |  BLENDED SELL-THROUGH: X%

### Partner Scorecard
| Partner | Tier | Sell-Through | Reorder Cadence | SKUs Carried | Action |
|---------|------|-------------|----------------|-------------|--------|
| Thrive Syracuse | 1 | 92% / 18 days | Every 3 weeks | 5 SKUs | Priority for next batch |
| [Name] | 3 | 54% / 55 days | Irregular | 2 SKUs | Product mix conversation |

### Tier 1 — Grow (N partners)
[Partner, top-performing SKU, recommended action: early access, volume incentive, deepened relationship]

### Tier 2 — Maintain (N partners)
[Partner list — steady state, no intervention needed]

### Tier 3 — Develop (N partners)
[Partner, velocity gap, likely cause, specific action: SKU swap, rep visit, promotional support]

### Tier 4 — Review (N partners)
[Partner, days since last reorder, inventory outstanding, recommended conversation]

### Aging Stock Routing Recommendation
[From inventory-aging-risk-review input: route at-risk batches to these Tier 1/2 partners]

### Recommended Actions
| # | Action | Partner | Owner | Timeline |
|---|--------|---------|-------|----------|
| 1 | Early access offer for next Blue Dream batch | Thrive, [Partner 2] | Sales | Before harvest |
| 2 | Product mix conversation — swap [SKU] for [SKU] | [Develop partner] | Rep | This week |
```

## Edge Cases
- **No sell-through data from partner (self-report not provided):** Use reorder cadence as proxy; flag confidence as Medium
- **Partner just onboarded (< 60 days):** Exclude from tier scoring; tag as ramp phase; track velocity weekly
- **One large partner dominates total units:** Analyze concentration risk; produce analysis with and without anchor partner
- **Partner in a different state than grower:** Flag any interstate transfer compliance considerations before routing aged stock
- **Seasonal strain (e.g., harvest-specific):** Contextualize velocity vs. seasonal demand, not all-time baseline

## Escalation Rules
- **Tier 1 partner's reorder cadence suddenly drops 50%+:** Escalate to sales lead immediately — may indicate competitor displacement or buyer change
- **Tier 4 partner holds >$5,000 of uncommitted aging inventory:** Escalate to operator; may need a direct conversation or return negotiation
- **Partner requests product modification or custom packaging:** Escalate to super_user — outside standard wholesale scope

## Compliance Notes
- Sell-through data shared by retail partners is confidential; do not disclose one partner's performance data to another
- Any inventory routing decisions that cross state lines require compliance review before action
- Volume incentive offers to Tier 1 partners must be reviewed by Deebo if they involve promotional pricing language
- NY grower-to-retailer transfer records must remain accurate regardless of sell-through strategy
