# Creative Larry — Architecture

## Generation Pipeline

```
User input (template + product + platform)
  ↓
createSocialContent(orgId, { template, productId, platform, textOverlay })
  │
  ├─ PARALLEL:
  │   ├─ buildImagePrompt(template, product, brand) → fal.ai FLUX.1 Schnell
  │   │    timeout: AbortController 25s
  │   │    seed: Math.floor(Math.random() * 9_999_999)  ← ALWAYS random
  │   │    steps: 8  ← minimum for style differentiation
  │   │    prompt format: "[imageStyle] [product] [no text] photorealistic"
  │   │
  │   └─ generateSocialCaption(product, brand, platform) → Gemini Flash
  │        timeout: Promise.race 15s
  │        output: caption text for CSS overlay
  │
  ├─ Deebo compliance check on caption
  │    → BLOCK if medical claims / minors / safety claims
  │    → ALLOW if clean
  │
  └─ Return: { imageUrl, caption, template, overlayConfig }
       ↓
   Canvas component renders:
     <img src={imageUrl} />          ← fal.ai CDN URL
     <div class="overlay">           ← CSS absolute positioned
       <h2>{headline}</h2>           ← from textOverlay.headline
       <button>{cta}</button>         ← from textOverlay.cta, brand primary color
     </div>
```

## File Map

```
src/app/dashboard/creative/
├── page.tsx                         ← server component, loads brand + products
├── creative-command-center.tsx      ← main client component (canvas + panels)
│   ├── Left panel: Template picker  ← 8 campaign templates
│   ├── Center: Canvas               ← image + CSS overlay
│   └── Right: Media / Download / Schedule
├── components/
│   ├── template-selector.tsx        ← template grid with imageStyle preview
│   ├── text-overlay-editor.tsx      ← headline + CTA edit inline on canvas
│   └── brand-kit-panel.tsx          ← loads tenants/{orgId}/brand_images

src/server/
├── actions/
│   ├── creative-content.ts          ← createSocialContent(), generateCaption()
│   └── brand-images.ts              ← generateBrandImagesForNewAccount()
├── tools/
│   └── fal.ts                       ← buildImagePrompt(), falGenerate()
├── services/
│   └── generate-social-image.ts     ← fal.ai HTTP wrapper
```

## fal.ai Integration

```typescript
// src/server/tools/fal.ts
export function buildImagePrompt(
  imageStyle: string,   // from template — MUST lead the prompt
  productName: string,  // anchors subject
  brandName: string,    // context
): string {
  // Strip hashtags and marketing-speak
  // Visual descriptor leads: "[imageStyle], [productName] cannabis product,
  //   professional dispensary photography, no text no words no letters"
}

export async function falGenerate(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: 'square_hd',
      num_inference_steps: 8,      // minimum for style differentiation
      seed: Math.floor(Math.random() * 9_999_999),  // always fresh
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);
  return result.images[0].url;
}
```

## Brand Image Pre-Gen

```
Trigger: createBrandGuide() or updateBrandGuide() (via setImmediate)

generateBrandImagesForNewAccount(orgId):
  → Loads OrgProfile (brand colors, dispensary type, city)
  → Builds 4 prompts (hero / product_bg / ambient / texture)
  → Promise.all — all 4 generated in parallel
  → Each image:
      → Firebase Storage: gs://bakedbot-global-assets/brand-images/{orgId}/{type}.jpg
      → Firestore: tenants/{orgId}/brand_images/{type}
      → Drive: drive_files doc (so it appears in BakedBot Drive)

Brand Kit panel in Creative Studio:
  → Reads tenants/{orgId}/brand_images
  → Displays as clickable cards in media panel
  → Click → sets canvasBackground state
```

## Campaign Templates

```typescript
const TEMPLATES = [
  {
    id: 'product-spotlight',
    name: 'Product Spotlight',
    imageStyle: 'clean studio product photography, white backdrop, soft lighting',
    textOverlay: { headline: 'Meet {productName}', cta: 'Shop Now' },
    category: 'promotion',
  },
  {
    id: 'weekend-special',
    name: 'Weekend Special',
    imageStyle: 'vibrant lifestyle dispensary photography, warm golden hour light',
    textOverlay: { headline: 'Weekend Special', cta: 'View Menu' },
    category: 'seasonal',
  },
  // ... 6 more templates
];
```

Selecting a template:
1. Sets `selectedTemplate` state
2. Auto-fills `textOverlay` defaults
3. Sets `imageStyle` for next generation
4. Clears any previous manual overlay edits

## Content Priority Rule

```typescript
// ✅ CORRECT: localContent (new generation) takes priority
const displayContent = localContent || content[0];

// ❌ WRONG: old auto-gen Firestore doc overrides new explicit generation
const displayContent = content[0] || localContent;
```

## Deebo Gate

```typescript
// In creative-content.ts
const complianceResult = await deeboCheckContent(caption, orgState);
if (!complianceResult.approved) {
  throw new Error(`Content blocked: ${complianceResult.reason}`);
}
// Only approved content reaches the canvas
```

## Error Handling

```
fal.ai AbortController fires (25s):
  → AbortError caught
  → generationError state set
  → Red error card shown on canvas with "Try Again" button
  → Never silent toast-only failure

Caption timeout (15s Promise.race):
  → Generic fallback caption used
  → No user-visible error (caption is secondary)
```
