# Spec: Thrive Phase 4B — Hero Carousel Polish & Deploy

**Date:** 2026-02-21
**Requested by:** Audit findings
**Spec status:** 🟢 Approved (audit-driven enhancement)

---

## 1. Intent (Why)

Complete and harden the existing hero carousel system (95% implemented) by adding server-side auth validation, Firebase Storage image uploads, and test coverage before production deployment.

---

## 2. Scope (What)

**Audit Finding:** Hero carousel system is 95% complete. This spec addresses only the missing 5%:

**Files to MODIFY:**
- `src/app/actions/hero-slides.ts` — ADD: `requireUser()` auth checks + org membership validation
- `src/components/dashboard/menu/hero-slide-form.tsx` — ADD: Firebase Storage image upload UI
- `src/app/dashboard/menu/hero-carousel/page.tsx` — ADD: error boundary + loading states

**Files to CREATE (NEW):**
- `src/app/api/upload/hero-slides/route.ts` — Image upload endpoint (Firebase Storage)
- `tests/hero-slides-actions.test.ts` — Server action tests (auth + CRUD)
- `tests/hero-carousel-component.test.tsx` — Component render tests

**Files explicitly NOT touched:**
- Component implementations (carousel, form, preview) — Already complete
- Type definitions — Already complete
- Firestore schema — Already complete

**Estimated diff size:** ~350 lines (auth 40 + upload 80 + tests 230)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | Adding `requireUser()` + org membership checks to server actions |
| Touches payment or billing? | No | — |
| Modifies database schema? | No | Using existing `hero_slides` collection |
| Changes infra cost profile? | Yes | Adds Firebase Storage for images (~negligible) |
| Modifies LLM prompts or agent behavior? | No | — |
| Touches compliance logic? | No | — |
| Adds new external dependency? | No | Firebase Storage SDK already available |

**Escalation needed?** Yes (auth boundary) — But minor, scoped to org isolation

---

## 4. Implementation Plan

### Step 1: Add Server-Side Auth to Actions (40 lines)
- File: `src/app/actions/hero-slides.ts`
- Add `requireUser()` check to all mutation functions:
  - `createHeroSlide()` — Verify user org matches orgId parameter
  - `updateHeroSlide()` — Fetch slide, verify orgId, allow only same-org users
  - `deleteHeroSlide()` — Same as update
  - `reorderHeroSlides()` — Same as update
- Keep read functions (`getHeroSlides`, `getAllHeroSlides`) unauthenticated (public display + dashboard)
- Return 403 Forbidden if org mismatch detected
- Add context-rich error logs

### Step 2: Create Image Upload Endpoint (80 lines)
- File: `src/app/api/upload/hero-slides/route.ts` (NEW)
- Implement POST handler:
  1. Extract `orgId` from request body
  2. Verify `requireUser()` + org membership
  3. Parse FormData with file
  4. Validate file: max 5MB, image only (jpg/png/webp)
  5. Upload to Firebase Storage: `gs://bakedbot-prod.appspot.com/hero-slides/{orgId}/{uuid}.{ext}`
  6. Return public CDN URL: `https://storage.googleapis.com/...`
  7. Error handling: 400 for invalid file, 413 for too large, 403 for auth
- Add structured logging

### Step 3: Add Image Upload UI to Form (80 lines)
- File: `src/components/dashboard/menu/hero-slide-form.tsx`
- Add file input + drag-drop zone:
  - Use `<input type="file" accept="image/*" />`
  - Show preview of selected/uploaded image
  - Upload on form submit via `/api/upload/hero-slides`
  - Disable submit button during upload
  - Show upload progress bar
  - Handle errors: display toast notification
- Update form validation: `imageUrl` becomes optional OR auto-generated from upload
- Link to existing `imageUrl` field in schema

