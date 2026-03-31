---
name: anomaly-to-action-memo
description: Interpret a detected anomaly or signal and produce a decision-ready action memo — use when an alert, metric deviation, or operational signal needs to be turned into a prioritized recommendation with evidence, owner, and next step. Trigger phrases: "what does this anomaly mean", "something looks off", "explain this alert", "revenue is down", "traffic dropped", "flag this for review", "what should we do about this".
version: 0.1.0
owner: ops-intelligence
agent_owner: pops
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - action_memo
downstream_consumers:
  - super_user inbox
  - craig (if campaign action recommended)
  - linus (if technical root cause detected)
requires_approval: false
risk_level: medium
status: active
approval_posture: recommend_only
---

# Anomaly to Action Memo

## Purpose
Transform a raw signal — a metric deviation, alert, or operational flag — into a concise, evidence-based
action memo that tells a human or downstream agent exactly what happened, why it matters, and what to do
next. This skill does not execute actions; it produces recommendations.

## When to Use
- A metric deviates significantly from baseline (revenue, traffic, conversion, loyalty points redeemed)
- A playbook or monitoring system fires an alert that needs human interpretation
- An operator notices something unexpected and asks what it means
- Ezal, Pops, or a cron job surfaces a change requiring triage before action

## When NOT to Use
- **Executing a remediation** — this skill recommends; a human or workflow executes
- **Compliance violations** — route directly to Deebo; anomaly framing is not appropriate for regulatory issues
- **Campaign copy generation** — if the memo recommends a campaign, hand off to Craig; don't write copy here
- **Technical debugging** — if root cause is a code/infrastructure issue, route to Linus after memo is produced
- **Pricing changes** — memo can flag a pricing anomaly; Money Mike handles the price recommendation

## Required Inputs
- `signal` — the anomaly description (metric name, direction, magnitude, time window)
- `baseline` — what normal looks like (prior period, expected range, or benchmark)
- `org_id` and `store` — for context
- `related_data` — any supporting metrics or events (optional but strongly recommended)
- `date_range` — the period the anomaly covers

## Reasoning Approach

Think in four layers:

**1. Characterize the anomaly**
- What changed? (metric, direction, magnitude)
- When did it start?
- Is it a spike, a trend, or a one-time event?
- How significant is it relative to baseline? (express as % deviation)

**2. Separate evidence from inference**
- What do the numbers actually show? (evidence)
- What are the likely causes based on patterns? (inference — label it as such)
- What would confirm or rule out each cause?

**3. Assess business impact**
- Revenue / margin at risk or gained?
- Customer experience affected?
- Compliance or operational risk?
- Urgency: immediate / this week / monitor

**4. Recommend bounded next actions**
- One primary action with a clear owner
- One monitoring trigger (what to watch and when to escalate further)
- Do not recommend more than 3 actions — prioritize

Confidence rule: if evidence is incomplete, say so explicitly and reduce confidence.
Never fabricate supporting data to fill gaps.

## Output Contract

```
## Action Memo — [Signal Name] — [Store] — [Date]

URGENCY: [Immediate / This Week / Monitor]
CONFIDENCE: [High / Medium / Low — note reason if Low]
IMPACTED METRIC: [metric name, magnitude, direction]

### What Happened
[1–2 sentences: the anomaly in plain language]

### Evidence
[Bullet list of actual data points — label each as confirmed or estimated]

### Likely Causes
[Ranked list — most probable first. Label as evidence-based or inferred.]

### Business Impact
[Revenue / margin / customer impact — quantify where possible]

### Recommended Actions
| # | Action | Owner | Urgency |
|---|--------|-------|---------|
| 1 | ...    | ...   | ...     |

### Monitor
[What to watch next, threshold for escalation, when to revisit]
```

## Edge Cases
- **Single data point deviation:** Flag as possibly noise. Recommend monitoring before acting.
- **Multiple metrics moving together:** Likely a shared root cause — analyze as one event, not separately
- **Anomaly in compliance-sensitive area:** Escalate to Deebo in addition to producing the memo
- **No baseline available:** State "baseline not established — cannot assess significance" and recommend setting one
- **External event known (holiday, weather, competitor promo):** Include as likely cause; note it as context, not confirmed root cause

## Escalation Rules
- **Revenue impact > $1,000 in a single day:** Escalate to super_user immediately; do not wait for next briefing cycle
- **Compliance or regulatory dimension detected:** Route to Deebo concurrently with delivering the memo
- **Confidence is Low and urgency is Immediate:** Explicitly flag — do not let a low-confidence urgent memo go unreviewed
- **Technical root cause suspected:** Tag Linus in the recommended actions as owner

## Compliance Notes
- Do not include customer PII in the memo beyond aggregate counts
- Revenue and margin figures in memos are for internal review only — not for external publication
- Anomaly memos for regulated promotional activity should note Deebo review status
