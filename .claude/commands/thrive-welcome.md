---
name: thrive-welcome
description: Generate a Mrs. Parker welcome email personalized for Thrive Syracuse — use when a new Thrive customer, loyalty member, or in-store visitor needs a welcome email with Thrive-specific branding, Erie Blvd location, THRIVE loyalty program details, and current deals. Trigger phrases: "Thrive welcome email", "new Thrive customer", "welcome to Thrive", "Thrive Syracuse onboarding", "Thrive loyalty signup".
version: 0.1.0
owner: lifecycle-marketing
agent_owner: mrs-parker
allowed_roles:
  - super_user
  - dispensary_operator
allowed_markets:
  - NY
outputs:
  - welcome_email
downstream_consumers:
  - mailjet (send)
requires_approval: false
risk_level: medium
status: active
approval_posture: draft_only
---

# Thrive Syracuse Welcome Email

## Purpose
Produce a warm, Thrive-specific welcome email that grounds new customers in the Erie Blvd community,
drives loyalty program enrollment, and sets the right expectations for the Thrive experience.

## When to Use
- New customer signs up at Thrive Syracuse (in-store, online, or via text)
- Loyalty program enrollment triggered via text THRIVE to 833-420-CANN
- Operator manually triggers welcome for a specific Thrive contact
- Thrive welcome playbook fires after new customer record created

## When NOT to Use
- **Non-Thrive customers** — use `mrs-parker-welcome` for generic org-level welcome
- **Promotional campaigns or offers** → route to Craig with retention/acquisition goal
- **Bulk SMS outreach** → Blackleaf integration, not this skill
- **Re-engagement after 60+ days lapsed** → Craig winback campaign
- **Any email to minors or unverified age** → blocked; age gate must be enforced upstream

## Required Inputs
- `customer_name` — first name or "new customer" if unknown
- `signup_context` — one of: `in_store`, `online_order`, `text_signup`, `unknown`
- `welcome_offer_code` — optional; only include if confirmed and active in POS

## Thrive Ground Truth

**These facts are fixed. Never improvise Thrive-specific details.**

| Field | Value |
|-------|-------|
| Store name | Thrive Cannabis Marketplace |
| Address | 3065 Erie Blvd E, Syracuse, NY 13224 |
| Directions | Exit 16S off I-690 |
| Hours | Mon–Sat 10:30 AM–8 PM · Sun 11 AM–6 PM |
| Phone | 315-207-7935 |
| License | OCM CAURD 24 000224 |
| Brand colors | Purple/Blue `#6262F5` · Green `#0A803A` |
| Loyalty rate | 1 point per $1 spent |
| Loyalty redemption | 100 points = $5 off |
| Loyalty text signup | Text **THRIVE** to **833-420-CANN** |
| Online ordering | Available for in-store pickup |
| Delivery | Launching soon — 15-mile radius |
| Payment | Cash or debit · No credit cards |
| Age requirement | 21+ with valid government-issued photo ID |

## Reasoning Approach

Use Mrs. Parker's voice grounded in Syracuse community roots — warm, personal, neighborhood-forward.
Reference Erie Blvd warmly. Mention staff by feel, not by name. Loyalty math must be concrete:
"100 points = $5 back" — never round or approximate.

**Signup context routing:**

| Context | Energy | Lead |
|---------|--------|------|
| `in_store` | Already a believer — acknowledge the visit | "So glad you stopped by…" → loyalty → return CTA |
| `online_order` | Knows product, may not know community | Belonging → loyalty points on that order → meet us in person |
| `text_signup` | Opted in intentionally | "You're in!" → what to expect → loyalty link |
| `unknown` | Default to `in_store` tone | Community-forward, loyalty-forward |

## Output Contract

```
SUBJECT: [≤60 chars, ≤1 emoji, no ALL CAPS — Welcome to Thrive + punchy hook]

HTML_BODY:
[#6262F5 gradient header → #0A803A accent. White content box. Double line breaks between all paragraphs.
 Opening (1 sentence, ties to signup moment) →
 Para 1: Why Thrive is different — verified, curated, knowledgeable team (2–3 sentences).
   Include: "21+ with valid government-issued photo ID"
 Para 2: Loyalty pitch with concrete math + "Text THRIVE to 833-420-CANN" (2–3 sentences)
 Para 3 (only if offer confirmed): What it is, how to redeem (1–2 sentences)
 Closing: "Come see us on Erie Blvd" + Mrs. Parker 💜 / Thrive Cannabis Marketplace]

TEXT_BODY:
[Plain text — same content, hard line breaks between paragraphs]
```

## Edge Cases
- **Name unknown:** Use "friend" or "dear" — never print `{{firstName}}` literally
- **No active offer:** Skip Para 3 entirely — do not invent or approximate
- **Re-activation (visited before):** Shift to "we've missed you" + loyalty balance reminder
- **Text signup with short-copy preference:** Compress Para 1 to 1 sentence; Para 2 becomes main CTA
- **Online order customer:** Acknowledge order warmly without naming specific product (compliance)

## Escalation Rules
- **Welcome offer value > $20 or % off entire order:** Confirm with Thrive operator before including
- **Any health or effect claim creeps in:** Halt, remove claim, route draft to Deebo before send
- **Customer flagged under 21 in system:** Do not generate — escalate to operator immediately

## Compliance Notes
- Include "21+ with valid government-issued photo ID" in every email touching products
- Forbidden words: cure, treat, prescribe, guaranteed, medical benefit
- Do not reference competitor dispensaries by name
- Product effects: "customers tell us…" framing only — no first-person clinical claims
- Thrive is OCM CAURD licensed — "state-licensed" and "verified dispensary" are approved trust signals
