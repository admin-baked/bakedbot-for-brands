# Brand Guide 2.0 — Phase 1 Spec Sequence

> **PRD Reference:** `BakedBot_AI_PRD_Brand_Guide_2.0.docx`
> **Phase:** 1 — Foundation (Weeks 1–3)
> **Execution:** Sequential. Each spec is self-contained. Complete and merge before starting the next.

---

## Execution Order

| # | Spec File | Feature | Priority | Est. Effort | Dependencies |
|---|-----------|---------|----------|-------------|--------------|
| 1 | `01-brand-archetype-selector.md` | Brand Archetype Selector | P0 | 1.5 days | None — start here |
| 2 | `02-mission-vision-tagline.md` | Mission, Vision & Tagline Capture | P0 | 1 day | Spec 01 (schema) |
| 3 | `03-typography-detection.md` | Typography Detection & Recommendation | P0 | 1.5 days | Spec 01 (archetype for font recs) |
| 4 | `04-voice-spectrum-sliders.md` | Voice Spectrum Sliders | P0 | 1.5 days | Spec 01 (archetype defaults) |
| 5 | `05-compliance-visual-check.md` | Cannabis Compliance Visual Check | P0 | 2 days | Deebo service APIs |
| 6 | `06-brand-completeness-score.md` | Brand Completeness Score | P0 | 1 day | Specs 01–05 (all fields defined) |

**Total estimated effort:** ~8.5 engineering days

---

## Spec Format Convention

Every spec follows this structure so Linus processes them consistently:

```
# Feature Name
## Context          — Why this exists, what PRD section it implements
## Scope            — Exactly what's in/out
## Data Model       — Firestore schema changes (exact field paths, types, defaults, validation)
## API / Services   — New or modified functions (exact signatures, inputs, outputs)
## UI Components    — New or modified React components (exact file paths, props, state)
## Agent Integration — How this data flows into agent prompts (exact injection format)
## Test Cases       — Input → Expected Output pairs for automated QA
## Acceptance Criteria — Numbered checklist that must all pass
## Files to Create  — Explicit list of new files
## Files to Modify  — Explicit list of existing files that change
```

---

## Global Conventions (Apply to ALL Specs)

### Firestore
- All brand guide fields live in `brandGuides/{brandId}` root collection (document per brand)
- Use existing `brandGuideRepo.ts` for all reads/writes — never write directly to Firestore
- Use `updateBrandGuide(brandId, updates)` server action for partial updates
- Timestamps use `Firestore.Timestamp.now()`

### Frontend
- Settings tab components live in: `src/app/dashboard/settings/brand-guide/components/`
- Onboarding step dialogs live in: `src/app/dashboard/settings/brand-guide/components/setup-step-dialogs.tsx`
- Shared brand guide components live in: `src/components/brand-guide/` (create if needed)
- Follow existing Tailwind + CSS variable theming
- Mobile-first responsive

### Agent Prompt Injection
- Brand context injected via `buildBrandBrief()` or `buildBrandVoiceBrief()` in `src/lib/brand-guide-prompt.ts`
- Max 400 tokens for the brand context block
- All agents read from the same compiled brand context — single source of truth
- Smokey uses `buildBrandVoiceBrief()`, Craig uses `buildBrandBrief()`

### Testing
- Golden set QA: every spec includes test cases formatted as `input → expected_output`
- Compliance tests are zero-tolerance: any failure blocks merge
- UI tests: component renders, user interaction, Firestore write verification

---

## How to Use This Sequence

1. **Read this file first** to understand the sequence and conventions
2. **Read spec `01-brand-archetype-selector.md`** and implement it fully
3. **PR is reviewed and merged**
4. **Read spec `02-mission-vision-tagline.md`** and implement
5. **Repeat through spec 06**

Each spec assumes all previous specs have been merged.

---

## Post-Phase 1

After all 6 specs are complete and merged:
- Run full regression on existing features (no breakage)
- Run Brand Guide completeness score calculation across all existing clients
- Generate Phase 2 spec sequence (Customer Personas, Photography Direction, Terminology, Content Pillars, Competitive Positioning)

---

*BakedBot AI — Autonomous Cannabis Commerce*
*"The Brand Guide is the AI's operating system."*
