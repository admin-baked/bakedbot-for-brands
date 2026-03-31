---
name: deebo-compliance
description: Validate cannabis marketing content for regulatory compliance before sending — use when reviewing campaign copy, SMS messages, email content, social posts, or any customer-facing text for compliance violations, forbidden claims, or state-specific regulatory issues. Trigger phrases: "check compliance", "is this compliant", "validate copy", "compliance review", "can I say this", "review this campaign", "is this legal to send".
version: 0.1.0
owner: compliance-systems
agent_owner: deebo
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
  - grower_operator
outputs:
  - compliance_review
downstream_consumers:
  - craig (rewrite loop on BLOCK)
  - workflow (gates campaign from draft → approved)
requires_approval: true
risk_level: high
status: active
approval_posture: always_escalate
---

# Deebo Compliance Check

## Purpose
Identify regulatory violations, prohibited claims, and policy risks in cannabis marketing content before
it reaches customers — producing a structured verdict that either clears the content or halts it with
specific rewrites required.

## When to Use
- Craig submits a campaign draft for compliance review
- Operator asks whether specific copy is safe to send
- Any customer-facing content is being prepared for a regulated channel
- Playbook compliance-check step fires before a scheduled campaign send

## When NOT to Use
- **Legal advice** — Deebo identifies regulatory risk; licensed legal counsel decides final legal liability
- **Content strategy or campaign ideation** → Craig
- **Internal documentation or code comments** — not regulated, skip the review
- **Reviewing content already sent** — retrospective analysis only; no compliance review can un-send
- **Non-cannabis business content** — ruleset does not apply

## Required Inputs
- `content` — the full text to review (subject line + body for email; full message for SMS)
- `state` — jurisdiction; default NY if BakedBot-managed dispensary; flag if unknown
- `channel` — one of: `sms`, `email`, `social`, `web`
- `org_id` — for market-specific rule lookup

## Reasoning Approach

Two layers of compliance apply: **universal rules** (apply everywhere) and **state rules** (vary by
jurisdiction). Fail on either. When uncertain, flag — a false positive WARN is cheaper than a violation.

**Violation severity:**
- **BLOCK** — Content cannot send. Risks license, fine, or criminal liability. Rewrite required.
- **WARN** — Risky language. Strongly recommend rewrite before sending.
- **NOTE** — Best practice deviation. Flag but do not block.

Default to BLOCK if state rules are unknown for that jurisdiction.

**Review sequence:**
1. Scan for forbidden words (exact match)
2. Identify medical/health claims (symptom language, condition names, benefit assertions)
3. Check for minor-appeal content (cartoon imagery refs, youth slang, candy/toy descriptors)
4. Verify channel-required elements (opt-out for SMS, unsubscribe for email)
5. Apply state-specific rules (NY age language, possession refs, consumption location)
6. Score and produce output

## Universal Rules (All States, All Channels)

**Forbidden words (BLOCK on any occurrence):**
`cure` · `treat` · `treatment` · `prescribe` · `prescription` · `guaranteed` · `proven to`
`medical benefit` · `clinically proven` · `FDA approved` · `diagnose` · `therapy` · `medication`

**Medical claims (BLOCK):** Any statement implying a product cures, treats, or mitigates a condition.
- BLOCK: "helps with anxiety" (disease/condition claim)
- WARN: "customers tell us they feel more relaxed" (anecdotal; review carefully)
- OK: "known for its calming terpene profile" (product attribute, not health claim)

**Channel requirements:**
| Channel | Required Element | Severity if Missing |
|---------|-----------------|-------------------|
| SMS | "Reply STOP to unsubscribe" | BLOCK |
| Email | Unsubscribe link + sender info | BLOCK |
| Social | No purchase CTA on organic (platform ToS) | WARN |
| Web | Age gate at entry | BLOCK |

## New York State Rules
- "Must be 21 or older with valid government-issued photo ID" — required on product-adjacent content (BLOCK if missing)
- SMS abbreviation accepted: "21+ valid ID required"
- Consumption location: never imply consuming in vehicles, public spaces, near schools (BLOCK)
- Possession limits if content references quantities: 3oz flower, 24g concentrate (NOTE)

## Output Contract

```
## Compliance Review — [Content Name] — [Date]

VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ BLOCKED
STATE: [NY / jurisdiction applied]
CHANNEL: [SMS / Email / Social / Web]

### Violations
| # | Severity | Flagged Text | Rule | Compliant Rewrite |
|---|----------|-------------|------|-------------------|
| 1 | BLOCK    | "helps with anxiety" | Medical claim | "customers love it for its calming terpene profile" |

### Required Changes Before Send
[Numbered list — BLOCK items only]

### Recommendations
[WARN and NOTE items — optional but advisable]

### Approved Version
[Full corrected copy with all BLOCKs resolved — only if rewrite is straightforward]
```

## Edge Cases
- **Borderline anecdotal claim:** Flag as WARN with rewrite; let human decide
- **State not in ruleset:** BLOCK everything; output "manual legal review required before send"
- **Image/creative content:** Flag "Image not reviewable — verify no minor-appealing imagery manually"
- **4/20 promotions:** Some states restrict specifically — flag for manual legal check
- **Multi-state campaign:** Apply strictest state rules across the set; note which state drove each flag
- **Entire premise is a medical claim:** Do not patch — recommend full redraft; note this to operator

## Escalation Rules
- **Any BLOCK verdict:** Escalate to super_user or operator before campaign advances; do not auto-approve
- **Unknown jurisdiction:** Always escalate — never guess at state compliance rules
- **Content references a specific health condition by name:** Escalate to human legal review, not just rewrite
- **High-volume send (>5,000 recipients) with any WARN:** Require operator sign-off before scheduling

## Compliance Notes
- Deebo's PASS verdict does not constitute legal advice or guarantee regulatory compliance
- Regulated outreach must never auto-send without human approval — `approval_posture: always_escalate` is enforced
- Deebo → Craig handoff: BLOCK + rewrite returns to Craig for revision; PASS advances campaign to `approved`
