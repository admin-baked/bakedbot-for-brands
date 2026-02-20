# Production Spec: Brand Guide + Onboarding

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Leo (COO), Craig (Marketer)
**Tier:** 2 — Core Product

---

## 1. Feature Overview

Brand Guide is the single source of truth for a brand's identity, voice, colors, logo, and value propositions. The Onboarding flow (`/dashboard/setup`) guides new users through a 4-step wizard to create their brand guide: (1) Brand Name + Description + Location + Dispensary Type, (2) Colors + Logo, (3) Voice Attributes + Tone, (4) Social Handles. Users can auto-scan their website (via Firecrawl → RTRVR fallback) to extract brand data, or manually enter it. The Brand Guide powers Creative Studio, Craig's campaign copy, Deebo's compliance context, and all agent-generated content.

---

## 2. Current State

### Shipped ✅
- 4-step wizard UI (`src/app/dashboard/settings/brand-guide/components/setup-step-dialogs.tsx`)
- Website scanner integration: Firecrawl → RTRVR fallback (`memory/firecrawl-rtrvr-fallback.md`)
- Step 1: Brand Name, Description, Tagline, City, State, Dispensary Type (recreational/medical/both)
- Step 2: Primary/Secondary Colors, Logo URL (with OG image preview + "Use This Logo" button)
- Step 3: Voice Attributes (3 tags), Tone (1-2 sentences), Smart defaults based on dispensary type (medical → Professional/Educational/Trustworthy, recreational → Casual/Playful/Friendly)
- Step 4: Instagram + Facebook handles (for richer brand voice analysis on re-scan)
- Website extractor (`extractBrandGuideFromUrl`) parses OG image, title, colors, messaging
- `cleanTagline()` filters AI placeholder values ("Unknown - insufficient...")
- Brand name derivation from page title (split on `|`/`-`) instead of raw domain
- Multi-page crawl: root URL + 9 subpages (`/about-us`, `/about-us/`, `/about`, `/about/`, `/our-story`, `/our-story/`, `/who-we-are`, `/mission`, `/contact`) — merged content before AI extraction
- Setup checklist UI (`src/components/dashboard/setup-checklist.tsx`)
- Brand guide stored in Firestore: `tenants/{brandId}/brand_guide` doc
- Auto-opens Step1Dialog when setup page loads with pre-filled data from website scan

### Partially Working ⚠️
- Website scanner works but fails on some domains (Firecrawl rate limit, RTRVR 404s)
- Logo URL extraction depends on OG image — fallback unclear if missing
- Smart voice defaults only fire if `!step3Data` — won't overwrite user's manual selections (correct, but no UI indication)
- Instagram/Facebook handles passed to extractor but unclear if re-scan uses them (API integration uncertain)
- City/State used for "local marketing" and "compliance" but no actual geo-targeting implemented yet

