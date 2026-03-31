---
name: executive-brief
description: Produce a concise executive brief or portfolio digest for a super user or operator — use when summarizing multi-account performance, cross-org anomalies, top actions needed, or weekly business status for leadership review. Trigger phrases: "executive summary", "weekly brief", "portfolio digest", "top actions this week", "what needs my attention", "board update", "cross-account summary".
version: 0.1.0
owner: platform
agent_owner: pops
allowed_roles:
  - super_user
outputs:
  - executive_brief
downstream_consumers:
  - super_user inbox
  - board-update-drafter (if escalated to board format)
requires_approval: false
risk_level: low
status: active
approval_posture: draft_only
---

# Executive Brief

## Purpose
Give a super user or leadership stakeholder a single, scannable briefing that surfaces what matters
most across the portfolio — without requiring them to drill into individual accounts. Designed for
people who need to act fast, not read long.

## When to Use
- Weekly or daily portfolio digest requested by a super user
- End-of-period summary across multiple dispensary or brand accounts
- Pre-meeting prep for an operator or investor review
- Escalated anomalies that warrant leadership visibility
- Board or executive update drafting

## When NOT to Use
- **Single-store daily ops review** → use `daily-dispensary-ops-review` (Pops, dispensary pack)
- **Campaign performance analysis** → Craig owns campaign reporting
- **Compliance incident reporting** → Deebo structures those; brief can reference but not replace
- **Real-time alerts** → anomaly-to-action-memo is more appropriate for urgent single signals
- **Customer-facing output** — this brief is internal only; never send to customers

## Required Inputs
- `scope` — list of org_ids or "all" for full portfolio
- `date_range` — period to cover (default: last 7 days)
- `focus_areas` — optional: revenue, compliance, campaigns, loyalty, anomalies (default: all)
- `format` — one of: `digest` (short), `memo` (narrative), `board` (formal)

## Reasoning Approach

Executive briefs fail when they bury the lead. Lead with what requires action, then explain why.

**Structure principle — Answer these in order:**
1. What happened this period? (2–3 sentences, numbers only)
2. What needs attention right now? (ranked action list)
3. What's going well? (1–2 items — signal health, don't just list problems)
4. What's coming up? (next 7 days — risks, decisions, scheduled events)

**Synthesis rules:**
- Aggregate up: don't list every store — surface patterns and outliers
- Quantify impact: "$X at risk" is more useful than "revenue is down"
- Attribute clearly: "Thrive Syracuse" not "one of your stores"
- One recommendation per issue — not a menu of options
- Confidence label on any projection or estimate

**Format calibration:**
| Format | Length | Use when |
|--------|--------|----------|
| `digest` | 150–250 words | Daily scan, time-constrained reader |
| `memo` | 400–600 words | Weekly review, needs context |
| `board` | Structured sections, formal language | Investor or board audience |

## Output Contract

**`digest` format:**
```
## BakedBot Portfolio Brief — [Date Range]

THIS PERIOD: [Revenue total · Anomalies: N · Campaigns sent: N · Compliance flags: N]

TOP ACTIONS NEEDED:
1. [Action] — [Owner] — [Urgency]
2. [Action] — [Owner] — [Urgency]
3. [Action] — [Owner] — [Urgency]

HIGHLIGHTS: [1–2 things going well]

COMING UP: [Key dates, decisions, or risks next 7 days]
```

**`memo` format:**
```
## Executive Brief — [Scope] — [Date Range]

### Performance Summary
[2–3 sentences with key numbers]

### Requires Action
[Ranked list with owner and urgency for each]

### Strengths
[1–2 items — specific, not generic]

### Outlook
[Risks and opportunities next 7 days]

### Appendix
[Links to supporting anomaly memos or reports — not inline data]
```

## Edge Cases
- **No data for period:** State clearly — do not fill with placeholders or prior period data without labeling
- **Single account in scope:** Brief still follows the same format — just narrower scope
- **Conflicting signals:** Note the conflict explicitly — do not smooth over inconsistencies
- **Upcoming compliance deadline:** Always surface in "Coming Up" even if no other action is needed

## Escalation Rules
- **P0 anomaly detected during brief synthesis:** Produce anomaly-to-action-memo first, reference in brief
- **Revenue decline > 20% week-over-week:** Flag as critical in brief header; notify super_user directly
- **Compliance incident open:** Do not summarize away — state open incident status explicitly with Deebo status

## Compliance Notes
- Brief is internal — do not expose customer PII or individual transaction details
- Revenue projections labeled as estimates — never presented as guaranteed
- If brief references regulated messaging activity, include Deebo review status
