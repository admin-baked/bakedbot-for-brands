---
name: craig-campaign
description: Design and draft a marketing campaign for a dispensary — use when asked to create a campaign, write SMS or email copy, plan a promotion, recommend what campaigns to run, or build a playbook for recurring outreach. Trigger phrases: "create a campaign", "write campaign copy", "what campaigns should we run", "SMS blast", "email promotion", "win back customers", "birthday campaign", "loyalty campaign".
version: 0.1.0
owner: growth-marketing
agent_owner: craig
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - campaign_draft_bundle
downstream_consumers:
  - deebo (compliance review)
  - mailjet (email send)
  - blackleaf (SMS send)
requires_approval: true
risk_level: high
status: active
approval_posture: draft_only
---

# Craig Campaign Design

## Purpose
Turn a marketing goal into a compliant, channel-ready campaign draft — with copy variations, audience
scope, and a margin impact check — that a human can review and approve before anything sends.

## When to Use
- User asks what campaigns to run, or asks Craig to write marketing copy
- Ezal surfaces a P0 competitive threat requiring a counter-campaign
- Playbook triggers a recurring campaign type (birthday, winback, loyalty milestone)
- Operator wants a campaign brief before scheduling

## When NOT to Use
- **Compliance analysis** → Deebo owns this; Craig calls Deebo, not the reverse
- **Pricing decisions or margin calculations** → Money Mike; Craig uses scorecard output, not raw math
- **Real-time order processing or fulfillment** → deterministic service, not a skill
- **Customer support responses** → Smokey
- **Reporting or performance analysis** → Pops
- **Sending a campaign** — Craig drafts; human approves; workflow sends. Craig never auto-sends.

## Required Inputs
- `org_id` — required
- `goal` — one of: `drive_sales`, `winback`, `retention`, `loyalty`, `birthday`, `restock_alert`, `vip_appreciation`, `product_launch`, `event_promo`, `awareness`
- `channel` — `sms`, `email`, or `both` (optional; inferred from goal if omitted)
- `segment` — target audience; if unclear run `suggestAudience(orgId, goal)`
- `offer` — promo details (optional; run `promotion_scorecard` if included)

## Reasoning Approach

**GM elasticity rule:** −0.4% gross margin per percentage point of discount applied broadly.
A 20% all-customer discount = −8% GM. Run `promotion_scorecard` before proposing any offer.
A campaign that destroys margin is a failure regardless of revenue lift.

**Goal → channel heuristic:**

| Goal | Primary Channel | Rationale |
|------|----------------|-----------|
| Winback (60+ days lapsed) | SMS | Speed — urgency beats open rate lag |
| Retention (at-risk 30–54) | Email | Richer loyalty framing |
| VIP appreciation | Email | Premium signal |
| Flash sale / restock | SMS | Real-time, action-driven |
| Birthday | Email + SMS | Email for warmth, SMS for urgency |
| Awareness | Email | Story-forward, not time-pressured |

**Steps:**
1. If goal unclear: `searchOpportunities("cannabis marketing [month] 2026")` → propose 2–3 ideas first
2. Confirm scope: goal, channel, segment, offer
3. If offer included: `promotion_scorecard` — hard stop if margin impact > 8%
4. Research brand context if new client: `extractBrandData()`, `discoverWebContent()`
5. Write 3 copy variations (scout/public: 1 variation + upgrade prompt)
6. `validateCompliance(copy, state, channel)` — required before draft creation
7. `createCampaignDraft(...)` — status enters `draft`; awaits human approval

## Output Contract

```
## Campaign: [Name] — [Goal] — [Date]

AUDIENCE: [Segment] · Est. reach: N customers
CHANNELS: [Email / SMS / Both]
MARGIN CHECK: [scorecard result / "no offer — N/A"]
COMPLIANCE: [Pass / Flagged items]
DRAFT ID: [campaignId] — status: draft, awaiting approval

### Variation 1 — Professional
[Copy per channel with subject/preheader for email, 160-char body for SMS]

### Variation 2 — Hype
[Copy per channel]

### Variation 3 — Educational
[Copy per channel]

### Reviewer Note
[One sentence on what to check or approve before scheduling]
```

## Edge Cases
- **No Mailjet configured:** Create draft; flag "email provider not active — SMS only until confirmed"
- **Segment < 50 customers:** Flag; recommend broadening or combining segments
- **Two active promos for same segment same week:** Surface conflict; do not queue duplicates
- **NY 4/20 promotions:** Some states restrict; flag for manual legal check before scheduling
- **Compliance flag returned:** Revise flagged language, re-run `validateCompliance`, do not bypass

## Escalation Rules
- **Margin impact > 8%:** Do not proceed — escalate to super_user with scorecard output
- **Compliance BLOCK returned:** Halt draft creation; surface rewrite to operator for approval
- **Campaign targets > 5,000 customers:** Flag for operator review before scheduling
- **SMS to NY customers:** Confirm TCPA opt-in list is current before draft creation
- **Counter-campaign from Ezal P0 alert:** Still runs full compliance check — urgency does not bypass

## Compliance Notes
- Forbidden words (all channels): cure, treat, treatment, prescribe, prescription, guaranteed, proven to, medical benefit, clinically proven, FDA approved, diagnose, therapy, medication — see deebo-compliance for canonical list
- SMS must include opt-out: "Reply STOP to unsubscribe" — non-negotiable
- Email must include unsubscribe link — CAN-SPAM required
- NY product-adjacent copy: "Must be 21 or older with valid government-issued photo ID" required
- No campaign exits `draft` without a Deebo PASS verdict
