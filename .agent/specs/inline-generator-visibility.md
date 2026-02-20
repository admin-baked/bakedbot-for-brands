# Inline Generator Visibility - Heroes/Carousels/Bundles Parity

**Status:** 📝 Spec
**Created:** 2026-02-20
**Owner:** Claude (User Identified UX Gap)
**Priority:** P1 (UX Critical)

---

## 1. Overview & Problem

### Current State
After refactoring Bundle system to match Heroes/Carousels pattern, we have **parity in builder architecture** but **not in visibility**:
- ✅ All 3 use same 5-section pattern (Auto-Generate, Presets, NL Input, Suggestions, Examples)
- ✅ All use server actions (no API endpoints)
- ✅ All use orgId prop for consistency
- ❌ **Generated items are invisible after creation** — users must navigate away to find them

### Root Cause
When a user creates a Hero/Carousel/Bundle via the inline generator or dashboard builder:
1. Backend creates the item successfully
2. Toast shows "Created!" or "Added as draft"
3. **But the UI doesn't show the created item** — no preview, card, or expandable view
4. User must go back to "Your Heroes/Carousels/Bundles" tab to see it

### Why This Breaks UX
- **Friction:** 3-4 clicks to verify what you just created
- **Doubt:** Did it actually create? What does it look like?
- **Inbox Inline:** HeroGeneratorInline in inbox generates a hero, but does user see it live?
- **Pattern Inconsistency:** Even though builders are similar, experience diverges post-creation

---

## 2. Solution: Show Generated Item Inline

### Design Pattern
After successful creation, display a **collapsible preview card** below the builder with:
1. **Item Preview** — same card/display used in "Your Items" tab
2. **Edit Button** — quick access to full editor
3. **Add Another** button — stay in builder, create next item
4. **Live Badge** — "✓ Added as draft" or "✓ Live on menu"

### Implementation by Component

#### BundleRuleBuilder (Dashboard)
```
User generates bundle via AI
        ↓
Toast: "Bundle Created"
        ↓
[Collapsible: "View Generated Bundle"]
  ├── Bundle preview card (name, products, savings %, margin)
  ├── [Edit Bundle] [Add Another]
  └── Auto-collapse on "Add Another"
```

#### BundleGeneratorInline (Inbox)
```
User generates bundle via AI
        ↓
Toast: "Bundle Created"
        ↓
[Animated Card In: Generated Bundle Preview]
  ├── Same card as dashboard version
  ├── [Edit] [Create Another]
  └── Slide out if user clicks "Create Another"
```

#### HeroGeneratorInline (Inbox) — CURRENT PATTERN
```
User generates hero
        ↓
Toast: "Hero Created"
        ↓
[Hero preview card appears below builder]
  ├── Full hero preview (visual)
  ├── [Edit] [Create Another]
```

#### CarouselGeneratorInline (Inbox)
```
User generates carousel
        ↓
Toast: "Carousel Created"
        ↓
[Carousel preview card appears below builder]
  ├── Carousel preview (product grid)
  ├── [Edit] [Create Another]
```

---

## 3. Architecture

### State Changes
Add to each generator component:
```typescript
// In BundleRuleBuilder, BundleGeneratorInline, etc.
const [lastCreatedItem, setLastCreatedItem] = useState<T | null>(null);
const [showCreatedPreview, setShowCreatedPreview] = useState(false);

// After successful creation
if (result.success && result.data) {
    setLastCreatedItem(result.data);
    setShowCreatedPreview(true);
}
```

### UI Components Reuse
- **BundlePreviewCard** — extract from "Your Bundles" grid, use in both dashboard + inline
- **HeroPreviewCard** — already exists, used in both
- **CarouselPreviewCard** — already exists, used in both

### Actions Needed
1. **BundleRuleBuilder & BundleGeneratorInline:** Extract/create preview card component
2. **HeroGeneratorInline & CarouselGeneratorInline:** Verify preview cards are used
3. **All:** Add state for `lastCreatedItem` + `showCreatedPreview`
4. **All:** Wire up "Edit" button to open editor with item pre-loaded
5. **All:** Wire up "Create Another" to reset form + hide preview

---

## 4. Files Changed

### New Files
None — reuse existing card components

