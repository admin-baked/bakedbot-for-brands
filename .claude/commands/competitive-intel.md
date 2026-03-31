---
name: competitive-intel
description: Research and analyze the competitive landscape for a dispensary client — use when assessing pricing threats, threat assessment, market position, or generating a weekly intel report. Trigger phrases: "competitive landscape", "threat assessment", "who's undercutting us", "pricing analysis", "competitive intelligence", "market intel", "weekly intel report", "are we being underpriced".
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
  - craig (counter-campaign brief)
  - super_user (inbox notification)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Competitive Intelligence Research

## Purpose
Synthesize competitor pricing, promotions, and product gaps into a ranked threat report so BakedBot
can recommend targeted counter-moves before customers defect.

## When to Use
- User asks what competitors are doing, who is undercutting them, or what the market looks like
- Scheduled weekly intel refresh triggered by playbook
- Ezal detects a signal breach (new competitor, price threshold crossed)
- Pre-campaign research to understand the competitive landscape before Craig drafts copy

## When NOT to Use
- **Writing campaign copy** → route to Craig
- **Price matching execution** → this is deterministic; use the pricing service, not a skill
- **Legal or regulatory analysis** → route to Deebo
- **Internal BakedBot metrics** → route to Pops
- **Single-product price lookup** → use `scanCompetitors()` directly, no skill needed

## Required Inputs
- `org_id` — required
- `location` (city/state) — infer from org context or ask; do not proceed blind
- `competitor_names` — optional; if omitted, scan by radius
- `sku_list` — optional; if omitted, use top-10 revenue SKUs from org data

## Reasoning Approach

CI has two modes: **reactive** (user asks) and **proactive** (scheduled refresh). Check cached data
before running a live scan — live scans are rate-limited and expensive.

**Data source priority:**
1. `readDriveFile('latest')` — use if < 7 days old
2. `listCompetitiveReports(orgId)` — check report inventory
3. `scanCompetitors(location)` — live scrape (only if stale)
4. `getCompetitiveIntel(state, city)` — Leafly + web fallback

**Threat severity:**
- **P0:** Competitor undercuts top-3 SKU by >15%, or runs counter-promo against our active campaign → alert Craig immediately
- **P1:** 5–15% price gap on top-10 SKU, new competitor within 5 miles, demand category gap
- **P2:** Within 5%, minor assortment diff, new entrant with no data yet → monitor

**Threat score:** `price_gap_pct × sku_revenue_rank` — rank by this, surface top 3.

Only report data actually retrieved. No placeholder competitor names. No fabricated prices.

## Output Contract

```
## Competitive Intelligence — [Store Name] — [Date]

DATA SOURCE: [Drive report dated X / Live scan completed now]
CONFIDENCE: [High / Medium / Low]
COMPETITORS TRACKED: N

### Threat Summary
| # | Competitor | Product | Their Price | Our Price | Gap | Severity |
|---|-----------|---------|-------------|-----------|-----|----------|

### Synthesis
[2–3 sentences: pattern, exposed categories, what's driving it]

### Top Opportunity
[Specific gap or moment, why now, which agent to involve]

### Actions Taken
[Craig alerted for P0 / No P0 thresholds breached]

### Recommended Next Step
[One clear action]
```

## Edge Cases
- **No competitors found:** Report honestly; do not fabricate. Suggest expanding radius.
- **Leafly data lag:** Flag confidence as Medium — Leafly menus can lag 24–72 hours.
- **Competitor just opened:** Zero history = P1 flag, rescan weekly for 4 weeks.
- **Our pricing data missing:** Ask for top 5 SKU prices before computing gaps.
- **Multi-location client:** Scope per location. Never mix Syracuse data with Albany data.

## Escalation Rules
- **P0 threat detected:** `alertCraig()` fires automatically — do not wait for human confirmation
- **State or jurisdiction unknown:** Surface to super_user before proceeding; do not guess
- **Confidence Low on all sources:** Escalate to human for manual verification before actioning
- **Competitor data > 30 days stale across all sources:** Flag for data quality review

## Compliance Notes
- Do not publish competitor pricing claims in customer-facing channels without Craig + Deebo review
- Do not imply illegal pricing behavior by competitors without verified evidence
