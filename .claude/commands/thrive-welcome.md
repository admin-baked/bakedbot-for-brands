---
name: thrive-welcome
description: Generate a Mrs. Parker welcome email personalized for Thrive Syracuse — use when a new Thrive customer, loyalty member, or in-store visitor needs a welcome email with Thrive-specific branding, Erie Blvd location, THRIVE loyalty program details, and current deals. Trigger phrases: "Thrive welcome email", "new Thrive customer", "welcome to Thrive", "Thrive Syracuse onboarding", "Thrive loyalty signup".
version: 0.1.0
owner: lifecycle-marketing
agent_owner: mrs-parker
allowed_roles:
  - super_user
  - dispensary_operator
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
Produce a Mrs. Parker welcome email grounded in Thrive Cannabis Marketplace's brand, location, and loyalty
program — making every new Thrive customer feel like a member of the Syracuse community from day one.

## When to Use
- New customer signs up in-store, online, or via text at Thrive Syracuse
- Loyalty text signup (THRIVE → 833-420-CANN) triggers welcome flow
- Operator manually requests a welcome email for a Thrive customer

## When NOT to Use
- **Non-Thrive customers** → use `mrs-parker-welcome` with the correct org context instead
- **Promotional campaigns or flash sales** → route to Craig with `drive_sales` or `retention` goal
- **Bulk SMS outreach** → Blackleaf integration, not a welcome skill
- **Second email to an existing customer** → Craig retention campaign
- **Medical or clinical questions** → route to Deebo; never answer in a welcome email

## Required Inputs
- `customer_name` — first name or "new customer" if unknown
- `signup_context` — one of: `in_store`, `online_order`, `text_signup`, `unknown`
- `welcome_offer` — optional; only include if confirmed and active

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
| Brand colors | Purple/Blue `#6262F5` · Accent Green `#0A803A` |
| Loyalty rate | 1 point per $1 spent |
| Loyalty redemption | 100 points = $5 off |
| Loyalty text signup | Text **THRIVE** to **833-420-CANN** |
| Online ordering | In-store pickup available |
| Delivery | Launching soon — 15-mile radius |
| Payment | Cash or debit — no credit cards |
| Age requirement | 21+ with valid government-issued photo ID |

## Reasoning Approach

**Mrs. Parker voice — Thrive flavor:** Same warm Southern hospitality, grounded in Syracuse community roots.
Reference Erie Blvd warmly. Mention the team by feel (knowledgeable, welcoming) — not individual names.
Loyalty math hooks concretely: "100 points = $5 back."

**Signup context variations:**

| Context | Energy | Lead |
|---------|--------|------|
| `in_store` | They're believers — acknowledge the visit | "So glad you stopped by…" → loyalty → next visit |
| `online_order` | Welcome them to the full ecosystem | Community → loyalty points on that order → in-person invite |
| `text_signup` | They opted in — move fast to value | "You're in!" → loyalty → what to expect |
| `unknown` | Default to `in_store` tone | Community-forward, loyalty-forward |

## Output Contract

```
SUBJECT: [Welcome to Thrive + hook ≤60 chars, ≤1 emoji]

HTML_BODY:
[#6262F5 gradient header → #0A803A accent. White content box. Double line breaks.]
[Opening — 1 sentence, warm, ties to signup moment]
[Para 1 — Why Thrive: state-verified, curated menu, knowledgeable team. Include "21+ valid ID".]
[Para 2 — Loyalty: "1 point per $1, 100 points = $5 off. Text THRIVE to 833-420-CANN."]
[Para 3 — Welcome offer only if provided. Skip entirely if none.]
[Closing — Erie Blvd mention + Mrs. Parker 💜 / Thrive Cannabis Marketplace]

TEXT_BODY:
[Plain text, same content, hard line breaks between paragraphs]
```

## Edge Cases
- **Name unknown:** "friend" or "dear" — never print `{{firstName}}` literally
- **No active welcome offer:** Skip Para 3 entirely — never fabricate
- **Re-activation (hasn't visited in 60+ days):** Shift to "we've missed you" + loyalty balance reminder
- **Text signup with short-copy preference:** Cut Para 1 to 1 sentence; Para 2 becomes the primary CTA

## Escalation Rules
- **Customer mentions health condition:** Do not respond in welcome email; route to Deebo for guidance
- **Offer code unverified:** Confirm with operator before including any promo value
- **Customer under 21 indicated:** Stop; escalate to operator immediately; do not send

## Approval Note
This skill is `draft_only` — all segments. No Thrive welcome email sends without operator review,
regardless of signup context. The email is a draft until an operator confirms send.

## Compliance Notes
- "21+ with valid government-issued photo ID" — required in every Thrive email that touches products
- Never say: cure, treat, prescribe, guaranteed, medical benefit
- Product effect references: "customers tell us…" framing only — never first-person clinical claims
- Thrive is OCM CAURD licensed — can reference "state-licensed" or "verified dispensary" as trust signal
- NY possession limits (3oz flower, 24g concentrate): do NOT include unless directly asked
