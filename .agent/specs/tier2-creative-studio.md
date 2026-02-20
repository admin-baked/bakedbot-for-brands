# Production Spec: Creative Studio

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Craig (Marketer), Deebo (Compliance)
**Tier:** 2 — Core Product

---

## 1. Feature Overview

Creative Studio (aka Creative Command Center) is the AI-powered content creation workspace where brands generate social media posts, images, and campaigns. It integrates Brand Guide data, 8 campaign templates (each with imageStyle hints), FLUX.1 image generation via fal.ai, CSS text overlays (headline + CTA), and Brand Kit pre-generated images (hero/product_bg/ambient/texture). Users select a template, auto-fill text overlays, generate images via FLUX.1, and publish content to the calendar or save to Drive. Deebo compliance badge shows approval status inline.

---

## 2. Current State

### Shipped ✅
- Creative Command Center UI (`src/app/dashboard/creative/components/creative-command-center.tsx`)
- 8 campaign templates with `textOverlay` defaults + `imageStyle` hints (expanded from 4)
- FLUX.1 image generation via fal.ai (`src/ai/generators/fal.ts`) — 8 inference steps (free tier), 28 steps (pro)
- CSS text overlay system: headline (bottom-[72px], text-4xl) + CTA pill (brandColors.primary)
- Brand Kit pre-gen: 4 images (hero/product_bg/ambient/texture) generated on brand guide creation, saved to Drive + `tenants/{brandId}/brand_images` collection
- Media panel loads Brand Kit images from Drive, clicking swaps canvas background
- Template browser with category filtering
- Canvas workspace with platform selector (Instagram, TikTok, LinkedIn, Twitter, Facebook)
- Deebo badge component showing compliance status (`deebo-badge.tsx`)
- Image variations component (`image-variations.tsx`)
- Content calendar integration (schedule view)
- Proactive content generation: auto-generates brand intro post when no content exists on first load
- Drive integration: creative content saved to `drive_files` collection
- `buildImagePrompt()` strips text/hashtags/marketing-speak before sending to FLUX.1

### Partially Working ⚠️
- Brand Guide integration exists but Brand Kit images not always available (depends on brand guide completion)
- Content calendar (schedule view) UI exists but no actual scheduling backend (no cron job to publish)
- Image variations component generates variants but no storage/versioning system
- Deebo badge shows compliance status but no enforcement layer (user can publish non-compliant content)
- Asset library rail shows saved assets but no pagination (will break with 100+ assets)
- Hashtag manager exists but no integration with Instagram/TikTok APIs for hashtag performance tracking

### Not Implemented ❌
- Multi-platform publishing (generate once, publish to Instagram + TikTok + LinkedIn in one click)
- Video generation (UI placeholder exists but no backend integration)
- A/B testing for creative variants (no split-test tracking)
- Engagement analytics (post-publish performance tracking)
- Stock photo integration (Unsplash, Pexels) as fallback if FLUX.1 fails
- Watermark removal from FLUX.1 images (some images have faint watermarks)
- Auto-save drafts (content lost if user navigates away)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can select one of 8 campaign templates and see template metadata (name, category, imageStyle hint)
- [ ] Text overlay auto-fills from template defaults (headline + CTA text + brand colors)
- [ ] User can toggle text overlay on/off with "Aa Text" button
- [ ] User can edit headline and CTA text inline
- [ ] Generate button triggers FLUX.1 image generation with imageStyle + user prompt
- [ ] Brand Kit tab in media panel loads 4 pre-generated images (hero/product_bg/ambient/texture)
- [ ] Clicking a Brand Kit image swaps canvas background to that image
- [ ] Deebo badge shows compliance status: green (approved), yellow (pending), red (rejected)
- [ ] User can save content to Drive (driveFileId populated, visible in Drive UI)
- [ ] User can download generated image as PNG
- [ ] Content calendar shows scheduled content by date
- [ ] Platform selector changes canvas aspect ratio (square for Instagram, 9:16 for TikTok, etc.)

### Compliance / Security
- [ ] All creative content MUST pass Deebo compliance check before publishing
- [ ] FLUX.1 prompts MUST be sanitized (no text/watermarks/medical claims in prompt)
- [ ] `FAL_API_KEY` never exposed to client (server-only)
- [ ] Brand Kit images stored in Firebase Storage with proper access control (orgId-scoped)
- [ ] Creative content Firestore docs include complianceStatus field (pending/approved/rejected)

