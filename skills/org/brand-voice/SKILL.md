---
name: brand-voice
description: Apply BakedBot brand voice standards to any customer-facing content — use when generating or reviewing copy that must match a dispensary or brand's approved tone, language patterns, and messaging constraints. Trigger phrases: "does this match our voice", "write in our brand voice", "on-brand copy", "brand guidelines", "tone check".
version: 0.1.0
owner: platform
agent_owner: craig
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - voice_reviewed_copy
  - brand_alignment_notes
downstream_consumers:
  - craig (copy generation)
  - mrs-parker (email generation)
  - smokey (customer messaging)
requires_approval: false
risk_level: low
status: active
approval_posture: inform_only
---

# Brand Voice

## Purpose
Encode a dispensary or brand's approved voice, tone, and language patterns so any agent or human
producing content knows what "on-brand" looks and sounds like — without needing to ask every time.

## When to Use
- Before generating customer-facing copy for a specific brand account
- When reviewing draft content for voice consistency
- When onboarding a new brand account and documenting their standards
- When an operator reports that copy "doesn't sound like us"

## When NOT to Use
- **Compliance review** — voice is not a compliance gate; use Deebo for regulatory checks
- **Factual claims about products** — voice does not override accuracy requirements
- **Internal-only communications** — slack messages, code comments, docs; voice standards are customer-facing only
- **Deterministic field values** (prices, hours, addresses) — these are facts, not voice decisions

## Required Inputs
- `org_id` or `brand_slug` — to look up stored brand guide
- `content` — the copy to review or the context to generate within
- `channel` — email, SMS, social, web, in-app (tone calibration varies by channel)
- Brand guide data (pulled from `extractBrandData()` or stored brand config)

## Reasoning Approach

Every brand has three voice dimensions. Assess all three before writing or reviewing:

**1. Personality axis**
Where does the brand sit?
- Chill & approachable ↔ Professional & authoritative
- Playful & punchy ↔ Warm & nurturing
- Educational & expert ↔ Conversational & peer

**2. Language patterns**
- Approved words / phrases the brand uses consistently
- Words or phrases the brand explicitly avoids
- Sentence length preference (short punchy vs. flowing descriptive)
- Emoji usage (never / occasional / frequent)

**3. Channel calibration**
| Channel | Tone adjustment |
|---------|----------------|
| SMS | Shortest, most direct — 160 chars max; urgency-appropriate |
| Email | Warmer, more narrative; subject line punchy, body conversational |
| Social | Match the brand's existing social personality; hashtag discipline |
| In-app chat | Most casual, real-time feel; quickest responses |

**BakedBot platform defaults** (apply when brand-specific guide is absent):
- Warm, community-forward, never corporate
- Cannabis-literate without being exclusive
- Inclusive — never assumes prior knowledge
- Compliant framing as default — no medical claims embedded in copy even casually

## Output Contract

**For voice review:**
```
VOICE REVIEW — [Brand] — [Channel] — [Date]

ALIGNMENT: ✅ On-brand / ⚠️ Partial / ❌ Off-brand

FLAGGED PHRASES:
| Original | Issue | Suggested Revision |
|----------|-------|-------------------|

OVERALL NOTES:
[1–2 sentences on what's working and what to adjust]
```

**For voice-guided generation:**
Produce the requested copy artifact with a one-line note:
`[Voice applied: warm/approachable/community-forward — adjusted for SMS brevity]`

## Edge Cases
- **No brand guide on file:** Use BakedBot platform defaults; note "brand guide not configured — using platform defaults"
- **Brand guide conflicts with compliance:** Compliance wins. Flag the conflict to the operator.
- **Multiple brands in one org:** Apply the brand guide for the specific `brand_slug` in context
- **New brand account:** Generate a brand guide draft from `extractBrandData(url)` output; present for operator review

## Escalation Rules
- **Brand guide missing and content is high-visibility (campaign, launch):** Ask operator to confirm voice before proceeding
- **Copy passes voice but triggers compliance concern:** Route to Deebo before delivery

## Compliance Notes
- Brand voice never overrides regulatory requirements
- "Sounds like us" is not a compliance defense
- Medical-adjacent language is always flagged even if it matches brand personality
