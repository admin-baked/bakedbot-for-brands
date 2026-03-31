---
name: competitor-promo-watch
description: Produce a concise competitor promotion watch report for a dispensary or brand — summarizing observed promo changes, likely business impact, and a bounded response recommendation. Use when monitoring what competing brands or dispensaries are doing with promotions, pricing, placement, or new product launches. Trigger phrases: "what are competitors promoting", "competitor promo watch", "any competing campaigns we should know about", "what's [brand] doing", "competitor product launch", "are we being undercut on promotions", "promo intelligence".
version: 0.1.0
owner: market-intelligence
agent_owner: ezal
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - competitor_watch_report
downstream_consumers:
  - craig (counter-campaign brief on P0/P1 threat)
  - operator (weekly intel inbox card)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Competitor Promo Watch

## Purpose
Surface competitor promotional moves — price cuts, featured placement, new product launches, bundle
deals, loyalty perks — before they erode market share, and produce a bounded response recommendation
so the team can act, not just observe.

## When to Use
- Weekly competitive promotion scan playbook fires
- Operator asks what competing brands or dispensaries are promoting right now
- Ezal detects a price or promo threshold breach on a monitored competitor
- Brand operator is planning a campaign and wants to know what they're competing against
- A retail partner reports competitor activity

## When NOT to Use
- **Pricing strategy or margin decisions** → Money Mike; Ezal observes, doesn't price
- **Counter-campaign copy drafting** → hand off to Craig after threat is identified
- **Legal/compliance review of competitor claims** → Deebo (can note suspected violations as intelligence, not legal opinion)
- **Internal BakedBot performance data** → Pops
- **Real-time auction or algorithmic pricing** → deterministic service, not a skill

## Required Inputs
- `org_id` — for market context and active campaign awareness
- `scope` — `dispensary` (monitor nearby stores) or `brand` (monitor competing cannabis brands)
- `competitors` — watchlist from `competitor_watchlist` config, or scan by radius/category if empty
- `lookback_window` — default: last 7 days

## Reasoning Approach

Competitor promotions matter at three levels. Analyze in order:

**1. Threat level**
- **P0 — Counter now:** Direct discount on a product we carry, active promo targeting our customer segment, or pricing that makes us look expensive on a top SKU. Craig alert fires automatically.
- **P1 — Watch closely:** New product launch in a category we compete in, featured placement shift, loyalty multiplier event. Flag in report; recommend monitoring for 2 weeks.
- **P2 — Note and file:** Minor price changes, seasonal promotions consistent with prior years, unverified reports. Log but do not escalate.

**2. Evidence quality**
Only report what is actually retrievable:
- Drive report (`readDriveFile('latest')`) — use first if < 7 days
- `scanCompetitors(location)` — live menu and promo data
- `searchWebBrands(query)` — social/web promotion activity
- Retail partner reports — highest quality; always label source

Label each finding: **Confirmed** (seen on live menu/site) / **Reported** (partner or social) / **Inferred** (pricing pattern suggests a promo).

**3. Response fit**
Not every competitor move warrants a counter. Ask:
- Does this directly threaten our top revenue SKUs or segments?
- Do we have a credible counter-offer that doesn't destroy our margin?
- Is the competitor's promo likely temporary or structural?

Temporary promos (holiday, clearance): monitor, don't match.
Structural pricing changes: escalate to operator for strategic response.

## Output Contract

```
## Competitor Promo Watch — [Store/Brand] — [Date]

SCOPE: [Dispensary / Brand]
DATA FRESHNESS: [Drive report dated X / Live scan / Partner report]
COMPETITORS MONITORED: N

### Threat Summary
| # | Competitor | Move | Threat Level | Evidence Quality | Suggested Response |
|---|-----------|------|-------------|-----------------|-------------------|
| 1 | [Name]    | 20% off Blue Dream through 4/15 | P0 | Confirmed | Craig: counter-promo brief |

### Synthesis
[2–3 sentences: the overall competitive picture this week, what pattern if any]

### P0/P1 Actions Taken
[Craig alerted for P0 / No P0 thresholds breached this period]

### Opportunities
[Any competitor weakness, out-of-stock, or poor review pattern we can capitalize on]

### Next Scan
[Date of next scheduled watch / trigger condition for off-cycle scan]
```

## Edge Cases
- **No competitor data retrievable:** State clearly; do not fabricate. Report "no data available — recommend manual check."
- **Competitor promo unverified:** Label as Reported/Inferred; do not present as Confirmed
- **Competitor making suspected false health claims:** Note as intelligence; route to Deebo if it affects our compliance posture
- **Own active campaign conflicts with a counter-move:** Flag the conflict before recommending Craig action
- **Brand-scope watch with no brand watchlist configured:** Prompt operator to define top 3–5 competing brands before scanning

## Escalation Rules
- **P0 threat on top-3 revenue SKU:** `alertCraig()` fires immediately; do not wait for operator to read report
- **Competitor opens within 1 mile:** Escalate to super_user and operator concurrently; trigger full competitive scan
- **Evidence of predatory pricing (selling below cost):** Escalate to super_user — may indicate competitor distress or market disruption
- **Competitor cited in a compliance or licensing news event:** Route to Deebo for posture review

## Compliance Notes
- Do not publish competitor pricing claims in customer-facing content without Craig + Deebo review
- Do not assert legal violations by competitors without verified regulatory source — note as "suspected" only
- Competitive intelligence is for internal strategic use; not for use in advertising comparisons without legal review