### Step 4: Add Test Suite (230 lines)
- File 1: `tests/hero-slides-actions.test.ts` (130 lines)
  - Mock `requireUser()` + org membership
  - Test `createHeroSlide()`: success + auth failure + org mismatch
  - Test `updateHeroSlide()`: success + auth failure + 404 for missing slide
  - Test `deleteHeroSlide()`: same pattern
  - Test `reorderHeroSlides()`: batch update, org isolation
  - Test `getAllHeroSlides()`: no auth required
  - Edge cases: empty orgId, invalid input

- File 2: `tests/hero-carousel-component.test.tsx` (100 lines)
  - Test component renders with slides
  - Test fallback to defaults if no slides
  - Test carousel navigation (prev/next/dots)
  - Test auto-play + pause on hover
  - Test CTA handlers (scroll + link)
  - Responsive layout (mobile/tablet/desktop)

### Step 5: Manual Testing Checklist
- [ ] Create test slide via dashboard form
- [ ] Upload image from file picker
- [ ] Verify image displays in form preview
- [ ] Verify image displays on carousel (public menu)
- [ ] Verify org isolation: switch to different org, cannot edit Thrive slides
- [ ] Try uploading oversized file (>5MB) → error shown
- [ ] Try uploading non-image file → error shown
- [ ] Test on mobile (drag-drop, form responsiveness)
- [ ] Edit existing slide, change image, verify update

---

## 5. Test Plan

**Unit tests:**
- [ ] `createHeroSlide()` validates auth + org membership
- [ ] `updateHeroSlide()` prevents cross-org writes
- [ ] Image upload endpoint validates file type + size
- [ ] Server actions return proper error codes (403, 400, 404)

**Integration tests:**
- [ ] Full flow: upload image → create slide → appears on public menu
- [ ] Multi-tenant: org A cannot see/edit org B slides
- [ ] Carousel renders with dynamic slides

**Manual smoke test:**
- [ ] Create slide with image upload in Thrive dashboard
- [ ] Verify on `thrivesyracuse.bakedbot.ai` public menu
- [ ] Reorder slides, verify order persists
- [ ] Toggle slide active/inactive, verify visibility

**Golden set eval:**
- Not applicable (no LLM changes)

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — Revert removes auth checks + upload endpoint |
| Feature flag? | Not needed — Auth checks are backward-compatible |
| Data migration rollback needed? | No — No schema changes |
| Downstream services affected? | None — Self-contained feature |

**Rollback procedure:**
1. Revert commit: `git revert <commit-hash>`
2. Deploy: `git push origin main`
3. Image uploads will fail, but existing URL-based slides continue working

---

## 7. Success Criteria

- [ ] All server actions enforce auth + org isolation (zero cross-org leaks)
- [ ] Image upload endpoint works (file → Storage → CDN URL)
- [ ] Form accepts file upload + displays preview
- [ ] All tests pass (unit + integration)
- [ ] No regressions in existing carousel functionality
- [ ] Thrive can upload images and see them on public menu
- [ ] Multi-tenant isolation verified (cross-org access blocked)
- [ ] Error messages clear + actionable

---

## Approval

- [x] **Spec reviewed by:** Audit findings (95% system complete, 5% gaps identified)
- [x] **Approved to implement:** Yes (Option A selected)
- [ ] **Modifications required:** None

---

## Implementation Notes

### Why This Approach?

1. **Minimalist** — Only adds what's missing, leverages existing components
2. **Secure** — Auth checks enforce multi-tenant isolation (critical for SaaS)
3. **User-friendly** — File upload UX better than manual URL entry
4. **Tested** — Comprehensive test coverage for auth boundary
5. **Fast** — ~2-3 hours to polish + deploy

### Known Constraints

1. **Firebase Storage cost** — Minimal for images (est. <$1/month for single dispensary)
2. **Upload timeout** — HTTP 30s default; images <5MB should be fine
3. **Public CDN URLs** — Images are world-readable once uploaded

### Future Enhancements (Phase 5+)

- Scheduled slides (startDate/endDate)
- Image compression/optimization
- Slide analytics (impressions + CTA clicks)
- A/B testing (multiple carousel configs)
- Video backgrounds

---

*Ready to implement. Estimated completion: 2-3 hours.*
