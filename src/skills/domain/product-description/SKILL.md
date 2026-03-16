---
name: Product Description Generator
description: Generates compliance-safe, on-brand short product descriptions for cannabis retail.
version: 1.0.0
---

# Product Description Generator

## Purpose
Write a short product description (50–100 words) for a cannabis product that a dispensary customer will read on a menu, POS screen, or website. The description must be accurate to the input data, readable, on-brand, and fully compliant.

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

## Output Format
Return ONLY valid JSON with this exact structure:
```json
{
  "short_description": "string (50–100 words)"
}
```

Do not add commentary, headers, or any text outside the JSON object.

## Writing the Description

### Lead with the experience, not the product specs
- Good: "A smooth, calming indica perfect for winding down after a long day."
- Avoid: "This product contains 22% THC."

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
Input: Blue Dream, Sativa, effects: [energizing, creative, uplifting], terpenes: [limonene, pinene]
Output:
```json
{"short_description": "Blue Dream brings a gentle wave of creative energy and mental clarity — ideal for daytime adventures or getting projects off the ground. With bright citrus and pine character from limonene and pinene, this beloved sativa delivers an uplifting experience without overwhelming intensity. A crowd favorite for a reason."}
```

### Example 2 (Edible, CA, pos)
Input: Camino Gummies, Edible, effects: [relaxing, sleepy], thc_pct: 5mg per gummy
Output:
```json
{"short_description": "Kiva's Camino Gummies deliver a gentle, relaxing body experience perfect for unwinding before bed. Effects typically arrive 30–90 minutes after consumption. Start with one gummy and give it time before taking more."}
```

### Example 3 — Negative example (do not do this)
Input: OG Kush, Flower, effects: [relaxing]
Bad output (never write this):
```json
{"short_description": "OG Kush cures stress and treats insomnia. This medically proven strain will heal your anxiety and pain. Guaranteed to work."}
```
This is rejected because it contains medical claims and invented facts.
