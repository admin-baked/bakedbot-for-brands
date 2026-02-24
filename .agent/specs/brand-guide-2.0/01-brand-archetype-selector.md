# Spec 01: Brand Archetype Selector

> **PRD Section:** 6.1
> **Priority:** P0 — Critical
> **Estimated Effort:** 1.5 days
> **Dependencies:** None — this is the first spec in the sequence
> **Author:** Martez Knox (CEO) | For execution by: AI Engineering

---

## Context

The Brand Guide currently captures name, description, colors, logo, and a basic voice dropdown. It has no concept of brand archetype — the strategic identity that should drive how every AI agent (Smokey, Craig, Mrs. Parker, etc.) communicates for this dispensary.

Research into STIIIZY (Lifestyle/Premium), Kiva (Artisan/Craft), Wyld (Nature/Adventure), Cookies (Culture/Streetwear), Alien Labs (Bold/Streetwear), and Jeeter (Premium/Innovation) shows that archetype is the single most impactful brand attribute for AI personalization.

This spec adds a Brand Archetype Selector to the Brand Guide onboarding flow.

---

## Scope

### In Scope
- 6 cannabis-specific archetypes with metadata
- UI component: visual archetype selection cards
- Firestore schema: archetype fields on the brand guide document
- Agent context generation: archetype → prompt injection format
- Preview: show sample Smokey greeting + Craig subject line per archetype
- Website scanner suggestion: recommend archetype based on scanned site data

### Out of Scope
- Voice sliders (Spec 04 — depends on archetype defaults defined here)
- Typography recommendations per archetype (Spec 03)
- Content pillars per archetype (Phase 2)
- Customer persona defaults per archetype (Phase 2)

---

## Data Model

### Firestore Path
```
brandGuides/{brandId}
```
Field: `archetype` (nested object within existing BrandGuide document)

### Schema
```typescript
// Add to BrandGuide type in src/types/brand-guide.ts
archetype?: BrandArchetypeSelection;

interface BrandArchetypeSelection {
  primary: ArchetypeId;          // required — one of 6 enum values
  secondary: ArchetypeId | null; // optional — blend archetype
  selected_at: Timestamp;        // when user selected
  suggested_by_scanner: ArchetypeId | null; // what the website scanner recommended
}

type ArchetypeId =
  | 'wellness_caregiver'
  | 'explorer_adventure'
  | 'rebel_streetwear'
  | 'artisan_craft'
  | 'premium_luxury'
  | 'community_heritage';
```

### Validation Rules
- `primary` is required and must be a valid `ArchetypeId`
- `secondary` must be different from `primary` (or null)
- `selected_at` auto-set on write
- `suggested_by_scanner` set only by the website scanner service, never by user input

### Default Value
```typescript
{
  primary: null,       // forces user to select
  secondary: null,
  selected_at: null,
  suggested_by_scanner: null
}
```

---

## Archetype Definitions

Store as a constant. This is the single source of truth for all archetype metadata.

### File: `src/constants/brand-archetypes.ts`

