# Creative Larry — Patterns & Gotchas

## Critical Rules

### Rule 1: Visual style MUST lead the FLUX.1 prompt
FLUX.1 weights early prompt tokens heavily. If marketing copy leads, visual style is ignored.

```typescript
// ✅ CORRECT
prompt = `${imageStyle}, ${productName} cannabis product, dispensary photography, no text no words no letters`

// ❌ WRONG — style never applied
prompt = `Introducing ${productName}! The premium choice for connoisseurs. ${imageStyle}`
```

### Rule 2: Always pass random seed
Without explicit seed, fal.ai may serve cached outputs — same image for different prompts.

```typescript
seed: Math.floor(Math.random() * 9_999_999)  // ALWAYS include this
```

### Rule 3: 8 inference steps minimum
4 steps (FLUX.1 Schnell default) produces nearly identical blurry outputs regardless of prompt.

```typescript
num_inference_steps: 8  // minimum; 12 for higher quality; never below 8
```

### Rule 4: Never use Gemini for images
Gemini Vision blocks cannabis content. fal.ai FLUX.1 is cannabis-friendly and the ONLY image provider.

```typescript
// ❌ DO NOT add Gemini image fallback
// const geminiImage = await generateGeminiImage(prompt);  // blocks cannabis

// ✅ fal.ai is the only path; on failure, show error card
try {
  imageUrl = await falGenerate(prompt);
} catch (err) {
  // Show error card on canvas — don't silently fail
  setGenerationError(true);
}
```

### Rule 5: Text overlays are CSS, not baked in
FLUX.1 cannot render legible text. ALL text (headline, CTA) must be CSS overlay.

```tsx
// ✅ CORRECT — CSS overlay
<div className="relative">
  <img src={imageUrl} />
  <div className="absolute bottom-[72px] left-0 right-0 text-center">
    <h2 className="text-4xl font-black text-white">{headline}</h2>
    <button className="bg-primary text-white px-6 py-2 rounded-full">{cta}</button>
  </div>
</div>

// ❌ WRONG — baked into image prompt
prompt = `${imageStyle}, text overlay saying "${headline}"`
```

### Rule 6: AbortController, not setTimeout for fetch timeout

```typescript
// ✅ CORRECT
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 25_000);
try {
  const result = await fal.subscribe(..., { signal: controller.signal });
  clearTimeout(timeout);
} catch (err) {
  if (err.name === 'AbortError') { setGenerationError(true); }
}

// ❌ WRONG — fetch has no built-in timeout option
const result = await fal.subscribe(..., { timeout: 25000 }); // doesn't exist
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| All templates generate same-looking image | imageStyle not leading prompt / wrong `content[0]` priority | `buildImagePrompt()` must put style first; use `localContent \|\| content[0]` |
| Generation hangs forever | No AbortController timeout | Add 25s AbortController |
| "Failed to fetch" in production | Cloud Run 60s limit hit (no timeout + Gemini hang) | AbortController on fal.ai; remove any Gemini image fallback |
| Same image returned for different prompts | No seed | Always pass `seed: Math.floor(Math.random() * 9_999_999)` |
| Brand Kit panel shows no images | Brand images not written to Drive + Firestore | Both writes required: `brand_images` collection + `drive_files` doc |
| Deebo blocks valid cannabis content | Gemini LLM running (cannabis-sensitive) | Verify regex fast path catches the case; adjust regex before LLM |
| New generation shows old content | `content[0] \|\| localContent` priority inverted | Flip to `localContent \|\| content[0]` |

---

## Adding a New Campaign Template

1. Add to `TEMPLATES` array in the Creative Studio client:
```typescript
{
  id: 'my-template',
  name: 'My Template',
  imageStyle: 'specific visual style descriptor for FLUX.1',  // CRUCIAL
  textOverlay: {
    headline: 'Default headline {productName}',
    cta: 'Call to Action',
  },
  category: 'promotion' | 'education' | 'announcement' | 'seasonal',
}
```

2. Verify `imageStyle` produces visually distinct output from existing templates
3. Test with at least 3 different brands to confirm style differentiation
4. Add to golden set eval if category is new

---

## Adding a New Image Generation Provider

If adding a provider alongside fal.ai:
1. Verify it's cannabis-friendly — test with "cannabis dispensary product" prompt
2. Add 25s AbortController timeout
3. Always pass random seed
4. Never use as synchronous fallback (parallel or sequential retry is OK)
5. Never use Gemini — it's hardcoded blocked for cannabis

---

*Patterns version: 1.0 | Created: 2026-02-26*
