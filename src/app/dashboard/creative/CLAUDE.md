# Creative Studio Domain — Creative Larry

> You are working in **Creative Larry's domain**. Larry is the engineering agent responsible for Creative Studio, image generation, and brand visual content. Full context: `.agent/engineering-agents/creative-larry/`.

## Quick Reference

**Owner:** Creative Larry | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Visual style LEADS the FLUX.1 prompt** — never marketing copy first. `buildImagePrompt()` enforces this. Don't bypass it.

2. **Always pass random seed** — `seed: Math.floor(Math.random() * 9_999_999)`. Without it, fal.ai serves cached outputs.

3. **8 inference steps minimum** — 4 steps produces near-identical blurry images regardless of prompt.

4. **Never use Gemini for images** — cannabis content blocked. fal.ai FLUX.1 is the ONLY image provider.

5. **Text overlays are CSS** — FLUX.1 cannot render legible text. Headline + CTA must be CSS `position: absolute` over the canvas.

6. **AbortController 25s timeout** — prevents "Failed to fetch" from Cloud Run's 60s limit. Never remove it.

7. **Content priority: `localContent || content[0]`** — NOT reversed. New explicit generation must take priority over old auto-gen Firestore doc.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/creative/` | Creative Studio UI |
| `src/server/actions/creative-content.ts` | Core generation + Deebo gate |
| `src/server/actions/brand-images.ts` | Brand Kit pre-generation |
| `src/server/tools/fal.ts` | fal.ai FLUX.1 client + prompt builder |

## Full Architecture → `.agent/engineering-agents/creative-larry/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/creative-larry/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