```typescript
export const BRAND_ARCHETYPES = {
  wellness_caregiver: {
    id: 'wellness_caregiver',
    label: 'Wellness & Caregiver',
    shortLabel: 'Wellness',
    description: 'Nurturing, educational, health-focused. You prioritize patient care, dosage guidance, and therapeutic outcomes.',
    icon: '🌿',
    color: '#4CAF50',
    brandExamples: ['Surterra Wellness', 'medical dispensaries'],
    voiceDefaults: {
      formality: 4,
      education: 5,
      energy: 2,
      boldness: 2,
      community: 3,
    },
    smokeySample: "Welcome to {dispensary}. I can help you find the right product for your needs. Are you looking for something specific, or would you like guidance based on the effects you're seeking?",
    craigSubjectSample: "Your personalized wellness guide is ready, {first_name}",
    fontDirection: 'clean_rounded',
    photographyDirection: 'clinical',
  },

  explorer_adventure: {
    id: 'explorer_adventure',
    label: 'Explorer & Adventure',
    shortLabel: 'Explorer',
    description: 'Outdoor, nature-connected, adventurous. Your brand evokes discovery, freedom, and the natural world.',
    icon: '🏔️',
    color: '#795548',
    brandExamples: ['Wyld', 'Sunday Goods'],
    voiceDefaults: {
      formality: 2,
      education: 3,
      energy: 4,
      boldness: 3,
      community: 3,
    },
    smokeySample: "Hey there! Ready to explore something new? I can point you toward some amazing strains — whether you're winding down after a hike or gearing up for a weekend adventure.",
    craigSubjectSample: "New terrain to explore: fresh drops just landed 🌲",
    fontDirection: 'mixed_serif_sans',
    photographyDirection: 'nature',
  },

  rebel_streetwear: {
    id: 'rebel_streetwear',
    label: 'Rebel & Streetwear',
    shortLabel: 'Rebel',
    description: 'Bold, culture-forward, boundary-pushing. You challenge the status quo and speak to trendsetters.',
    icon: '🔥',
    color: '#FF5722',
    brandExamples: ['Cookies', 'Alien Labs'],
    voiceDefaults: {
      formality: 1,
      education: 2,
      energy: 5,
      boldness: 5,
      community: 3,
    },
    smokeySample: "Yo! Welcome to {dispensary}. We got heat dropping all week. What are you vibing with — flower, concentrates, or you want me to put you on something crazy?",
    craigSubjectSample: "🔥 New drop alert — this won't last",
    fontDirection: 'bold_display_geometric',
    photographyDirection: 'lifestyle',
  },

  artisan_craft: {
    id: 'artisan_craft',
    label: 'Artisan & Craft',
    shortLabel: 'Artisan',
    description: 'Quality-obsessed, heritage, craftsmanship. You emphasize process, sourcing, and the art of cannabis.',
    icon: '✨',
    color: '#B8860B',
    brandExamples: ['Kiva Confections', 'Lowell Farms'],
    voiceDefaults: {
      formality: 4,
      education: 4,
      energy: 2,
      boldness: 2,
      community: 3,
    },
    smokeySample: "Welcome to {dispensary}. Our curated selection features small-batch cultivators and expertly crafted products. I'd love to help you discover something exceptional — what experience are you looking for?",
    craigSubjectSample: "Crafted with care: meet our newest artisan selections",
    fontDirection: 'elegant_serif_humanist',
    photographyDirection: 'product_forward',
  },

  premium_luxury: {
    id: 'premium_luxury',
    label: 'Premium & Luxury',
    shortLabel: 'Premium',
    description: 'Exclusive, aspirational, design-forward. Your brand commands premium positioning and refined taste.',
    icon: '💎',
    color: '#212121',
    brandExamples: ['STIIIZY', '710 Labs'],
    voiceDefaults: {
      formality: 5,
      education: 3,
      energy: 3,
      boldness: 3,
      community: 1,
    },
    smokeySample: "Welcome to {dispensary}. Our collection features the finest cultivators and most sought-after products. How may I assist your selection today?",
    craigSubjectSample: "Exclusively for you: limited reserve now available",
    fontDirection: 'condensed_sans_serif',
    photographyDirection: 'lifestyle',
  },

  community_heritage: {
    id: 'community_heritage',
    label: 'Community & Heritage',
    shortLabel: 'Community',
    description: 'Local-first, social equity, inclusive. You reinvest in your community and champion access for all.',
    icon: '🤝',
    color: '#1565C0',
    brandExamples: ['Grasshopper Club', 'Ivy Hall', 'Starbuds'],
    voiceDefaults: {
      formality: 2,
      education: 3,
      energy: 3,
      boldness: 3,
      community: 5,
    },
    smokeySample: "Hey, welcome to {dispensary}! We're so glad you're here. This is more than a shop — it's a community. What can I help you find today?",
    craigSubjectSample: "From our family to yours: this week at {dispensary}",
    fontDirection: 'warm_friendly_sans',
    photographyDirection: 'lifestyle',
  },
} as const;

export type ArchetypeId = keyof typeof BRAND_ARCHETYPES;

export function getArchetypeById(id: ArchetypeId) {
  return BRAND_ARCHETYPES[id] || null;
}

export function getVoiceDefaults(primaryId: ArchetypeId, secondaryId?: ArchetypeId | null): number[] {
  const primary = BRAND_ARCHETYPES[primaryId];
  if (!secondaryId || !BRAND_ARCHETYPES[secondaryId]) {
    const v = primary.voiceDefaults;
    return [v.formality, v.education, v.energy, v.boldness, v.community];
  }
  // Blend: 70% primary, 30% secondary
  const sec = BRAND_ARCHETYPES[secondaryId].voiceDefaults;
  const p = primary.voiceDefaults;
  return [
    Math.round(p.formality * 0.7 + sec.formality * 0.3),
    Math.round(p.education * 0.7 + sec.education * 0.3),
    Math.round(p.energy * 0.7 + sec.energy * 0.3),
    Math.round(p.boldness * 0.7 + sec.boldness * 0.3),
    Math.round(p.community * 0.7 + sec.community * 0.3),
  ];
}
```

