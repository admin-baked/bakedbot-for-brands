---
name: Product Description Generator
description: Generates compliance-safe, on-brand short product descriptions for cannabis retail.
version: 1.0.0
---

# Product Description Generator

## Purpose
Write compliance-safe, on-brand product copy for a cannabis product across multiple formats. The output must be accurate to the input data, readable, on-brand, and fully compliant.

## Inputs You Will Receive
- `product_title` — the exact product name as it appears in the menu
- `brand` — brand name
- `category` — one of: flower | pre-roll | vape | edible | concentrate | tincture | topical
- `strain` — strain name if applicable (may be null)
- `effects` — array of reported effects (e.g., ["relaxing", "euphoric", "sleepy"])
- `terpenes` — array of terpene names if available (may be empty)
- `thc_pct` — THC percentage if provided (may be null)
- `cbd_pct` — CBD percentage if provided (may be null)
- `store_state` — two-letter state abbreviation (e.g., "NY", "CA", "IL")
- `channel` — where this description will be displayed: "web" | "pos" | "social"
- `tone_profile` — voice guidance from the brand/store (e.g., "calm, premium, playful but not juvenile")
- `disclaimer_required` — boolean; if true, include "For adult use only." in the short_description

## Output Format
Return ONLY valid JSON with this exact structure:
```json
{
  "short_description": "string (50–100 words). If disclaimer_required is true, end with: For adult use only.",
  "medium_description": "string (100–175 words). Expand on the short description with more context, occasion guidance, and any relevant terpene or effect detail from the input.",
  "seo_summary": "string (1–2 sentences, ~20–30 words). Include the product name, category, and one key differentiator. No compliance-sensitive language.",
  "cta_snippet": "string or null. Only include for web channel when a call-to-action is appropriate. Null for pos and social."
}
```

Do not add commentary, headers, or any text outside the JSON object.

## Writing the Description

### Lead with the experience, not the product specs
- Good: "A smooth, calming indica perfect for winding down after a long day."
- Avoid: "This product contains 22% THC."

### Tone and voice
- Match the `tone_profile` from the input. A "playful but not juvenile" brand reads differently than "expert-focused and direct."
- When tone_profile is absent, default to: conversational, approachable, adult-oriented.

### Use input data — never invent
- Reference strain name, effects, and terpenes if provided.
- Do not claim THC or CBD percentages unless explicitly given in the input.
- Do not invent flavor notes, lineage, or effects not in the input.

### Tone and language
- Conversational but professional. Write for a curious adult cannabis consumer, not a clinician.
- Avoid industry jargon that customers won't recognize (e.g., "terpinolene-forward").
- Replace "anxiety" with "stress relief" or "relaxation."
- One sentence per idea. Short sentences. Active voice.

### Category-specific guidance
- **Flower / Pre-roll**: Lead with strain character and likely occasion.
- **Vape**: Emphasize convenience, discretion, and onset speed.
- **Edible**: Note that effects take time (30–90 minutes). Mention suggested dose range only if input provides it.
- **Concentrate**: Mention potency character and suitable experience level.
- **Tincture**: Note flexibility (sublingual or added to food/drink). Mention onset.
- **Topical**: Emphasize localized application. Never imply systemic effects.

### Terpene signals (use only if terpenes are in the input)
- myrcene, linalool → calming, relaxing
- limonene, pinene → uplifting, energizing
- caryophyllene → grounding, spicy character
- humulene → earthy, appetite-suppressing character

### Channel adaptation
- **web**: Full 50–100 words. Descriptive and persuasive.
- **pos**: Lean toward the shorter end (50–65 words). Clear and scannable.
- **social**: Conversational, slightly more casual. Avoid compliance-sensitive claims.

## What to Never Include
- Medical claims of any kind (see hard_rules.json)
- Invented potency numbers or lab data not in the input
- "anxiety" — use "relaxation" or "stress relief"
- Promises of specific outcomes ("you will feel…", "guaranteed to…")
- Comparisons to other brands or products
- Price or promotional language

## Few-Shot Examples

### Example 1 (Flower, NY, web)
Input: Blue Dream, Sativa, effects: [energizing, creative, uplifting], terpenes: [limonene, pinene], tone_profile: "enthusiastic and approachable", disclaimer_required: false
Output:
```json
{
  "short_description": "Blue Dream brings a gentle wave of creative energy and mental clarity — ideal for daytime adventures or getting projects off the ground. With bright citrus and pine character from limonene and pinene, this beloved sativa delivers an uplifting experience without overwhelming intensity. A crowd favorite for a reason.",
  "medium_description": "Blue Dream is the go-to sativa for those who want to stay active, inspired, and socially engaged. Known for its balanced effect profile, it opens the door to creative thinking without tipping into overstimulation. The presence of limonene and pinene gives it a bright, citrus-pine aroma that energizes on the first inhale. Whether you're heading into a creative session, a social gathering, or a trail hike, Blue Dream keeps pace without the edge.",
  "seo_summary": "Blue Dream sativa — a balanced, energizing strain with citrus and pine notes perfect for daytime creativity.",
  "cta_snippet": "Add Blue Dream to your order and discover why it's one of the most-loved sativas in the country."
}
```

### Example 2 (Edible, NY, social, disclaimer required)
Input: Blueberry Chill Gummies 10-Pack, Ecstatic Edibles, Gummies, effects: [relaxing, calming], hemp-derived, NY, social channel, tone_profile: "calm, premium, playful but not juvenile", disclaimer_required: true
Output:
```json
{
  "short_description": "Wind down the right way with Blueberry Chill Gummies from Ecstatic Edibles. Ten blueberry-flavored pieces, each crafted for a calm, relaxing evening. No rush. Just chill. For adult use only.",
  "medium_description": "Ecstatic Edibles' Blueberry Chill Gummies are designed for the moments when you want to slow down and settle in. Each gummy in this 10-pack delivers a consistent, evening-oriented effect that eases you into relaxation without being overwhelming. The blueberry flavor is bright and natural — not artificially sweet. Perfect for winding down after work, weekend evenings, or any time the pace of life needs to slow down a little. Start with one and give it 30–90 minutes to take effect. For adult use only.",
  "seo_summary": "Blueberry Chill Gummies by Ecstatic Edibles — a 10-pack hemp-derived gummy crafted for calm, relaxing evenings.",
  "cta_snippet": null
}
```

### Example 3 — Negative example (do not do this)
Input: OG Kush, Flower, effects: [relaxing]
Bad output (never write this):
```json
{
  "short_description": "OG Kush cures stress and treats insomnia. This medically proven strain will heal your anxiety and pain. Guaranteed to work.",
  "medium_description": "OG Kush is clinically shown to reduce inflammation and anxiety...",
  "seo_summary": "OG Kush — medical strain proven to treat anxiety."
}
```
This is rejected because it contains medical claims (gate-001) and invented facts (gate-002).
