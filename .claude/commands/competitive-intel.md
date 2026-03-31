---
description: Research competitive intelligence for a dispensary client — use when asked who's undercutting us, what competitors are doing, pricing threats, product gaps, counter-campaign opportunities, or to generate/refresh a weekly intel report. Trigger phrases: "what's the competition doing", "any threats", "who's undercutting us", "pricing gaps", "competitor analysis", "market intel", "weekly intel report".
---

# Competitive Intelligence Research

## Contract
**Input:** org_id (required), location/city/state (infer from context or ask), competitor names (optional)
**Output:** Top 3 threats ranked by business impact, pricing gap table, 1 opportunity, Craig alert if P0 threshold breached
**Does NOT:** Fabricate competitor names, invent prices, use placeholder text like "[Competitor]" or "[Your State]"

## Reasoning Framework

CI has two modes: **reactive** (user asks) and **proactive** (scheduled refresh). Always check cached data before
running a live scan — live scans are rate-limited and expensive. Freshness threshold: 7 days.

**Data source priority:**
1. `readDriveFile('latest')` — cached weekly report (use if < 7 days old)
2. `listCompetitiveReports(orgId)` — check report inventory and dates
3. `scanCompetitors(location)` — live scrape (only if data is stale or missing)
4. `getCompetitiveIntel(state, city)` — Leafly + web fallback

**Threat severity tiers:**
- **P0 → Alert Craig immediately:** Competitor undercuts top-3 SKU by >15% OR runs counter-promotion against our active campaign
- **P1 → Flag in report:** Price gap 5–15% on any top-10 SKU, new competitor within 5 miles, demand category gap
- **P2 → Monitor:** Pricing within 5%, minor assortment diff, new entrant with no data yet

**Pricing gap formula:** `(competitor_avg − our_price) / our_price × 100`
**Threat score:** `price_gap_pct × sku_revenue_rank` — rank by this, surface top 3.

## Steps

### 1. Check data freshness
Call `listCompetitiveReports(orgId)`. If latest < 7 days: use it. If stale or missing: proceed to live scan.

### 2. Pull latest report
`readDriveFile('latest')` → extract competitor names, pricing threats, scan date.
If no Drive file: set `report_available = false`, go to Step 3.

### 3. Live scan (only if stale)
`scanCompetitors(location)` — 25-mile radius, all dispensary types.
`getCompetitiveIntel(state, city)` — Leafly-verified pricing cross-reference.
**Only report data actually retrieved. No placeholders.**

### 4. Rank threats
Compute threat scores. Surface top 3 threats + top 1 opportunity to capitalize on.

### 5. Trigger Craig if P0
`alertCraig(competitorId, threat_description, product_name)` with counter-campaign brief:
channel recommendation (SMS for speed, email for margin plays), target segment, counter-offer angle.

### 6. Produce output (see format below)

## Output Format

```
## Competitive Intelligence — [Store Name] — [Date]

**DATA SOURCE:** [Drive report dated X / Live scan completed now]
**CONFIDENCE:** [High / Medium / Low — note if Leafly lag suspected]
**COMPETITORS TRACKED:** N

### Threat Summary
| # | Competitor | Product | Their Price | Our Price | Gap | Severity |
|---|-----------|---------|-------------|-----------|-----|----------|
| 1 | ...       | ...     | $X.XX       | $X.XX     | −X% | P0 / P1  |

### Synthesis
[2–3 sentences: what's the pattern, which categories are exposed, what's driving it]

### Top Opportunity
**[Specific gap or moment]:** [Why now, what to do, which agent to involve]

### Actions Taken
- [Craig alerted for P0 threat on X / No P0 thresholds breached]

### Recommended Next Step
[One clear action: price match, Craig campaign brief, product procurement flag, or rescan date]
```

## Edge Cases
- **No competitors found within radius:** Report honestly. Do not fabricate. Suggest expanding to 50 miles.
- **Leafly data lag:** Flag confidence as Medium. Leafly menus can lag 24–72 hours.
- **Competitor just opened:** Zero history = P1 flag, set weekly rescan for 4 weeks.
- **Our pricing data missing:** Ask user for top 5 SKU prices before proceeding — can't compute gaps blind.
- **Multi-location client:** Scope per location. Never mix Syracuse data with Albany data in one report.
- **No Mailjet/email active:** Craig alert still fires; Craig will hold campaign until email provider confirmed.

## Composability Note
Output rows map directly to Craig's `createCampaignDraft()` parameters: `competitorId`, `product`, `price_gap`
→ counter-campaign with channel, segment, and offer delta pre-populated. Ezal → Craig handoff is automatic on P0.