---

## UI Components

### Component: `ArchetypeSelector`

**File:** `src/app/dashboard/settings/brand-guide/components/archetype-selector.tsx`

**Props:**
```typescript
interface ArchetypeSelectorProps {
  brandId: string;
  currentPrimary: ArchetypeId | null;
  currentSecondary: ArchetypeId | null;
  suggestedByScanner: ArchetypeId | null;
  dispensaryName: string;
  onSave: (primary: ArchetypeId, secondary: ArchetypeId | null) => Promise<void>;
}
```

**Behavior:**
1. Render 6 archetype cards in a 2x3 grid (desktop) / 1-column stack (mobile <768px)
2. Each card shows: icon (32px), label, description, 2 brand examples, sample Smokey greeting (collapsed, expandable)
3. If `suggestedByScanner` is set, that card has a "Recommended" badge (top-right)
4. Click card → select as primary (green border + checkmark)
5. Second click on already-selected or secondary button → set as secondary (dashed border)
6. Cannot select same archetype as both primary and secondary → show toast: "Primary and secondary must be different"
7. Below grid: render `ArchetypePreview` with live sample outputs
8. Save button → calls `saveBrandArchetype()` server action → calls `onSave`

**Visual:**
- Unselected: `border-2 border-gray-200 bg-white hover:border-gray-400`
- Primary: `border-2 border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500`
- Secondary: `border-2 border-emerald-300 bg-emerald-25 border-dashed`
- Scanner badge: `bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full`

### Component: `ArchetypePreview`

**File:** `src/app/dashboard/settings/brand-guide/components/archetype-preview.tsx`

**Props:**
```typescript
interface ArchetypePreviewProps {
  primary: ArchetypeId | null;
  secondary: ArchetypeId | null;
  dispensaryName: string;
}
```

**Behavior:**
1. If no primary → show: "Select an archetype to see how your AI agents will communicate"
2. If primary selected → 2 preview boxes side-by-side (stacked on mobile):
   - **Smokey Preview:** chat bubble with `smokeySample`, `{dispensary}` → `dispensaryName`
   - **Craig Preview:** email subject line with `craigSubjectSample`, `{dispensary}` → `dispensaryName`, `{first_name}` → "there"
3. Updates in real-time (no save required for preview)

---

## API / Services

### Server Action: `saveBrandArchetype`

**File:** `src/server/actions/brand-guide.ts` (add to existing file)

```typescript
export async function saveBrandArchetype(
  brandId: string,
  primary: ArchetypeId,
  secondary: ArchetypeId | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireUser();
    if (!BRAND_ARCHETYPES[primary]) return { success: false, error: `Invalid archetype: ${primary}` };
    if (secondary && !BRAND_ARCHETYPES[secondary]) return { success: false, error: `Invalid secondary: ${secondary}` };
    if (secondary && secondary === primary) return { success: false, error: 'Secondary must differ from primary' };

    await brandGuideRepo.update(brandId, {
      archetype: {
        primary,
        secondary: secondary ?? null,
        selected_at: Timestamp.now(),
        suggested_by_scanner: null, // preserved separately; don't overwrite
      }
    });
    return { success: true };
  } catch (error) {
    logger.error('[BrandGuide] saveBrandArchetype failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}
```

### Website Scanner: Add Archetype Suggestion

**File:** `src/server/services/brand-guide-extractor.ts` (add to existing extraction result)

Add `suggestArchetype(scannedData)` function:

