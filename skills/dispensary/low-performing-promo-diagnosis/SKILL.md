---
name: low-performing-promo-diagnosis
description: Analyze an underperforming SMS or email campaign for a dispensary or brand and produce a concise optimization memo with likely causes, priority fixes, and next actions. Use when a campaign sent but didn't hit expected open rates, click rates, conversions, or revenue. Trigger phrases: "why didn't this campaign work", "campaign underperformed", "low open rate", "nobody clicked", "promo didn't move product", "analyze this campaign", "what went wrong with the campaign".
version: 0.1.0
owner: growth-marketing
agent_owner: craig
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - campaign_optimization_memo
downstream_consumers:
  - craig (revised campaign brief)
  - operator (decision on retest or abandon)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Low-Performing Promo Diagnosis

## Purpose
Turn campaign performance data into an opinionated root-cause diagnosis so operators don't repeat the
same mistake twice — producing a bounded optimization memo with specific fixes to test on the next send.

## When to Use
- A campaign was sent and open rate, click rate, or attributed revenue fell below benchmark
- Operator asks why a promo didn't work or what to change next time
- Craig's post-campaign analysis step fires in a playbook
- A/B test results are available and need interpretation

## When NOT to Use
- **Campaign planning or copy drafting** → use `craig-campaign` for forward-looking work
- **Compliance violations in the campaign** → route to Deebo; diagnosis comes after compliance is cleared
- **Real-time campaign monitoring** → this is a post-send retrospective skill, not a live monitor
- **Campaign hasn't sent yet** → nothing to diagnose; use `craig-campaign` to strengthen the brief first
- **Attribution modeling** → BakedBot tracks a send-to-transaction window; do not over-claim causal lift

## Required Inputs
- `campaign_id` — to pull send/open/click/bounce/revenue data
- `org_id` — for segment and baseline context
- `benchmark` — optional; defaults to org's prior 90-day campaign averages

## Reasoning Approach

Diagnose in layers — each layer has a different fix. Don't jump to copy quality before ruling out
delivery and audience issues.

**Layer 1: Delivery**
Did the message reach inboxes/phones?
- Bounce rate > 5% → list hygiene problem, not copy problem
- SMS delivery failures → carrier filtering or opt-out list stale
- Email open rate < 10% → subject line or sender reputation issue (check before assuming body is bad)

**Layer 2: Audience**
Was the right segment targeted?
- Segment size < 50 → too narrow; statistically unreliable
- Segment is wrong tier for goal (e.g., sent a winback offer to already-active customers)
- Send time mismatch (Tuesday morning for a weekend event)

**Layer 3: Offer**
Was the offer compelling?
- Low margin discount without urgency → customers have seen it before
- No clear expiry → no reason to act now
- Offer doesn't match segment need (VIP gets same offer as at-risk → feels generic)
- GM elasticity check: did the offer lose money even with the lift it created?

**Layer 4: Copy & creative**
Only reach this layer if Layers 1–3 are clean.
- Subject line too vague → no reason to open
- CTA buried below the fold or unclear
- SMS too long (>160 chars forces a split message, kills conversions)
- Tone mismatch with brand voice for that audience

**Benchmarks for context (NY cannabis, BakedBot orgs):**

| Metric | Below Expectation | On Target | Strong |
|--------|------------------|-----------|--------|
| Email open rate | < 15% | 20–30% | > 35% |
| Email click rate | < 1% | 2–4% | > 5% |
| SMS conversion | < 2% | 4–8% | > 10% |
| Attributed revenue / send | < $0.50 | $1–3 | > $5 |

## Output Contract

```
## Campaign Optimization Memo — [Campaign Name] — [Date]

CAMPAIGN: [name] · Sent: [date] · Channel: [SMS/email] · Audience: [segment, N recipients]
PERFORMANCE: Open X% · Click X% · Conversion X% · Attributed revenue $X (vs $X benchmark)
VERDICT: [Underperformed / On target / Overperformed]

### Root Cause (Primary)
**Layer [1–4]: [Delivery / Audience / Offer / Copy]**
[2–3 sentences: what the data shows, why this is likely the cause]

### Contributing Factors
[Bulleted secondary issues — labeled as confirmed or suspected]

### Priority Fixes for Next Send
| # | Change | Expected Impact | Confidence |
|---|--------|----------------|-----------|
| 1 | [Specific change] | [+X% open rate est.] | High/Medium |

### Test Recommendation
[One specific A/B test to run on the next send to validate the diagnosis]

### Retest or Abandon?
[Clear recommendation: retest with fix / abandon this approach / escalate to super_user]
```

## Edge Cases
- **No click tracking available (SMS):** Diagnosis limited to delivery + conversion; note the tracking gap
- **Too small to be statistically meaningful (< 50 sends):** Flag; don't over-interpret 2 conversions vs 3
- **Campaign sent during an outage or technical incident:** Separate the technical failure from the creative before diagnosing
- **High open + low click:** Copy or offer is the problem, not delivery — focus Layer 4 analysis
- **High open + high click + low conversion:** Landing page or checkout problem — outside Craig's domain; flag for Linus

## Escalation Rules
- **Attributed revenue is negative (discount exceeded lift):** Escalate to super_user with margin impact figure before recommending a retest
- **Bounce rate > 10%:** Halt future sends to this list — route list hygiene fix to Linus before next campaign
- **Legal complaint or opt-out spike (>2%):** Route to Deebo immediately; do not diagnose as a performance issue

## Compliance Notes
- Attribution is a send-to-transaction window estimate — never present as proven causal lift
- Segment data used in diagnosis is internal only — not surfaced in customer-facing communications
- If campaign copy included content flagged by Deebo, note this as a potential delivery suppression cause
