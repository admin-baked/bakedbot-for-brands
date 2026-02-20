## Task Spec: Creative Studio - AI-Powered Social Media Content System

**Date:** 2026-02-20
**Requested by:** Self-initiated (Tier 1 feature spec #4 of 5)
**Spec status:** 🟢 Complete & Ready for Review

---

### 1. Intent (Why)

Enable brands to generate, design, approve, and publish compliance-reviewed social media content across Instagram, TikTok, LinkedIn, Facebook, and Twitter in <3 seconds per image, reducing manual content creation workload while maintaining regulatory compliance through automated Deebo scans and multi-level approval chains.

---

### 2. Scope (What)

**Files affected:**

- `src/server/actions/creative-content.ts` — Core content generation, approval, revision, and publishing (1,527 lines)
- `src/server/actions/brand-images.ts` — Brand Kit pre-generation during onboarding (164 lines)
- `src/app/dashboard/creative/page.tsx` — Main UI: 3-panel Canva-style workspace (1,510 lines)
- `src/app/dashboard/creative/components/deebo-compliance-panel.tsx` — Compliance status + safe-version fallback
- `src/app/dashboard/creative/components/creative-command-center.tsx` — Core orchestration
- `src/app/dashboard/creative/components/magic-generate-dialog.tsx` — Dialog for quick generation
- `src/app/dashboard/creative/components/content-calendar.tsx` — Calendar + scheduling
- `src/components/creative/engagement-analytics.tsx` — Performance metrics dashboard
- `src/components/creative/approval-chain.tsx` — Multi-level approval UI
- `src/ai/flows/generate-social-image.ts` — FLUX.1 + Gemini image generation (100+ lines)
- `src/ai/flows/generate-social-caption.ts` — Craig AI caption generation
- `src/ai/generators/fal.ts` — fal.ai FLUX.1 integration with buildImagePrompt()
- `src/types/creative-content.ts` — Types: CreativeContent, GenerateContentRequest, ApprovalState, etc. (627 lines)
- `src/types/media-generation.ts` — Media cost/budget tracking types (622 lines)
- `src/hooks/use-creative-content.ts` — Real-time Firestore listener hook
- `src/server/services/drive-storage.ts` — Drive file storage integration (for Brand Kit images)
- `.agent/spec-template.md` — Spec template reference

**Files explicitly NOT touched:**

- `src/app/api/` (order routing APIs stay independent)
- `src/server/agents/craig.ts` (agent implementation stays modular)
- `src/server/agents/deebo.ts` (compliance agent stays isolated)
- `src/firebase/` (auth/firestore core untouched)
- `src/components/inbox/` (inbox UI separate from creative)

**Estimated diff size:** ~1,200 lines of implementation code (8 main files), additional 600 lines tests/docs

---

### 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Uses existing `requireUser()` + Firestore security rules |
| Touches payment or billing? | No | Cost tracking via `media-generation.ts` types (budgets TBD in Phase 2) |
| Modifies database schema? | No | Firestore collections pre-exist: `tenants/{id}/creative_content`, `drive_files`, `tenants/{id}/brand_images` |
| Changes infra cost profile? | Yes | **fal.ai FLUX.1 inference (8 steps) + Gemini fallback** — ~$0.02-0.04/image × volume. Capped at free tier initially |
| Modifies LLM prompts or agent behavior? | Yes | **Craig caption generation + Deebo compliance checks** — golden set eval required (see Test Plan) |
| Touches compliance logic? | Yes | **Deebo integration (zero-tolerance)** — blocks approval/publish if fails. Fail-safe: blocks over warns |
| Adds new external dependency? | Yes | **fal.ai FLUX.1** (primary image gen), **Genkit framework** (already in use) |

**Escalation needed?** Yes — Compliance + Cost
**If yes, RFC location:** See notes below

**Compliance Escalation Note:**
- Deebo integration uses NY OCM rules (cannabis-specific)
- Server-side enforcement gates: approval blocks if Deebo fails; publish blocks if Deebo fails
- Fallback to safe caption when compliance warning detected
- Golden set: test 20 cannabis product descriptions → verify 100% pass Deebo (zero violations allowed)

**Cost Escalation Note:**
- fal.ai FLUX.1 pricing: ~$0.02-0.04 per image (8 inference steps minimum for style variety)
- Free tier orgs: <100 generations/month (soft limit, no hard cap yet)
- Budget tracking framework in place (`media-generation.ts`), enforcement deferred to Phase 2
- Gemini fallback if fal.ai fails: ~$0.00004 per image (10x cheaper but may reject cannabis content)

---

### 4. Implementation Plan

#### Phase 1: Core Content Generation & Storage (MVP)

1. **Image Generation Pipeline** (`generateImageFromPrompt()` in `ai/flows/generate-social-image.ts`)
   - Primary: fal.ai FLUX.1 with 8 inference steps (visual style variety)
   - Fallback: Gemini 2.5/3 Flash Image
   - Input: `deriveImagePrompt()` from `creative-content.ts` (visual-first, separates marketing copy)
   - Output: URL string, fallback SVG placeholder on failure
   - Timeout: 30s per image (fal.ai avg 5-15s)

2. **Caption Generation** (`generateCaption()` in `creative-content.ts`)
   - Route to `@/ai/flows/generate-social-caption` (Craig AI)
   - Input: prompt + style + brandVoice
   - Output: primary caption + variation captions
   - Fallback: template-based captions if AI unavailable
   - Timeout: 20s

3. **Content Record Creation** (`generateContent()` server action)
   - Create `CreativeContent` doc with status='pending'
   - Run Deebo compliance check (async, fire-and-forget on failure)
   - Save to `tenants/{tenantId}/creative_content/{contentId}`
   - Return optimistic content + compliance result
   - Log via `logger.info()`

4. **Brand Kit Pre-Generation** (`generateBrandImagesForNewAccount()` in `brand-images.ts`)
   - Fire-and-forget after brand guide creation
   - Generate 4 images: hero, product_bg, ambient, texture
   - Upload to Firebase Storage via `DriveStorageService`
   - Write `drive_files` doc (required for Drive UI visibility)
   - Index in `tenants/{brandId}/brand_images` sub-collection
   - Continue on partial failure (each image type independent)

5. **Real-Time Content Hook** (`use-creative-content.ts`)
   - Listen to `tenants/{tenantId}/creative_content` with Firestore query
   - Filter by platform + status
   - Pagination: cursor-based (limit=50)
   - Handle missing index gracefully (return empty, warn in logs)

#### Phase 2: Approval & Compliance Workflow

6. **Approval Chain Management** (`approveAtLevel()`, `rejectAtLevel()`, `initializeApprovalChain()`)
   - Multi-level approval: 3 default levels (creator → manager → admin)
   - Role-based gates: level 1 = creator/marketer, level 2 = brand_manager, level 3 = admin
   - Rejection → content status='revision' (triggers Craig re-gen)
   - Track all approvals in `approvalState` array with timestamps
   - Move to next level after 1 approval at current level

7. **Deebo Compliance Gate** (in `generateContent()` + `approveContent()` + `publishContent()`)
   - **Generation time**: async check, defaults to warning if unavailable
   - **Approval time**: sync check, BLOCKS if Deebo fails (fail-safe)
   - **Publish time**: sync check, BLOCKS if Deebo fails (fail-safe)
   - Map platform → Deebo channel: all → 'social'
   - Violations stored in `complianceChecks[]` array
   - Status: 'active' (pass) | 'warning' (caution) | 'review_needed' (fail)

8. **Safe Version Fallback** (in `deebo-compliance-panel.tsx`)
   - If compliance warning: show "Accept Safe Version" button
   - Safe caption: "May help with relaxation." (pre-approved text)
   - User clicks → `editCaption()` updates doc
   - Content status stays 'pending'

#### Phase 3: UI & Canvas Experience

9. **3-Panel Layout** (main `creative/page.tsx`)
   - **Left strip** (56px): icon buttons for panels (Generate, Templates, Brand Kit, Upload, Calendar, Analytics, Help)
   - **Left panel** (280px, slide-in): form mode (campaign prompt + tone + hashtags + template browser) + chat mode (CreativeChatPanel)
   - **Center canvas** (max-width 320px): platform-aware aspect ratio, image + text overlay + caption overlay + gradient
   - **Right panel** (slide-in): DeeboCompliancePanel with status + safe version button + scheduler + approval chain
   - Animation: Framer Motion (width 0→280px, duration 0.18s)

10. **Canvas Text Overlay** (in main page, styled with CSS)
    - Headline: `text-4xl font-black text-white` with shadow, positioned bottom-[72px]
    - CTA pill: `px-8 py-2.5 rounded-xl uppercase tracking-widest`, background = `brandColors.primary` or fallback green
    - Caption gradient: `from-black/95 via-black/60 to-transparent pt-28`
    - Editable inline: click caption → textarea → save/cancel

11. **Brand Kit Panel** (left panel, "Brand Kit" tab)
    - Display: logo, colors (swatches), voice (tone + personality), tagline
    - Load from `useBrandGuide()` hook
    - Empty state: link to Settings → Brand

12. **Media Upload Panel** (left panel, "Upload" tab)
    - Drag-and-drop zone with file input
    - Brand Kit images (clickable → swap canvas background without regeneration)
    - User uploads (max 10, grid view with remove buttons)

13. **Template Browser** (8 templates predefined)
    - Product Launch, Weekend Special, Educational, Event Promo, Flash Sale, New Arrival, Loyalty Reward, Wellness
    - Each has: prompt, tone, textOverlay defaults (headline + cta), imageStyle hint
    - Click → populate form fields + auto-open Generate panel

14. **Scheduler** (left panel, "Calendar" tab)
    - React Calendar component
    - Select date → `scheduledAt` stored on approval
    - Show: "Scheduled: Thu, Feb 20"

15. **Analytics Panel** (left panel, "Analytics" tab)
    - Show engagement metrics if content published
    - Impressions, reach, likes, comments, shares, engagement rate, CTR, QR scans
    - Empty state: "Publish content to see engagement stats"

#### Phase 4: Batch & Performance

16. **Batch Generation** (multi-platform, same prompt)
    - Toggle "Batch" button → show platform checkboxes (Instagram, TikTok, LinkedIn)
    - Click "Generate" → `Promise.all([generate(ig), generate(tt), generate(li)])`
    - Show first successful result on canvas
    - Toast: "Generated 3/3 campaigns!"

17. **Auto-Generation Guard** (proactive content on first load)
    - `hasAutoGenerated` ref prevents duplicate generations
    - Fires when brand guide loads + no recent content (<2 hours old)
    - Default prompt: "Introduce [brandName] to our community..."
    - Used to fill canvas on initial visit

18. **Campaign Performance Tracking** (`getCampaignPerformance()`)
    - Aggregate metrics across all content items
    - Content count by status + platform
    - Total impressions, reach, likes, comments, shares, CTR, QR scans
    - Time-series daily snapshots (aggregated by publish date)
    - Top 5 performing content by engagement rate

19. **Multi-Level Approval UI** (right panel)
    - Show current level + required roles
    - Approval history: [Timestamp] [User] [Role] [Action] [Notes]
    - Buttons: "Approve at Level 1", "Reject at Level 1" (with notes textarea)
    - Level progression: 1 → 2 → 3 → approved

#### Phase 5: Persistence & Fallback

20. **Optimistic Local State** (in page.tsx)
    - `localContent` state: shows immediately after generate() returns
    - Firestore listener may lag (permission issues, missing index)
    - Priority: `localContent` > recent Firestore (< 2 hours) > null
    - Clear on platform change

21. **Error Handling**
    - Image gen failure: fallback SVG placeholder, continue with caption
    - Caption gen failure: fallback template captions by style/tone
    - Deebo unavailable (warn) on generation, (block) on approval/publish
    - Firestore index missing: return empty list, log warning
    - All errors logged via `logger.error()` with context

---

### 5. Test Plan

**Unit tests:**

- [ ] `test_deriveImagePrompt_separates_visual_from_marketing` — verify imageStyle leads, productName anchors, hashtags stripped
- [ ] `test_generateCaption_fallback_template` — verify fallback when AI unavailable
- [ ] `test_generateHashtags_by_platform` — verify 10 hashtags max, platform-specific pool
- [ ] `test_approveContent_blocks_on_deebo_fail` — verify hard block when compliance fails
- [ ] `test_publishContent_blocks_on_deebo_unavailable` — verify fail-safe blocking
- [ ] `test_approvalChain_advances_level` — verify 1 approval at L1 → advances to L2
- [ ] `test_approvalChain_rejects_unapproved_role` — verify role check prevents wrong-role approvers
- [ ] `test_getBrandKitImages_empty_on_missing` — verify empty array when no pre-gen images
- [ ] `test_getPendingContent_handles_missing_index` — verify returns empty, warns in logs
- [ ] `test_updateCaption_preserves_other_fields` — verify only caption changes, status/compliance intact
- [ ] `test_deleteContent_removes_from_firestore` — verify doc deletion
- [ ] `test_generateContent_stores_optimistic_locally` — verify hook shows content immediately

**Integration tests:**

- [ ] `test_e2e_generate_approve_publish` — full workflow: generate → Deebo pass → approve L1,L2,L3 → publish (expect published status + timestamp)
- [ ] `test_e2e_generate_deebo_warning_accept_safe` — generate → warning → click accept safe → verify caption updated
- [ ] `test_e2e_batch_generate_three_platforms` — batch generate IG/TT/LI from same prompt → expect 3 content docs with different platforms
- [ ] `test_e2e_revision_flow` — approve → reject at L1 with note → verify status='revision' + regenerate caption → re-approve
- [ ] `test_e2e_brand_kit_pre_gen` — create brand guide → verify 4 brand_images docs created in sub-collection
- [ ] `test_e2e_text_overlay_rendering` — enable overlay + set headline/cta → verify canvas shows styled text with gradient backdrop
- [ ] `test_e2e_template_load_populates_form` — click template → verify campaign prompt + tone + imageStyle + textOverlay populated

**Golden set eval (LLM/prompt change — REQUIRED):**

- [ ] Run `golden-sets/craig-caption-qa.json` (20 cannabis product descriptions) → target: 100% compliance pass with Deebo, avg engagementRate >3.5%
- [ ] Run `golden-sets/deebo-compliance-qa.json` (15 cannabis ads with edge cases) → target: 100% accuracy on pass/fail/warning classification
- [ ] Compare before/after: verify no regression in caption quality (vs. manual review baseline)
- [ ] A/B test: 10 posts with new imageStyle prompts vs. old templates → track CTR, scan rate, engagement rate

**Manual smoke test (UI change):**

- [ ] Open Creative Studio → verify 3-panel layout renders
- [ ] Click Generate panel → verify left panel slides in (280px width)
- [ ] Fill campaign prompt → click Generate → verify canvas shows image + caption + loading spinner
- [ ] Click "Aa Text" toggle → verify headline + CTA inputs appear + text overlays on canvas with shadow
- [ ] Select Brand Kit image (Upload panel) → click on image → verify canvas background swaps
- [ ] Click Template → verify form populated + imageStyle shows below templates
- [ ] Switch platform (Instagram → TikTok) → verify canvas aspect ratio changes (4:5 → 9:16), platform badge updates
- [ ] Fill revision note → click Send → verify note stored in revisionNotes array + status='revision'
- [ ] Right panel: click Approve → verify Deebo check runs, status updates if pass
- [ ] Schedule date → verify scheduledAt set, "Schedule" button shown instead of "Publish"
- [ ] Batch mode: select 3 platforms → click Batch Generate → verify 3 content docs created

---

### 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — all changes in 1-2 sequential commits. Revert `git revert <commit-hash>` undoes Creative Studio + Brand Kit fully |
| Feature flag? | Flag name: `CREATIVE_STUDIO_ENABLED` (on by default). Can disable in `creative/page.tsx` via env check or Firestore org setting. Disables `/dashboard/creative` route + hides Generate button from menu |
| Data migration rollback needed? | No — Firestore collections (`creative_content`, `brand_images`) are additive. No schema changes. Can delete all docs in `tenants/{orgId}/creative_content` if org wants to purge |
| Downstream services affected? | **Craig AI** (caption generation) — if Claude API fails, fallback to templates (safe). **Deebo** (compliance) — if unavailable, blocks approval/publish (fail-safe). **fal.ai FLUX.1** (image gen) — if unavailable, fallback Gemini or placeholder (graceful). **Drive Storage** (Brand Kit upload) — if unavailable, Brand Kit images won't appear in Media panel but won't block generation |

**Rollback procedure:**
```bash
# Full rollback
git revert <creative-studio-commit-hash>
git push origin main

# Feature flag disable (if needed before full revert)
# Set CREATIVE_STUDIO_ENABLED=false in environment

# Purge generated content (optional, not required for rollback)
# firebase firestore:delete --recursive --all-collections tenants/{orgId}/creative_content
```

---

### 7. Success Criteria

- [ ] **All tests pass** (zero regressions) — unit + integration + smoke tests run to completion with 100% pass rate
- [ ] **Deebo golden set** — 20 cannabis product descriptions → 100% compliance pass (zero violations)
- [ ] **Image generation SLA** — <3s average latency (measure: p50 <2s, p95 <5s) including fal.ai call + Firestore write
- [ ] **Canvas render time** — <1s from content doc write to UI display (measure Firestore listener latency)
- [ ] **Content save time** — <2s from "Generate" click to optimistic local content shown on canvas
- [ ] **No new errors in logs** within 24h of deployment (filter: `[creative-content]` logger tag)
- [ ] **Brand Guide onboarding** — Brand Kit pre-generation completes within 30s (4 images × 5-8s each)
- [ ] **Approval workflow** — multi-level chain completes in <10s (3 approvals across 3 users)
- [ ] **Cost tracking** — media generation events logged with accurate cost, monthly spend <$50/org (free tier)
- [ ] **User adoption** — at least 1 brand creates 5+ pieces of content in week 1 post-launch (tracked via Firestore query)
- [ ] **Compliance** — zero Deebo violations published (audit last 100 published pieces, expect 0 failures)

---

### Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

**Notes for Reviewer:**

This spec covers the full Creative Studio MVP (Tier 1 feature #4):
1. **Scope**: 8 main files, ~1,200 LOC, 3-panel Canva-style UI
2. **Compliance**: Deebo integration with hard blocks (fail-safe), golden set eval required
3. **Cost**: fal.ai FLUX.1 @ ~$0.02-0.04/image, budget framework in place (enforcement Phase 2)
4. **Rollback**: Single commit revert or feature flag disable, additive Firestore schema (no migration needed)
5. **Timeline**: MVP estimated 2 weeks (implementation + testing)

**Key decisions**:
- **FLUX.1 over Gemini**: fal.ai has no cannabis restrictions; Gemini falls back only if fal.ai fails
- **8 inference steps**: Minimum for visual style variety; 4 steps produces blurry near-identical images
- **Fail-safe Deebo blocks**: Better to block non-compliant content than risk regulatory issue
- **Optimistic local state**: Firestore listener lag mitigated by showing localContent immediately
- **Brand Kit pre-gen fire-and-forget**: Doesn't block onboarding; completes async in background

---

*After approval, proceed to implementation per `.agent/prime.md` Workflow Protocol.*