```typescript
function suggestArchetype(scannedData: { dominantColor?: { hue: number; lightness: number }; heroText?: string }): ArchetypeId {
  const scores: Record<ArchetypeId, number> = {
    wellness_caregiver: 0, explorer_adventure: 0, rebel_streetwear: 0,
    artisan_craft: 0, premium_luxury: 0, community_heritage: 0,
  };

  const hue = scannedData.dominantColor?.hue ?? 0;
  const lightness = scannedData.dominantColor?.lightness ?? 50;

  if (lightness < 25) scores.premium_luxury += 3;
  if (hue >= 80 && hue <= 160) scores.wellness_caregiver += 2;
  if (hue >= 15 && hue <= 45) scores.explorer_adventure += 2;
  if ((hue >= 0 && hue <= 15) || hue >= 345) scores.rebel_streetwear += 2;
  if (hue >= 200 && hue <= 260) scores.community_heritage += 2;

  const heroText = (scannedData.heroText ?? '').toLowerCase();
  const keywords: Record<ArchetypeId, string[]> = {
    wellness_caregiver: ['wellness', 'health', 'medical', 'patient', 'care', 'therapeutic', 'relief'],
    explorer_adventure: ['explore', 'adventure', 'discover', 'nature', 'wild', 'journey', 'outdoor'],
    rebel_streetwear: ['culture', 'lifestyle', 'drop', 'fire', 'heat', 'fresh', 'vibe'],
    artisan_craft: ['craft', 'artisan', 'curated', 'small-batch', 'quality', 'handcrafted'],
    premium_luxury: ['exclusive', 'luxury', 'reserve', 'select', 'elite', 'finest', 'collection'],
    community_heritage: ['community', 'equity', 'local', 'family', 'together', 'neighborhood', 'reinvest'],
  };

  for (const [archetype, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (heroText.includes(word)) scores[archetype as ArchetypeId] += 2;
    }
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as ArchetypeId;
}
```

After extraction, write suggestion:
```typescript
const suggestedArchetype = suggestArchetype({ dominantColor: extracted.dominantColor, heroText: extracted.heroText });
// Merge into Firestore without overwriting user's existing selection:
await brandGuideRepo.update(brandId, {
  'archetype.suggested_by_scanner': suggestedArchetype,
});
```

---

## Agent Integration

### Brand Context Block

In `src/lib/brand-guide-prompt.ts`, add archetype data to both `buildBrandBrief()` and `buildBrandVoiceBrief()`:

```typescript
// Add this section after the existing voice/tone block:
function buildArchetypeBlock(archetype?: BrandArchetypeSelection): string {
  if (!archetype?.primary) return '';
  const primary = BRAND_ARCHETYPES[archetype.primary];
  const voiceArr = getVoiceDefaults(archetype.primary, archetype.secondary);
  return `
<brand_archetype>
  <primary id="${archetype.primary}">${primary.label}</primary>
  ${archetype.secondary ? `<secondary id="${archetype.secondary}">${BRAND_ARCHETYPES[archetype.secondary].label}</secondary>` : ''}
  <identity>${primary.description}</identity>
  <voice_spectrum formality="${voiceArr[0]}" education="${voiceArr[1]}" energy="${voiceArr[2]}" boldness="${voiceArr[3]}" community="${voiceArr[4]}" />
</brand_archetype>`.trim();
}
```

Inject into both `buildBrandBrief()` and `buildBrandVoiceBrief()` alongside existing brand context.

### Where to Insert in Settings UI

The archetype selector appears in two places:
1. **Onboarding flow** (`setup-step-dialogs.tsx`): Add as Step 2 (after brand name, before colors/logo)
2. **Settings tab** (`visual-identity-tab.tsx`): Add archetype section at the top of Visual Identity tab

---

## Test Cases

### Unit Tests (file: `tests/brand-archetype.test.ts`)

| # | Test | Input | Expected Output |
|---|------|-------|-----------------|
| 1 | Valid primary save | `saveBrandArchetype('brand1', 'rebel_streetwear', null)` | `{ success: true }` + Firestore has `archetype.primary === 'rebel_streetwear'` |
| 2 | Valid primary + secondary | `saveBrandArchetype('brand1', 'premium_luxury', 'community_heritage')` | `{ success: true }` + both fields set |
| 3 | Invalid archetype | `saveBrandArchetype('brand1', 'invalid_type' as any, null)` | `{ success: false, error: 'Invalid archetype: invalid_type' }` |
| 4 | Same primary and secondary | `saveBrandArchetype('brand1', 'rebel_streetwear', 'rebel_streetwear')` | `{ success: false, error: 'Secondary must differ from primary' }` |
| 5 | Voice defaults: primary only | `getVoiceDefaults('rebel_streetwear')` | `[1, 2, 5, 5, 3]` |
| 6 | Voice defaults: blended | `getVoiceDefaults('rebel_streetwear', 'community_heritage')` | `[1, 2, 4, 4, 4]` |
| 7 | Scanner suggestion: dark palette | `suggestArchetype({ dominantColor: { hue: 0, lightness: 10 }, heroText: '' })` | `'premium_luxury'` |
| 8 | Scanner suggestion: community keywords | `suggestArchetype({ dominantColor: { hue: 220, lightness: 50 }, heroText: 'building community together' })` | `'community_heritage'` |

### UI Tests

