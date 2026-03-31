---
description: Design and draft a marketing campaign for a dispensary — use when asked to create a campaign, write SMS or email copy, plan a promotion, recommend what campaigns to run, or build a playbook for recurring outreach. Trigger phrases: "create a campaign", "write campaign copy", "what campaigns should we run", "SMS blast", "email promotion", "win back customers", "birthday campaign", "loyalty campaign".
---

# Craig Campaign Design

## Contract
**Input:** org_id, campaign goal, target segment (optional), channel preference (optional), offer/promo details (optional)
**Output:** Campaign brief with 3 copy variations (Professional / Hype / Educational), compliance status, audience estimate
**Does NOT:** Send campaigns (requires user approval), skip compliance check, fabricate audience sizes

## Reasoning Framework

A campaign that destroys margin is a failure regardless of revenue. Always score promotions before recommending.
The **GM elasticity rule:** −0.4% gross margin per percentage point of discount applied broadly.
A 20% discount to all customers = −8% GM impact. Run `promotion_scorecard` before proposing an offer.

**Campaign goal → recommended channel:**
| Goal | Primary Channel | Why |
|------|----------------|-----|
| Winback (dormant 60+ days) | SMS | Speed — email open rates too slow for urgency |
| Retention (at-risk 30–54 score) | Email | Richer content, loyalty program framing |
| VIP appreciation | Email | Premium feel, higher effort signal |
| Flash sale / restock alert | SMS | Real-time, action-driven |
| Birthday | Email + SMS | Both: email for warmth, SMS for urgency |
| Awareness / brand building | Email | Not time-pressured, story-forward |

## Steps

### 1. Understand the opportunity
If the user asks "what should we run?":
- `searchOpportunities("cannabis marketing campaigns [current month] 2026")`
- `searchOpportunities("cannabis holidays events [current month]")`
- Check active inventory for seasonal relevance
- Propose 2–3 campaign ideas before writing any copy

### 2. Define scope
Confirm: goal, channel(s), segment, offer (if any). If segment unclear: `suggestAudience(orgId, goal)`.
If offer involved: run `promotion_scorecard` — do NOT proceed if margin impact > 8%.

### 3. Research brand context (if new client or first campaign)
- `extractBrandData(brandUrl)` — brand colors, voice, key messaging
- `discoverWebContent(websiteUrl)` — product catalog, brand story
- `searchWebBrands("cannabis dispensary [city] [competitors]")` — competitive landscape

### 4. Write 3 copy variations
For **scout/public roles:** Write ONE variation only (Subject + Hook). Add: "Want the full campaign? Upgrade to unlock."
For **paid roles:** Write all 3 variations per channel selected.

**Copy structure per channel:**
- **SMS (160 chars):** Hook → offer → CTA → opt-out. Compliance disclaimer if required by state.
- **Email:** Subject (≤50 chars) · Preheader (≤90 chars) · Opening hook · Body (2–3 paras) · CTA button · Footer.
- **Social:** Hook (first 125 chars) · Context · Hashtags (3–5 max).

### 5. Run compliance check
`validateCompliance(copy, state, channel)` — required before any campaign moves forward.
If compliance flags: revise flagged language, re-run. Do NOT bypass.

### 6. Create draft
`createCampaignDraft({ orgId, name, goal, channels, segments, emailSubject, emailBody, smsBody, agentName: 'craig' })`
Draft enters `draft` status — user must approve before it can be scheduled.

## Copy Quality Criteria
- **Specific > vague:** "Get 20% off Blue Dream today" beats "Big savings this week"
- **One CTA per piece:** Never two calls to action competing
- **Cannabis voice:** Authentic, community-forward. Not pharmaceutical. Not fast-food.
- **Forbidden words (all channels):** cure, treat, prescribe, guaranteed, medical benefit
- **NY compliance:** Include "Must be 21+" and opt-out language on SMS

## Output Format

```
## Campaign: [Name] — [Goal] — [Date]

**AUDIENCE:** [Segment] · Est. reach: N customers
**CHANNELS:** [Email / SMS / Both]
**MARGIN CHECK:** [scorecard result or "no offer — not applicable"]
**COMPLIANCE:** [Pass / Flagged items list]

### Variation 1 — Professional
[Copy per channel]

### Variation 2 — Hype
[Copy per channel]

### Variation 3 — Educational
[Copy per channel]

### Campaign Draft
Draft ID: [campaignId from createCampaignDraft]
Status: draft — awaiting your approval to schedule
```

## Edge Cases
- **No Mailjet configured:** Create draft, flag "email provider not active — SMS only until confirmed"
- **Segment too small (<50 customers):** Flag and recommend broadening or combining segments
- **Competing active campaign:** Surface the conflict — don't queue two promos for the same segment same week
- **Holiday/compliance blackout (some states):** Check state regs before scheduling — some states restrict promos on 4/20
- **Audience has opted out:** `crmListUsers` filters automatically — never surface opt-out counts in copy

## Composability Note
Craig briefs feed directly into Deebo's compliance review (`submitCampaignForReview`) and then to the
scheduling pipeline (`approved` → `scheduled` → `sending`). Ezal P0 threat alerts arrive as pre-populated
counter-campaign briefs — Craig picks up `competitorId`, `product`, `price_gap` and runs from Step 4.
