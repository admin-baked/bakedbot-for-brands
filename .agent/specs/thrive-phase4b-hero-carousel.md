# Spec: Thrive Phase 4B — Hero Carousel Admin UI

**Date:** 2026-02-21
**Requested by:** Self-initiated (Thrive menu enhancements)
**Spec status:** 🟡 Draft (awaiting approval)

---

## 1. Intent (Why)

Enable Thrive dispensary operators to manage promotional hero carousel slides without code changes, allowing them to update marketing messaging, promotional images, and CTAs in real-time via dashboard.

---

## 2. Scope (What)

**Files affected:**
- `src/types/hero-slides.ts` — NEW: TypeScript types for hero slides
- `src/app/actions/hero-slides.ts` — NEW: Server actions (CRUD operations, Super User only)
- `src/app/dashboard/settings/hero-slides/page.tsx` — NEW: Dashboard admin UI
- `src/components/demo/hero-carousel.tsx` — MODIFY: Accept dynamic slides from Firestore (fallback to defaults if empty)
- `apphosting.yaml` — NO CHANGES (no new secrets)
- Firestore — NEW collection: `hero_slides` under `tenants/{orgId}/`

**Files explicitly NOT touched:**
- `src/app/[brand]/page.tsx` — Public menu composition unchanged
- `src/components/demo/menu-info-bar.tsx` — Loyalty bar unchanged
- `src/server/services/` — No service layer changes

**Estimated diff size:** ~400 lines (types 30 + actions 100 + page 250 + component 20)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Slides are public content (no role gating) |
| Touches payment or billing? | No | — |
| Modifies database schema? | Yes | NEW: Firestore `hero_slides` collection under tenant |
| Changes infra cost profile? | No | Minor Firestore reads (slides retrieved on page load) |
| Modifies LLM prompts or agent behavior? | No | — |
| Touches compliance logic? | No | — |
| Adds new external dependency? | No | Using Firebase Storage (already available) |

**Escalation needed?** No (schema change is simple, scoped to single collection, non-compliance-critical)

---

## 4. Implementation Plan

### Step 1: Define Types
- Create `src/types/hero-slides.ts`
- Export `HeroSlide` interface:
  - `id: string`
  - `orgId: string`
  - `title: string`
  - `subtitle: string`
  - `description: string`
  - `ctaText: string`
  - `ctaAction: 'scroll' | 'link'`
  - `ctaTarget?: string` (URL or element ID)
  - `imageUrl?: string` (Firebase Storage URL)
  - `backgroundColor: string` (hex color)
  - `textAlign: 'left' | 'center' | 'right'`
  - `displayOrder: number` (for sorting)
  - `active: boolean` (visibility toggle)
  - `createdAt: Date`
  - `updatedAt: Date`

### Step 2: Create Server Actions
- Create `src/app/actions/hero-slides.ts`
- Implement functions (all require `requireUser()` + org membership check):
  1. `getHeroSlides(orgId)` — Fetch active slides ordered by displayOrder
  2. `createHeroSlide(orgId, data)` — Create new slide
  3. `updateHeroSlide(orgId, id, data)` — Update existing slide
  4. `deleteHeroSlide(orgId, id)` — Soft delete (set active=false) or hard delete
  5. `reorderSlides(orgId, slideIds[])` — Batch update displayOrder
- Add Firestore collection path: `tenants/{orgId}/hero_slides`
- Error handling: 404 for missing slides, 403 for org access violations
- Logging: `@/lib/logger` for all mutations