### Modified Files (6)

| File | Change | Lines |
|------|--------|-------|
| `src/components/dashboard/bundles/bundle-rule-builder.tsx` | Add lastCreatedItem state, preview card, edit/add-another buttons | +40 |
| `src/components/inbox/bundle-generator-inline.tsx` | Same as above | +45 |
| `src/components/dashboard/carousels/carousel-rule-builder.tsx` | Verify/add preview card if missing | +0-30 |
| `src/components/inbox/carousel-generator-inline.tsx` | Verify/add preview card if missing | +0-30 |
| `src/components/inbox/hero-generator-inline.tsx` | Verify/add preview card if missing | +0-30 |
| `src/components/dashboard/heroes/hero-rule-builder.tsx` | Verify/add preview card if missing (if exists) | +0-30 |

**Total effort:** 3-4 hours

---

## 5. Boundary Checks

| Boundary | Triggered? | Notes |
|----------|-----------|-------|
| **Authentication** | ❌ No | No auth changes |
| **Payments/Billing** | ❌ No | No cost changes |
| **Database Schema** | ❌ No | No new fields |
| **External APIs** | ❌ No | No new integrations |
| **User-Facing Prompts** | ❌ No | No prompt changes |
| **UI/UX** | ✅ YES | Preview cards + new buttons |
| **Compliance** | ❌ No | No compliance impact |

**Risk:** 🟢 Low — UI-only, reuses existing components, no data changes

---

## 6. Testing Strategy

### Manual Testing Checklist

**Dashboard Builders:**
- [ ] Generate bundle via AI → see preview card appear
- [ ] Click [Edit] on preview → opens editor with bundle pre-loaded
- [ ] Click [Add Another] → form resets, preview slides out
- [ ] Same for Carousels/Heroes (if dashboard builders exist)

**Inbox Inline Generators:**
- [ ] Generate bundle in inbox → preview card appears below builder
- [ ] Preview shows correct bundle data (name, products, savings)
- [ ] [Edit] opens editor
- [ ] [Create Another] resets form
- [ ] Same for Carousels/Heroes

**Responsiveness:**
- [ ] Preview card is readable on mobile
- [ ] [Edit] and [Create Another] buttons accessible
- [ ] No layout shift when preview appears/disappears

### Test Coverage
No unit tests needed — this is pure UI state management (already tested by Jest for state logic).

---

## 7. Rollout Plan

### Single-phase deployment
No feature flag needed — UX improvement, no risk.

### Rollback
```bash
git revert <commit-hash>
git push origin main
```

---

## 8. Success Criteria

- [ ] After generating a bundle/hero/carousel, preview card appears immediately
- [ ] Preview shows same data as "Your Items" tab
- [ ] [Edit] button opens editor with pre-loaded item
- [ ] [Create Another] resets form and hides preview
- [ ] Same experience across all 3 builders (bundle, hero, carousel)
- [ ] Build passes (`npm run check:types`)
- [ ] No regressions in existing functionality
- [ ] Mobile responsive

---

## 9. Open Questions

1. **Edit Flow:** When user clicks [Edit], should we:
   - Open a side panel/sheet with the full editor?
   - Stay in same view with inline editing?
   - Navigate to full editor page?
   - **Answer:** Depends on existing pattern — check HeroGeneratorInline + CarouselGeneratorInline

2. **Preview Styling:** Should preview cards match:
   - "Your Items" tab cards (100% parity)?
   - Inline theme (darker, more compact)?
   - **Answer:** Match "Your Items" for consistency

3. **Multi-Create:** Should user be able to generate 5 bundles in a row, seeing all 5 previews?
   - **Answer:** No — replace preview with each new generation (avoid clutter)

---

## 10. Next Steps

1. **Approval:** Get user sign-off on this spec
2. **Phase 1:** Implement for BundleRuleBuilder + BundleGeneratorInline (highest priority)
3. **Phase 2:** Verify + enhance for Heroes/Carousels
4. **Testing:** Manual verification on desktop + mobile
5. **Deployment:** Single commit, no feature flag
6. **Docs:** Update MEMORY.md with this pattern

---

**Ready for user approval?** ✅ Yes — problem clearly identified, solution proven (Heroes/Carousels already do this partially), low risk.
