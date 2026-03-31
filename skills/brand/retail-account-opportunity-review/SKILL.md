---
name: retail-account-opportunity-review
description: Review a brand's dispensary partner accounts to identify which are underperforming, which have untapped growth potential, and what actions to take — producing a prioritized account opportunity memo with follow-up recommendations. Use when a brand operator wants to know which retail partners to focus on, where revenue is being left on the table, or how to prioritize field sales effort. Trigger phrases: "which accounts should we focus on", "retail account review", "where are we underperforming", "dispensary partner analysis", "account opportunity", "which retailers are growing", "partner performance".
version: 0.1.0
owner: brand-growth
agent_owner: craig
allowed_roles:
  - super_user
  - brand_operator
outputs:
  - account_opportunity_memo
  - follow_up_draft_bundle
downstream_consumers:
  - craig (account follow-up drafts)
  - ezal (competitive context at specific accounts)
  - operator (field sales prioritization)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Retail Account Opportunity Review

## Purpose
Give a brand operator a ranked view of which dispensary partners deserve attention this week — which
are growing and should be doubled down on, which are slipping and need intervention, and which are
untapped and worth pursuing — so field effort goes where it produces the most return.

## When to Use
- Weekly or monthly brand account review cycle
- Brand operator asks which retailers to prioritize or visit
- A brand is launching a new product and needs to identify the right retail partners for rollout
- Field sales team is planning routes or outreach for the week
- An account goes quiet (no reorder in expected window)

## When NOT to Use
- **Competitor brand analysis** → use `competitor-promo-watch` for brand-level competitive intel
- **Dispensary-level ops review** (from the dispensary's own perspective) → `daily-dispensary-ops-review`
- **Pricing or margin decisions** → Money Mike; this skill surfaces the account opportunity, not the price
- **Campaign copy for follow-up** → hand off to Craig after opportunity is identified
- **Compliance review of outreach** → Deebo before any follow-up sends

## Required Inputs
- `brand_id` / `org_id` — required
- `review_window` — default: last 30 days
- `partner_list` — all active dispensary accounts for this brand; pulled from CRM or `crmListUsers()`
- `sell_through_data` — units ordered, units sold per account per SKU (from POS sync or partner reports)
- `baseline_window` — comparison period; default: prior 30 days

## Reasoning Approach

Score each account on two dimensions, then plot into a 2×2:

**Dimension 1: Current revenue performance**
- Revenue vs. baseline (growing / flat / declining)
- SKU velocity (sell-through rate: units sold / units ordered per week)
- Reorder frequency vs. expected cadence

**Dimension 2: Untapped potential**
- Account size (total dispensary revenue) vs. brand's current share of wallet
- SKU count carried vs. full brand catalog — product gap = opportunity
- Category strength at this account (if they over-index in flower and brand has strong flower, that's a fit)

**2×2 account tiers:**
| | High Performance | Low Performance |
|---|---|---|
| **High Potential** | 🌟 Scale — invest here | ⚠️ Fix — something is blocking growth |
| **Low Potential** | ✅ Maintain — don't over-invest | ⬇️ Deprioritize — minimal effort |

**Scale accounts:** Increase SKU count, propose bundle deals, deepen relationship.
**Fix accounts:** Diagnose the block — wrong SKU mix, placement issue, competitor displacement, relationship gap. Route to field visit or outreach.
**Maintain accounts:** Keep reorder cadence, don't disrupt what's working.
**Deprioritize accounts:** Reduce outreach frequency; flag if they drop further.

**Signal to watch specifically:**
- Account that was Scale last month and is now Fix → urgent; something changed
- New account with first 2 orders in → early velocity signal; assess fit before investing

## Output Contract

```
## Account Opportunity Review — [Brand] — [Period]

ACCOUNTS REVIEWED: N  |  TOTAL REVENUE: $X,XXX  |  vs. BASELINE: [+/-]X%

### Priority Actions
| # | Account | Tier | Action | Owner | Urgency |
|---|---------|------|--------|-------|---------|
| 1 | [Name]  | Fix  | Field visit — SKU velocity dropped 40% | Field rep | This week |

### Account Tiers
**🌟 Scale (N accounts)**
[Account, revenue, key signal, recommended move]

**⚠️ Fix (N accounts)**
[Account, revenue, drop signal, likely cause, action]

**✅ Maintain (N accounts)**
[Account list — no action needed]

**⬇️ Deprioritize (N accounts)**
[Account list — reduce outreach cadence]

### Top Opportunity (Not Yet a Partner)
[If any high-potential dispensary in the market is not yet carrying the brand — surface it]

### Follow-Up Drafts Needed
[List of Fix/Scale accounts where Craig should draft outreach — handed off automatically]
```

## Edge Cases
- **No sell-through data for an account:** Flag as data gap; do not score without it; recommend requesting POS report
- **Account just onboarded (< 60 days):** Exclude from tier scoring; tag as "ramp phase" and monitor velocity only
- **Single large account skewing totals:** Note the concentration risk; analyze with and without that account
- **Brand has only 1–3 retail partners:** Tiers don't apply; produce individual account narratives instead
- **Sell-through data is self-reported by partner:** Flag confidence as Medium; verify against own shipment records

## Escalation Rules
- **Scale account shows sudden 30%+ drop:** Escalate to brand operator immediately — potential displacement or relationship issue
- **Fix account has gone 45+ days without a reorder:** Flag as at-risk of churn; trigger follow-up outreach via Craig
- **Untapped account is top-10 in the market by revenue:** Surface to super_user for strategic partnership discussion

## Compliance Notes
- Account performance data is internal; do not surface in external partner communications
- Follow-up drafts from Craig must pass Deebo review before send — especially if they include pricing or promotional language
- Sell-through estimates from POS are approximations; label as estimated in any external communications