| # | Test | Action | Expected Result |
|---|------|--------|-----------------|
| 9 | Render 6 cards | Mount `ArchetypeSelector` | 6 cards visible with correct labels, icons, descriptions |
| 10 | Select primary | Click 'Rebel & Streetwear' card | Green border + checkmark. Preview updates. |
| 11 | Select secondary | Click secondary button on 'Community & Heritage' | Dashed green border. Preview blends. |
| 12 | Prevent duplicate | Select 'Rebel' as primary, try 'Rebel' as secondary | Toast: "Primary and secondary must be different" |
| 13 | Scanner badge | Mount with `suggestedByScanner='artisan_craft'` | 'Artisan & Craft' card shows "Recommended" badge |
| 14 | Preview updates live | Select primary, then switch to different primary | Preview Smokey/Craig samples update immediately |
| 15 | Mobile layout | Viewport < 768px | Cards stack single column. Preview boxes stack. |
| 16 | Save writes Firestore | Select primary + click Save | Firestore updated at correct path with correct values |

### Agent Integration Tests

| # | Test | Input | Expected |
|---|------|-------|----------|
| 17 | Brand context block generated | Brand with `primary='artisan_craft'`, `secondary=null` | XML block contains `<primary id="artisan_craft">Artisan & Craft</primary>` |
| 18 | Agent uses archetype in output | Smokey system prompt includes artisan_craft block | Response uses formal language, "curated", "exceptional" — not "yo", "fire", "heat" |

---

## Acceptance Criteria

- [ ] 1. Six archetype cards render in Brand Guide settings (both in onboarding Step 2 and Visual Identity tab)
- [ ] 2. User selects exactly 1 primary (required) and optionally 1 secondary (different)
- [ ] 3. Real-time preview of Smokey greeting + Craig subject line
- [ ] 4. Scanner-recommended archetype shows "Recommended" badge
- [ ] 5. Save writes to `brandGuides/{brandId}.archetype` with correct schema
- [ ] 6. Archetype data injected into Smokey and Craig system prompts via brand-guide-prompt.ts
- [ ] 7. `BRAND_ARCHETYPES` constant is single source of truth — no duplicate definitions
- [ ] 8. All 18 test cases pass
- [ ] 9. Mobile responsive (stacks at <768px)
- [ ] 10. No existing Brand Guide functionality broken (run regression: all existing tabs/fields still work)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/constants/brand-archetypes.ts` | Archetype definitions, voice defaults, sample copy |
| `src/app/dashboard/settings/brand-guide/components/archetype-selector.tsx` | Card grid component |
| `src/app/dashboard/settings/brand-guide/components/archetype-preview.tsx` | Live agent output preview |
| `tests/brand-archetype.test.ts` | All 18 test cases |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/brand-guide.ts` | Add `BrandArchetypeSelection` interface + `ArchetypeId` type + `archetype?` field to `BrandGuide` |
| `src/server/actions/brand-guide.ts` | Add `saveBrandArchetype()` server action |
| `src/server/services/brand-guide-extractor.ts` | Add `suggestArchetype()` + write `suggested_by_scanner` to Firestore after scan |
| `src/app/dashboard/settings/brand-guide/components/setup-step-dialogs.tsx` | Add Step 2: ArchetypeSelector between brand name (Step 1) and colors (Step 3) |
| `src/app/dashboard/settings/brand-guide/components/visual-identity-tab.tsx` | Add ArchetypeSelector section at top |
| `src/lib/brand-guide-prompt.ts` | Add `buildArchetypeBlock()` + inject into `buildBrandBrief()` and `buildBrandVoiceBrief()` |

---

## Notes for Implementation

1. **Firestore path correction:** The spec originally referenced `brands/{brandId}/info.brand_guide.archetype` — actual collection is `brandGuides/{brandId}` (root collection). Use `brandGuideRepo.update()`.

2. **Setup step insertion:** `setup-step-dialogs.tsx` has Steps 1–4 (brand name, colors, voice, social). Add archetype as Step 2; shift existing Step 2 (colors) to Step 3, etc.

3. **`{dispensary}` placeholder** in sample copy → replace with `brandGuide.name` at render time.

4. **Do NOT create a Firestore collection for archetypes** — they're a static constant. Only the user's selection is stored.

5. **`voiceDefaults`** in each archetype are consumed by Spec 04 (Voice Sliders). Export `getVoiceDefaults()` from constants — it will be called when sliders are built.

6. **Agent injection priority:** Do Smokey first (uses `buildBrandVoiceBrief`), then Craig (uses `buildBrandBrief`). Both go through `src/lib/brand-guide-prompt.ts`.
