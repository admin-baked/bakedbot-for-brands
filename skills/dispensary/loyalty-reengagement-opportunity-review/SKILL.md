---
name: loyalty-reengagement-opportunity-review
description: Review dispensary loyalty performance to identify segments with weakening engagement and produce a prioritized reengagement memo with draft-ready campaign recommendations. Use when a store wants to know which customers are going cold, who is at risk of churning, and what to do about it. Trigger phrases: "loyalty review", "who's going cold", "customers drifting away", "at-risk customers", "winback opportunity", "loyalty health", "who should we reach out to", "reengagement campaign".
version: 0.1.0
owner: lifecycle-marketing
agent_owner: mrs-parker
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - reengagement_memo
  - campaign_brief
downstream_consumers:
  - craig (receives campaign_brief to draft full copy)
  - operator (approves reengagement_memo before Craig proceeds)
requires_approval: true
risk_level: high
status: active
approval_posture: draft_only
---

# Loyalty Reengagement Opportunity Review

## Purpose
Give a dispensary operator a clear picture of which customer segments are losing engagement, why it
matters in revenue terms, and a ready-to-approve plan — including campaign drafts — for winning them
back before they're gone for good.

## When to Use
- Weekly loyalty health review playbook fires
- Operator asks who's going cold or who they should reach out to
- A loyalty tier drop spike is detected (champions → engaged, engaged → at-risk)
- Mrs. Parker's lifecycle monitoring surfaces an at-risk cohort
- No campaign has been sent in > 14 days (customers are cooling passively)

## When NOT to Use
- **Campaign copy drafting** — this skill produces a structured brief for Craig; Craig owns writing the actual copy, channel formatting, and compliance submission
- **New customer onboarding** → `thrive-welcome` or `mrs-parker-welcome`
- **Product recommendations for individuals** → Smokey
- **Pricing or discount strategy** → Money Mike; this skill surfaces the segment, not the offer
- **Customers who opted out** → do not include in reengagement analysis; filter upstream

## Required Inputs
- `org_id` — required
- `review_window` — default: last 30 days
- `loyalty_tiers` — pulled from org config; BakedBot standard tiers:
  - `champion` (score 80–100): high frequency, high spend, high loyalty
  - `engaged` (55–79): regular, growing or stable
  - `at_risk` (30–54): frequency declining, spend shrinking
  - `dormant` (0–29): no transaction in 60+ days

## Reasoning Approach

Loyalty health is about **momentum**, not just current tier. A customer moving from champion → engaged
is more urgent than a customer who has been engaged for 6 months.

**Four signals to evaluate:**

**1. Tier velocity (most important)**
- How many customers moved down a tier in the last 30 days?
- Champion → Engaged is early warning; Engaged → At-Risk is revenue risk now
- Dormant count growing week-over-week = structural retention problem

**2. Points earned vs. redeemed ratio**
- High earn + low redeem = customers don't see value in the program or don't know their balance
- Low earn + high redeem = loyal customers converting stored value; healthy unless earn is declining
- Very low redeem (<2%) = possible program awareness problem; fix communication, not the offer

**3. Recency of last visit**
- Champion who hasn't visited in 21+ days: early at-risk despite score
- At-risk with last visit 45 days ago: approaching dormant threshold
- Dormant with last visit < 90 days: still winnable; > 120 days: lower-probability, different approach needed

**4. Revenue at stake**
- Segment size × average spend per visit × estimated visits per month = revenue at risk
- Prioritize segments where revenue impact is highest, not just headcount

**Segment prioritization:**
- **Immediate:** Champions trending down, revenue at risk > $500/month, last visit ≤ 21 days
- **This Week:** At-risk cohort > 50 customers, revenue at risk > $1,000/month
- **Monitor:** Dormant < 90 days, small cohort, no clear cause identified yet

## Output Contract

```
## Loyalty Reengagement Review — [Store] — [Date Range]

LOYALTY HEALTH: [Strong / Watch / At Risk / Critical]
TOTAL MEMBERS REVIEWED: N
TIERS: Champion N | Engaged N | At-Risk N | Dormant N

### Tier Movement (30-day)
| Movement | Count | Revenue at Risk/Month |
|----------|-------|----------------------|
| Champion → Engaged | N | $X,XXX |
| Engaged → At-Risk | N | $X,XXX |
| At-Risk → Dormant | N | $X,XXX |

### Top Reengagement Opportunities
| Segment | Size | Revenue at Risk | Last Active | Priority |
|---------|------|----------------|-------------|---------|
| Champions trending down | N | $X,XXX | ≤21 days | Immediate |
| At-risk cohort | N | $X,XXX | 30–45 days | This Week |

### Campaign Brief (Ready for Craig)
**Segment:** [At-risk customers, N members, last visit 30–45 days]
**Goal:** retention
**Channel:** [email recommended — richer loyalty framing / SMS for urgency]
**Angle:** [Loyalty balance reminder + personalized offer suggestion]
**Offer guidance:** [Points-based reward or category preference match — confirm margin with operator]
**Tone:** Mrs. Parker warmth — they're not gone, just quiet

### Points Program Health
[2 sentences: earn/redeem ratio signal and what it suggests about program awareness]

### Recommended Actions
| # | Action | Owner | Urgency |
|---|--------|-------|---------|
| 1 | Send reengagement campaign to at-risk cohort | Craig → Deebo → Operator | This Week |
| 2 | [Second action if warranted] | ... | ... |
```

**Important:** This skill produces a `campaign_brief` — a structured handoff to Craig. Craig writes
the actual copy, submits to Deebo for compliance, and presents to operator for approval before any send.
This skill does not draft copy and does not advance a campaign to `approved` status.

## Edge Cases
- **No loyalty program data available:** State clearly — cannot perform analysis without member records
- **Entire at-risk cohort opted out of email and SMS:** Flag; recommend in-store POS messaging as only channel
- **Champion tier is empty:** New store or recently launched program — no baseline yet; report what exists
- **Single large customer driving tier stats:** Note if one high-spend customer's behavior is skewing numbers
- **Holiday or seasonal dip:** Factor in when assessing tier drops — post-holiday lull ≠ structural churn

## Escalation Rules
- **>20% of champion tier moved down in 30 days:** Escalate to super_user immediately — potential product, service, or competitive issue
- **Dormant cohort > 40% of total loyalty base:** Structural retention problem; escalate to operator + recommend full program review
- **Any reengagement offer > $20 or > 15% off:** Require operator approval on the offer itself before Craig drafts
- **Campaign targets > 500 customers:** Operator sign-off required before Craig begins; flag segment size in brief

## Compliance Notes
- Reengagement campaigns require Deebo PASS before send — requires_approval is true; never auto-send
- Do not include customer names, emails, or spend history in the memo — aggregate data only
- NY regulations apply to all promotional copy in the campaign draft bundle
- Segment behavioral data used for targeting is internal — not disclosed in customer-facing copy
- Points balance references in copy must be accurate at time of send — confirm with POS before scheduling