### Not Implemented ❌
- Brand guide validation (no check that all required fields are filled before allowing setup completion)
- Brand guide versioning (no history of changes — can't roll back to previous version)
- Multi-brand support (users with multiple brands must switch orgs — no single-dashboard multi-brand view)
- Competitor analysis integration (no automated scraping of competitor brand guides for comparison)
- Brand voice score (no AI-powered measurement of how well content matches brand voice)
- Logo upload via file picker (only URL input — no Firebase Storage upload)
- Color picker with palette suggestions (only hex input — no visual picker)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can complete 4-step wizard without errors if all required fields filled
- [ ] User can scan a website URL and see pre-filled brand data (name, colors, logo, tone)
- [ ] Step 1: Dispensary type selection auto-fills Step 3 voice defaults on first setup (medical → Professional/Educational/Trustworthy, recreational → Casual/Playful/Friendly)
- [ ] Step 2: Logo preview shows OG image from scanned URL with "Use This Logo" button
- [ ] Step 3: User can select 3 voice attributes (from pre-defined list) and write 1-2 sentence tone description
- [ ] Step 4: User can enter Instagram + Facebook handles (optional)
- [ ] Brand guide saves to Firestore under `tenants/{brandId}/brand_guide` on wizard completion
- [ ] Setup checklist shows green checkmark for "Brand Guide" step after completion
- [ ] Re-scanning a website merges new data with existing brand guide (doesn't overwrite user edits)
- [ ] Brand guide data visible in Creative Studio (colors, tone, value propositions)

### Compliance / Security
- [ ] Only authenticated users can create/edit brand guides (requireUser() check)
- [ ] Brand guide data scoped to orgId — no cross-tenant leakage
- [ ] Website scanner sanitizes user-provided URLs (no SSRF attacks via file:// or internal IPs)
- [ ] Logo URL validated as HTTPS (no http:// or file:// allowed)
- [ ] Social handles validated (@ prefix optional, alphanumeric + underscore only)

### Performance
- [ ] Website scan completes in < 30s (root URL + 9 subpages)
- [ ] Brand guide Firestore write completes in < 1s
- [ ] Setup wizard step transitions render in < 200ms
- [ ] Brand guide load from Firestore in < 500ms

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No brand guide validation before setup completion | 🔴 Critical | Users can skip required fields — agents get incomplete data |
| Website scanner fails on some domains | 🟡 High | Firecrawl rate limit, RTRVR 404s — no error recovery UX |
| Logo fallback unclear if OG image missing | 🟡 High | No placeholder logo or upload option |
| No multi-brand support | 🟡 High | Users with multiple brands must switch orgs — friction |
| No brand guide versioning | 🟡 High | Can't roll back changes if user makes mistake |
| Instagram/Facebook handle integration uncertain | 🟡 High | Unclear if re-scan actually uses handles to improve voice analysis |
| No logo upload via file picker | 🟢 Low | Only URL input — friction for brands without website |
| No color picker UI | 🟢 Low | Only hex input — UX friction |
| No competitor brand guide comparison | 🟢 Low | Can't benchmark brand voice against competitors |
| No brand voice score | 🟢 Low | Can't measure content quality vs brand guide |

---

## 5. Test Coverage

### Existing Tests
None found for Brand Guide onboarding flow.

### Missing Tests (Required for Production-Ready)
- [ ] `brand-guide-wizard.integration.test.ts` — validates 4-step flow from empty state to completed brand guide
- [ ] `brand-guide-website-scan.integration.test.ts` — validates Firecrawl → RTRVR fallback with mock responses
- [ ] `brand-guide-smart-defaults.unit.test.ts` — validates dispensary type auto-fills Step 3 voice defaults
- [ ] `brand-guide-logo-preview.unit.test.ts` — validates OG image extraction + "Use This Logo" button
- [ ] `brand-guide-validation.unit.test.ts` — validates required fields block wizard completion
- [ ] `brand-guide-firestore-save.integration.test.ts` — validates brand guide writes to correct Firestore path
- [ ] `brand-guide-multi-page-crawl.integration.test.ts` — validates 9-subpage crawl merges content correctly

### Golden Set Eval
Not applicable — Brand Guide is user-input data, not agent-generated content.

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore | Stores brand guide data | Brand guide data lost on page refresh |
| Creative Studio | Uses brand colors, tone | Creative Studio uses fallback gray colors |
| Craig agent | Uses brand voice for copy | Craig generates generic copy without brand context |
| Deebo agent | Uses dispensary type for compliance rules | Deebo can't apply jurisdiction-specific rules |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Firecrawl | Website scraping (primary) | RTRVR (secondary scraper) |
| RTRVR | Website scraping (fallback) | Manual entry only if both fail |

---

## 7. Degraded Mode

- **If Firecrawl is down:** Auto-fallback to RTRVR (already implemented).
- **If RTRVR is down:** Show error + prompt user to manually enter brand data.
- **If Firestore write fails:** Queue write in-memory, retry on next page load. Show "Saving..." spinner until success.
- **If logo URL 404s:** Show placeholder logo + "Upload Logo" button (not yet implemented).
- **Data loss risk:** If user navigates away mid-wizard without completing, progress lost. Mitigation: Auto-save draft to localStorage after each step.

---

## 8. Open Questions

1. **Brand guide validation strategy**: Should we block wizard completion if required fields missing, or allow partial completion + warn on agent use?
2. **Logo upload vs URL**: Should we build Firebase Storage upload for logos, or is URL-only sufficient?
3. **Multi-brand support**: Should we allow users to create multiple brand guides under one org, or require separate orgs?
4. **Website scanner rate limits**: Should we cache scanned data for X days to avoid re-scanning on every setup page load?
5. **Social handle usage**: What exactly do we do with Instagram/Facebook handles? Is there an API integration planned for brand voice analysis?
6. **Brand guide versioning**: Should we track change history (who changed what, when), or is a simple last-updated timestamp sufficient?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
