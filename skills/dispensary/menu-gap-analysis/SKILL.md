---
name: menu-gap-analysis
description: Identify products a dispensary is missing relative to competitor menus, local customer demand, and category best practices — producing a prioritized gap report with procurement recommendations. Use when a store wants to know what it should be stocking that it isn't. Trigger phrases: "what are we missing on the menu", "menu gaps", "what do competitors carry that we don't", "should we add any products", "menu audit", "what's selling nearby that we don't have".
version: 0.1.0
owner: market-intelligence
agent_owner: ezal
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - menu_gap_report
downstream_consumers:
  - operator (procurement decision)
  - craig (product launch campaign if gap is filled)
  - smokey (updated recommendation context)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Menu Gap Analysis

## Purpose
Surface the delta between what a dispensary currently stocks and what the local market demands —
so operators can make confident procurement decisions and stop losing customers to competitors
carrying products they don't have.

## When to Use
- Operator asks what competitors carry that the store doesn't
- Weekly competitive intel refresh surfaces product gaps
- Smokey repeatedly fails to match customer requests to in-stock items
- Seasonal reset (spring, fall, 4/20) warrants menu evaluation
- New brand or product category is gaining market share locally

## When NOT to Use
- **Pricing strategy** → Money Mike owns margin/price decisions; gap analysis flags the product, not the price
- **Campaign drafting for a new product** → hand off to Craig after gap is identified
- **Real-time inventory management** → POS system handles stock levels; this skill analyzes category gaps
- **Compliance review of new products** → Deebo checks label claims; gap analysis doesn't evaluate legality
- **National trend analysis without local signal** → trending nationally ≠ gap locally; require local evidence

## Required Inputs
- `org_id` — required
- `current_menu` — current store inventory snapshot (pulled from POS or `searchMenu()`)
- `location` — city/state for competitor scan radius
- `categories` — optional; default: flower, vapes, gummies, prerolls, beverages, concentrates, topicals
- `competitor_data` — optional; uses cached CI report or triggers fresh `scanCompetitors()` if absent

## Reasoning Approach

A menu gap is only meaningful if local demand exists for the missing product. Three signals confirm demand:

**1. Competitor velocity signal**
Products appearing on 2+ competitor menus with visible popularity (review count, featured placement,
"staff pick") indicate local demand. One competitor carrying something = weak signal. Three = strong.

**2. Customer request signal**
Smokey delegation logs, missed product searches, and "do you carry X?" queries from customers are
direct demand evidence. Weight these heavily — customers told you what they want.

**3. Category trend signal**
Category-level shifts (beverage cannabis growing, flower declining nationally) provide context, but
only act on these if local evidence supports them. Label as "trend" not "gap" if unconfirmed locally.

**Gap scoring:**
- **Priority 1:** Present on 3+ competitor menus + customer requests logged → strong procurement case
- **Priority 2:** Present on 2 competitor menus OR customer requests with no competitor confirmation
- **Priority 3:** Category trend only, no local confirmation → monitor, don't procure yet

**What to NOT flag:**
- Products in legal gray areas for NY
- Products the store has consciously chosen not to carry (check brand guide / operator notes)
- Temporary out-of-stocks on products already in the catalog → that's a restock, not a gap

## Output Contract

```
## Menu Gap Analysis — [Store] — [Date]

DATA SOURCES: [CI report dated X / live scan / customer request logs]
COMPETITORS ANALYZED: N
CATEGORIES REVIEWED: [list]

### Priority 1 Gaps (Strong procurement case)
| Product / Category | Seen At | Customer Requests | Estimated Weekly Demand |
|-------------------|---------|------------------|------------------------|
| ...               | 3 competitors | 5 logged requests | ~$800/wk est. |

### Priority 2 Gaps (Investigate further)
| Product / Category | Signal | Confidence | Suggested Action |
|-------------------|--------|-----------|-----------------|

### Priority 3 Watch (Trend only — no local confirmation)
| Trend | Evidence | Monitor Until |
|-------|---------|--------------|

### Recommended Actions
| # | Action | Owner | Timeline |
|---|--------|-------|----------|
| 1 | Add [product] — strong local demand, 3 competitors carry it | Operator | This week |

### What's Working
[1–2 sentences on categories where the store's menu is strong or differentiated vs. competitors]
```

## Edge Cases
- **No competitor data available:** State clearly — do not fabricate gaps. Run `scanCompetitors()` first.
- **Product exists but is regularly out of stock:** Flag as restock gap, not procurement gap — different action
- **Customer requests for a prohibited product:** Do not recommend procurement; route to Deebo for guidance
- **Competing menus scraped but data is stale (>7 days):** Flag confidence as Medium; recommend rescan
- **Store deliberately doesn't carry a category (e.g., no concentrates):** Respect that constraint; don't flag it as a gap

## Escalation Rules
- **Gap product is in a legally ambiguous status in NY:** Route to Deebo before any procurement recommendation
- **Priority 1 gap worth >$2,000/week estimated revenue:** Escalate to super_user for visibility alongside operator
- **Customer requests logged for same product >10 times:** Flag as Immediate — revenue is actively being lost now

## Compliance Notes
- Only recommend products legal under NY OCM rules
- Do not recommend products based on competitor data alone if NY licensing status is unclear
- Demand estimates are approximations based on competitor velocity and request logs — label as estimates
- Gap analysis does not constitute procurement approval — operator makes the final sourcing decision
