---
name: inventory-aging-risk-review
description: Identify cannabis cultivation batches at risk of aging out, losing potency, or missing sell-through windows — producing a prioritized aging risk memo with recommended actions for each at-risk batch. Use when a grower needs to know which inventory is approaching its value cliff and what to do before it's too late. Trigger phrases: "aging inventory", "which batches are at risk", "inventory expiring", "slow-moving stock", "sell-through risk", "flower sitting too long", "batch review".
version: 0.1.0
owner: grower-operations
agent_owner: pops
allowed_roles:
  - super_user
  - grower_operator
outputs:
  - aging_risk_memo
downstream_consumers:
  - operator (procurement and sales decisions)
  - craig (clearance campaign brief if discount route chosen)
  - sell-through-partner-analysis (for routing aged stock to high-velocity partners)
requires_approval: false
risk_level: high
status: active
approval_posture: recommend_only
---

# Inventory Aging Risk Review

## Purpose
Give a grower a clear view of which batches are approaching their value cliff — where potency loss,
COA expiry, or buyer resistance will start costing real money — with enough lead time to act before
the window closes.

## When to Use
- Weekly grower ops review playbook fires
- Operator asks which inventory is at risk or sitting too long
- A harvest batch hasn't moved in 30+ days
- Partner reorder rates are slowing and inventory is building up
- Pre-season planning requires clearing current inventory for incoming harvests

## When NOT to Use
- **Real-time inventory counts** → POS/ERP system; this skill interprets risk, doesn't track units
- **Pricing decisions on clearance stock** → Money Mike owns the price; this skill flags the batch
- **Compliance testing status** → COA management system; this skill uses COA dates as an input, not a source
- **New harvest planning or cultivation decisions** → operational scheduling system
- **Retail-level inventory (dispensary stock)** → `daily-dispensary-ops-review`; this skill is grower-side

## Required Inputs
- `org_id` — required
- `batch_inventory` — list of batches with: strain, form (flower/concentrate/pre-roll), harvest date, test date, units on hand, units ordered (pending), storage location
- `coa_expiry_dates` — certificate of analysis expiry per batch
- `partner_orders` — pending purchase orders that will absorb some of this inventory
- `review_date` — default: today

## Reasoning Approach

Cannabis inventory ages along two independent clocks. Both must be tracked:

**Clock 1: Quality / Potency**
Flower: peak quality window is 0–90 days post-harvest. After 90 days, terpene degradation becomes
buyer-detectable. After 180 days, significant potency loss likely. Concentrates and edibles have
longer windows but are not immune.

**Clock 2: Regulatory / COA**
A Certificate of Analysis has a validity window (typically 12 months in NY). Once expired, the
product cannot legally be sold until retested. Retesting costs time and money. Getting ahead of
COA expiry is mandatory, not optional.

**Risk tiers — apply to each batch:**

| Tier | Condition | Action |
|------|-----------|--------|
| 🟢 Fresh | < 30 days post-harvest, COA valid 6+ months | Monitor only |
| 🟡 Watch | 31–60 days, or COA valid 3–6 months | Flag; track weekly; prepare partner outreach |
| 🟠 At Risk | 61–90 days, or COA valid 1–3 months | Priority outreach to partners; consider pricing flexibility |
| 🔴 Urgent | 90+ days flower / 180+ days concentrate, or COA < 30 days to expiry | Immediate action: discount, donation, disposal planning, or retest |

**Batch scoring:**
- Start from quality clock tier
- Upgrade one tier if COA expiry is within the same tier's window
- Upgrade one additional tier if no pending purchase orders exist for this batch
- A batch with zero POs and 85-day-old flower in the At Risk tier → escalate to Urgent

**Units at risk calculation:**
`(units_on_hand − units_on_pending_PO) × estimated_wholesale_price` = revenue at risk

## Output Contract

```
## Inventory Aging Risk Review — [Grower/Org] — [Date]

BATCHES REVIEWED: N  |  TOTAL UNITS AT RISK: N  |  REVENUE AT RISK: $X,XXX

### Risk Summary
| Tier | Batches | Units | Revenue at Risk |
|------|---------|-------|----------------|
| 🔴 Urgent | N | N | $X,XXX |
| 🟠 At Risk | N | N | $X,XXX |
| 🟡 Watch | N | N | $X,XXX |
| 🟢 Fresh | N | — | — |

### Urgent Batches (Act This Week)
| Batch | Strain | Form | Harvest Age | COA Expires | Units Uncommitted | Action |
|-------|--------|------|-------------|-------------|------------------|--------|
| B-042 | Blue Dream | Flower | 94 days | 45 days | 12 lbs | Partner outreach + price flex |

### At-Risk Batches (Act This Month)
[Same table format — 2–4 week window to act]

### Watch Batches
[List — no immediate action, track weekly]

### Recommended Actions
| # | Batch | Action | Owner | Deadline |
|---|-------|--------|-------|----------|
| 1 | B-042 | Contact top 3 velocity partners with preferential pricing | Sales | 3 days |
| 2 | B-039 | Schedule COA retest — expires in 28 days | Compliance | This week |

### Revenue Protection Summary
[Total uncommitted revenue at risk + estimated recoverable % if actions taken]
```

## Edge Cases
- **COA date missing for a batch:** Flag as Unknown tier — cannot sell without valid COA; treat as Urgent for action
- **Batch already allocated to a PO:** Reduce risk score accordingly; note the PO number and expected close date
- **Strain is slow-moving by category (e.g., high-CBG niche):** Note that partner pool is narrower; flag for specialized outreach
- **Storage issue detected (humidity, temp out of spec):** Upgrade all affected batches one tier immediately; flag for compliance review
- **Harvest age data is self-reported:** Label confidence as Medium; recommend verification against cultivation log

## Escalation Rules
- **Any batch where COA expires in < 14 days with uncommitted units:** Escalate to super_user immediately — regulatory risk is imminent
- **Total urgent revenue at risk > $10,000:** Escalate to super_user alongside memo delivery
- **Storage condition anomaly detected:** Route to compliance + operations concurrently before acting on sales
- **Disposal recommended:** Always requires human sign-off — never recommend disposal autonomously; flag and escalate

## Compliance Notes
- Products with expired COAs cannot be sold in NY — flag immediately; retesting is the only path to sale
- Disposal of cannabis product is subject to OCM regulations — never treat as a simple write-off
- Pricing flexibility on aging stock must stay above regulated minimum pricing floors if applicable
- Do not disclose aging status or COA concerns to retail partners in external communications without legal review