### Performance
- [ ] FLUX.1 generation completes in < 10s (free tier, 8 steps)
- [ ] Brand Kit image load in < 2s (lazy-loaded from Firebase Storage)
- [ ] Template browser renders 8 templates in < 500ms
- [ ] Canvas workspace re-renders on text edit in < 100ms (no jank)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No Deebo compliance enforcement layer | 🔴 Critical | User can publish non-compliant content — Deebo badge is UI-only |
| No auto-save drafts | 🔴 Critical | Content lost if user navigates away or browser crashes |
| No multi-platform publishing | 🟡 High | Must manually publish to each platform — no one-click cross-post |
| Content calendar has no scheduling backend | 🟡 High | Calendar is view-only — no cron job to actually publish at scheduled time |
| Asset library has no pagination | 🟡 High | Will break UI with 100+ saved assets |
| Brand Kit images not always available | 🟡 High | Depends on brand guide completion — unclear fallback if missing |
| No A/B testing for variants | 🟢 Low | Can't measure which creative variant performs better |
| No engagement analytics | 🟢 Low | No post-publish tracking of likes, shares, conversions |
| Video generation placeholder only | 🟢 Low | UI exists but no backend integration |
| FLUX.1 watermark removal | 🟢 Low | Some images have faint watermarks — needs post-processing |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Carousel generator | `src/components/brand/creative/__tests__/carousel-generator.test.tsx` | Validates carousel UI state |
| Creative QR code | `src/components/brand/creative/__tests__/creative-qr-code.test.tsx` | Validates QR generation |
| Content pagination | `src/components/brand/creative/__tests__/content-pagination.test.tsx` | Validates pagination logic |
| Image variations | `src/components/brand/creative/__tests__/image-variations.test.tsx` | Validates variant generation UI |
| Hashtag manager | `src/components/brand/creative/__tests__/hashtag-manager.test.tsx` | Validates hashtag UI |
| Instagram grid | `src/components/brand/creative/__tests__/instagram-grid.test.tsx` | Validates grid layout |
| Heartbeat widget | `src/app/dashboard/creative/components/__tests__/heartbeat-widget.test.tsx` | Validates suggestions UI |

### Missing Tests (Required for Production-Ready)
- [ ] `creative-studio-flux-generation.integration.test.ts` — validates FLUX.1 API call with sanitized prompt
- [ ] `creative-studio-text-overlay.unit.test.ts` — validates headline + CTA positioning + brand colors
- [ ] `creative-studio-brand-kit-load.integration.test.ts` — validates Brand Kit images load from Drive
- [ ] `creative-studio-template-selection.unit.test.ts` — validates template metadata (imageStyle hint) passes to FLUX.1
- [ ] `creative-studio-deebo-gate.integration.test.ts` — validates Deebo compliance check blocks non-compliant content
- [ ] `creative-studio-drive-save.integration.test.ts` — validates creative content saves to Drive with driveFileId

### Golden Set Eval
| Golden Set | Location | Threshold | Last Run |
|------------|----------|-----------|---------|
| Craig campaigns | `.agent/golden-sets/craig-campaigns.json` | 90% overall / 100% compliance | 2026-02-19 |

Note: Craig's golden set covers campaign copy quality, not Creative Studio image generation. Image quality validation needs separate eval.

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Brand Guide | Provides brandColors, tone, valuePropositions | Creative Studio uses fallback colors (gray) |
| Drive | Stores generated images | Images generated but not visible in Drive UI |
| Deebo | Compliance gate | Creative content published without compliance check |
| Craig agent | Generates campaign copy | User must manually write all copy |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| fal.ai FLUX.1 | Image generation | None — hard dependency; show error + suggest stock photos |
| Firebase Storage | Stores Brand Kit images | None — Brand Kit unavailable if Storage is down |

---

## 7. Degraded Mode

- **If fal.ai is down:** Show error message + suggest uploading own images or using stock photos.
- **If Firebase Storage is down:** Brand Kit images unavailable — user can still generate via FLUX.1 with custom prompts.
- **If Deebo times out:** Default-block (do NOT publish) + show "Compliance check pending, try again" message.
- **If Brand Guide not complete:** Creative Studio uses fallback values (gray colors, generic tone) — banner warns "Complete Brand Guide for better results".
- **Data loss risk:** If FLUX.1 generates image but Firestore write fails, image URL lost. Mitigation: localStorage cache of last 10 generated URLs.

---

## 8. Open Questions

1. **Content calendar scheduling backend**: Should we build a cron job to publish content at scheduled times, or integrate with Buffer/Hootsuite APIs?
2. **Multi-platform publishing**: Should Creative Studio auto-post to Instagram/TikTok/LinkedIn, or just export files for manual upload?
3. **FLUX.1 watermark removal**: Should we post-process images to remove faint watermarks, or is this a fal.ai API issue to report?
4. **Brand Kit fallback**: If Brand Kit images missing, should we auto-generate them on-demand, or show placeholder images?
5. **Asset library pagination threshold**: At what point should we paginate (50 assets? 100?), and should we use infinite scroll or page numbers?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