### Step 3: Create Dashboard Page
- Create `/dashboard/settings/hero-slides/page.tsx`
- Route structure: `/dashboard/settings/hero-slides` (accessible to brand admins only)
- Components:
  1. **Slides list** — Cards showing:
     - Thumbnail of `imageUrl` (if provided)
     - Title + subtitle preview
     - Active toggle (eye icon)
     - Drag handle (reorder)
     - Edit + delete buttons
  2. **Create/Edit modal** — Form fields:
     - Title (required, max 100 chars)
     - Subtitle (optional, max 50 chars)
     - Description (optional, max 200 chars)
     - CTA text (required, max 20 chars)
     - CTA action dropdown (scroll | link)
     - CTA target (conditional: shows for link action)
     - Image upload (file picker → Firebase Storage)
     - Background color (color picker, default #000000)
     - Text alignment (left | center | right)
     - Active toggle (visibility)
  3. **Preview pane** (optional) — Shows live preview of slide as it appears on public menu
  4. **Drag-to-reorder** — Using `@dnd-kit` (already available)
- Use `useTransition()` for loading states
- Error boundary + toast notifications (ShadCN)

### Step 4: Update Hero Carousel Component
- File: `src/components/demo/hero-carousel.tsx`
- Accept `slides?: HeroSlide[]` prop (optional)
- If slides provided: render dynamic slides (ordered by displayOrder, filter active=true)
- If no slides provided: fall back to existing `defaultSlides` constant
- No breaking changes to public menu page

### Step 5: Update Public Menu Page
- File: `src/app/[brand]/page.tsx`
- Fetch hero slides via server action: `getHeroSlides(orgId)`
- Pass to `<HeroCarousel slides={slides} />` component
- Handle error gracefully: fall back to defaults if fetch fails

### Step 6: Testing
- Manual test: Create 3 slides in dashboard, verify appear on public menu
- Test reorder: Drag slides in dashboard, refresh public menu, verify order
- Test deletion: Delete slide, verify removed from public menu immediately
- Test toggle: Disable slide, verify hidden on public menu
- Test image upload: Upload image to slide, verify displays on carousel
- Test CTA: Click CTA on public menu, verify navigation (scroll or link) works

---

## 5. Test Plan

**Unit tests:**
- [ ] `getHeroSlides()` returns ordered active slides only
- [ ] `createHeroSlide()` validates required fields
- [ ] `updateHeroSlide()` merges partial updates
- [ ] `deleteHeroSlide()` marks inactive or removes
- [ ] `reorderSlides()` updates displayOrder correctly
- [ ] Org access check prevents cross-org access

**Integration tests:**
- [ ] Full CRUD workflow: create → read → update → delete
- [ ] Firestore write/read consistency
- [ ] Permissions: Brand admin can create, non-admin cannot

**Manual smoke test:**
- [ ] Create 3 test slides in dashboard
- [ ] Verify on public menu: `/thrivesyracuse`
- [ ] Reorder slides, verify order changed
- [ ] Upload image, verify displays
- [ ] Toggle active=false, verify hidden
- [ ] Test CTA navigation (scroll + link)

**Golden set eval:**
- Not applicable (no LLM changes)

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — Revert removes all files + component changes |
| Feature flag? | Not needed — Component gracefully falls back to defaults if no slides found |
| Data migration rollback needed? | No — Firestore data persists; can always re-fetch |
| Downstream services affected? | None (hero carousel is isolated feature) |

**Rollback procedure:**
1. Revert commit: `git revert <commit-hash>`
2. Deploy: `git push origin main`
3. Public menu automatically uses default slides from component
4. Firestore hero_slides data remains (can be re-enabled anytime)

---

## 7. Success Criteria

- [ ] All server actions created and tested
- [ ] Dashboard page renders without errors
- [ ] Hero carousel accepts dynamic slides + falls back to defaults
- [ ] Drag-to-reorder works (5+ slide reorders successful)
- [ ] Image upload stores in Firebase Storage + displays
- [ ] Public menu displays hero slides correctly
- [ ] All test cases pass (unit + integration + manual)
- [ ] Zero regressions in existing features
- [ ] Thrive can create/edit/delete slides independently

---

## Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

---

## Implementation Notes

### Design Decisions

1. **Soft vs. Hard Delete** — Using `active: false` toggle allows historical tracking and easy re-enablement
2. **Tenant-scoped collection** — Isolates hero slides per dispensary, supports multi-tenant in future
3. **Component fallback** — Graceful degradation: defaults shown if no slides configured
4. **Image storage** — Firebase Storage (not Firestore) for large files, CDN-backed URLs
5. **Drag-to-reorder** — Familiar UX, same pattern as Menu Command Center product reordering

### Known Constraints

1. **Max 10 slides** — Practical carousel limit (can add validation if needed)
2. **Image file size** — Limited to 5MB by default (Firebase Storage)
3. **Text length limits** — Enforced in form validation to prevent layout break
4. **Color format** — HEX only (no rgba support for simplicity)

### Future Enhancements (Phase 5+)

- Scheduled slides (startDate/endDate for seasonal promotions)
- Analytics: track carousel impressions + CTA clicks
- A/B testing: multiple carousel configs per org
- AI-generated hero text (via Craig agent)
- Video background support (short mp4s)

---

*Awaiting approval to proceed to Stage 2: Implementation*
