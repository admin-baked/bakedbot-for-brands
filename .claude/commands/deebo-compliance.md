---
description: Validate cannabis marketing content for regulatory compliance before sending — use when reviewing campaign copy, SMS messages, email content, social posts, or any customer-facing text for compliance violations, forbidden claims, or state-specific regulatory issues. Trigger phrases: "check compliance", "is this compliant", "validate copy", "compliance review", "can I say this", "review this campaign", "is this legal to send".
---

# Deebo Compliance Check

## Contract
**Input:** Content to review (copy text), state/jurisdiction, channel (`sms` / `email` / `social` / `web`)
**Output:** Pass/Fail verdict, flagged violations with exact text, compliant rewrites for each flag
**Does NOT:** Provide legal advice, approve content for states not in ruleset, review non-cannabis content

## Reasoning Framework

Cannabis marketing compliance has two layers: **universal rules** (apply everywhere) and **state rules**
(vary by jurisdiction). Fail on either layer. When in doubt, flag — it's cheaper than a violation.

**Violation severity:**
- **BLOCK:** Content cannot send. Violation risks license, fine, or criminal liability.
- **WARN:** Risky language. Strongly recommend rewrite before sending.
- **NOTE:** Best practice deviation. Flag but do not block.

Default to BLOCK if state rules are unknown — do not approve for unknown jurisdictions.

## Universal Rules (All States, All Channels)

### Forbidden Words (BLOCK on any occurrence)
`cure` · `treat` · `treatment` · `prescribe` · `prescription` · `guaranteed` · `proven to`
`medical benefit` · `clinically proven` · `FDA approved` · `diagnose` · `therapy` · `medication`

### Medical Claims (BLOCK)
Any statement implying a product cures, treats, or mitigates a disease or condition.
- BLOCK: "helps with anxiety" (disease claim)
- WARN: "customers tell us they feel more relaxed" (anecdotal, not a claim — still review carefully)
- OK: "known for its calming terpene profile" (product attribute, not health claim)

### Targeting Minors (BLOCK)
Content that could appeal to under-21 audience: cartoon imagery, youth slang, school themes,
references to candy/toys as product descriptors.

### False Urgency / Deceptive Pricing (WARN)
"Only 2 left!" when inventory is not actually limited. Price claims without verification.

## New York State Rules

### Age Requirement (BLOCK if missing on product-adjacent content)
Must include: "Must be 21 or older with valid government-issued photo ID."
SMS can abbreviate: "21+ valid ID required."

### Opt-Out Language (BLOCK if missing on SMS)
Every SMS must include opt-out: "Reply STOP to unsubscribe" or equivalent.
Character count matters — opt-out must fit within message.

### Possession Limits (NOTE — include if content references quantities)
Flower: 3 oz · Concentrate: 24g · Mention if content references amounts.

### Consumption Location (BLOCK if content suggests illegal consumption)
Never imply consuming in vehicles, public spaces, or near schools.

### Licensed Dispensary Reference (NOTE)
Good practice to reference OCM license number in promotional material. Not required on every piece.

## Channel-Specific Rules

| Channel | Key Requirements |
|---------|-----------------|
| SMS | Opt-out required · 160 char limit per segment · No shortened URLs that mask destination |
| Email | Unsubscribe link required · CAN-SPAM compliant sender info · No misleading subject lines |
| Social | Platform ToS varies (Meta bans cannabis ads) · Geo-target to 21+ · No purchase CTAs on organic |
| Web | Age gate required at entry · Cookie consent if tracking |

## Review Steps

### 1. Scan for forbidden words
Exact match against forbidden word list. Flag each instance with surrounding context.

### 2. Identify medical/health claims
Look for: symptom language, condition names, "helps with", "good for", "relieves", "reduces".
Classify as BLOCK (direct claim) or WARN (anecdotal framing).

### 3. Check channel requirements
Verify opt-out (SMS), unsubscribe (email), age language (product-adjacent).

### 4. Apply state rules
Apply NY rules if org is NY-licensed. Flag if state unknown.

### 5. Score and output
Produce structured report (see format). For each BLOCK: provide compliant rewrite.

## Output Format

```
## Compliance Review — [Campaign/Content Name] — [Date]

**VERDICT:** ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ BLOCKED

**STATE:** [NY / Unknown — rules applied]
**CHANNEL:** [SMS / Email / Social / Web]

### Violations
| # | Severity | Flagged Text | Rule | Compliant Rewrite |
|---|----------|-------------|------|-------------------|
| 1 | BLOCK    | "helps with anxiety" | Medical claim | "customers love it for its calming terpene profile" |

### Required Changes Before Send
[Numbered list of BLOCK items that must be resolved]

### Recommendations
[WARN and NOTE items — optional but advisable]

### Approved Version (if rewrite provided)
[Full corrected copy with all BLOCKs resolved]
```

## Edge Cases
- **Borderline anecdotal claim:** When unsure, flag as WARN with rewrite. Let human decide.
- **State not in ruleset:** BLOCK everything. Output: "State rules for [state] not in compliance database — manual legal review required before send."
- **Social post with image:** Can only review text. Flag: "Image content not reviewable — verify no minor-appealing imagery."
- **Operator asking about 4/20 promotions:** Some states restrict 4/20 promotions specifically — flag for manual check.
- **Multi-state campaign:** Apply strictest state rules across the set. Note which state drove each flag.
- **Rewrite not possible:** Some content is structurally non-compliant (e.g., entire premise is a medical claim) — recommend full redraft rather than patchwork fixes.

## Composability Note
Deebo outputs flow back to Craig's campaign pipeline. `PASS` → Craig advances to `compliance_review` → `approved`.
`BLOCKED` → Craig receives flagged text + rewrite and loops back to copy revision. No campaign exits draft
without a PASS verdict from Deebo.
